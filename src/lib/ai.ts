import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { validateIdeaInput } from "@/data/ideas";

export const ASSISTANT_MODEL = "claude-opus-5-5";
export const ASSISTANT_MAX_TOKENS = 4096;

export type AssistantProvider = "anthropic" | "ollama";
export const OLLAMA_DEFAULT_MODEL = "deepseek-v4.1-flash:cloud";
export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
const OLLAMA_TIMEOUT_MS = 120_000;

export function getAssistantProvider(): AssistantProvider {
  return process.env.AI_PROVIDER === "ollama" ? "ollama" : "anthropic";
}

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const ASSISTANT_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;
export type AssistantImageType = (typeof ASSISTANT_IMAGE_TYPES)[number];

export interface BriefDetails {
  title: string;
  audience: string;
  tone: string;
  keyPoints: string;
}

export interface AssistantRequest {
  targetType: string;
  notes: string;
  brief?: BriefDetails | null;
  image?: { mediaType: AssistantImageType; base64: string } | null;
}

export interface Suggestion {
  title: string;
  summary: string;
  body: string;
}

export type AssistantOutcome =
  | { status: "ready"; suggestion: Suggestion }
  | { status: "refusal"; message: string }
  | { status: "error"; message: string };

export function isAssistantConfigured(): boolean {
  if (getAssistantProvider() === "ollama") {
    return true;
  }
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function validateAssistantRequest(input: {
  targetType: string;
  notes: string;
  image?: { mediaType: string; sizeBytes: number } | null;
}): { ok: true } | { ok: false; status: 400 | 413; message: string } {
  if (input.notes.trim().length === 0) {
    return { ok: false, status: 400, message: "Describe what you want to write first." };
  }
  if (input.image) {
    if (!ASSISTANT_IMAGE_TYPES.includes(input.image.mediaType as AssistantImageType)) {
      return {
        ok: false,
        status: 400,
        message: "Unsupported image type. Use PNG, JPEG, WebP or GIF.",
      };
    }
    if (input.image.sizeBytes > IMAGE_MAX_BYTES) {
      return {
        ok: false,
        status: 413,
        message: "Image is too large. The API allows up to 10 MB per image.",
      };
    }
  }
  return { ok: true };
}

const SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    body: { type: "string" },
  },
  required: ["title", "summary", "body"],
  additionalProperties: false,
} as const;

export function buildAssistantPrompt(input: AssistantRequest): string {
  const targetLabel =
    input.targetType === "project" ? "project entry" : "blog post";
  const lines = [
    `You are helping a developer draft content for their portfolio website.`,
    `Suggest a ${targetLabel}: a title, a one-line summary, and a body.`,
    `Keep the title within 80 characters, the summary within 200 characters, and the body within 5000 characters.`,
    `Respond with ONLY a JSON object with the keys "title", "summary" and "body" — no markdown formatting, no commentary before or after.`,
    ``,
    `What I want to write:`,
    input.notes.trim(),
  ];
  if (input.brief) {
    lines.push(
      ``,
      `A planning brief for this piece:`,
      `- Working title: ${input.brief.title}`,
      `- Audience: ${input.brief.audience}`,
      `- Tone: ${input.brief.tone}`,
      `- Key points:`,
      ...input.brief.keyPoints
        .split("\n")
        .filter((point) => point.trim().length > 0)
        .map((point) => `  - ${point.trim()}`),
    );
  }
  if (input.image) {
    lines.push(
      ``,
      `An image is attached (a screenshot or photo). Use it as context for what the content should cover.`,
    );
  }
  return lines.join("\n");
}

export function extractSuggestionFromReply(reply: {
  stopReason?: string;
  parsedOutput?: unknown;
}): AssistantOutcome {
  if (reply.stopReason === "refusal") {
    return {
      status: "refusal",
      message:
        "The assistant declined this request. Try rewording your notes or removing the image.",
    };
  }
  if (reply.stopReason === "max_tokens") {
    return {
      status: "error",
      message:
        "The assistant's answer was cut off by the token limit. Try shorter notes.",
    };
  }
  const candidate = reply.parsedOutput as Partial<Suggestion> | null | undefined;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    typeof candidate.title !== "string" ||
    typeof candidate.summary !== "string" ||
    typeof candidate.body !== "string"
  ) {
    return {
      status: "error",
      message:
        "The assistant's reply was not in the expected format. Please try again.",
    };
  }
  const suggestion = {
    title: candidate.title.trim(),
    summary: candidate.summary.trim(),
    body: candidate.body.trim(),
  };
  const fieldErrors = validateIdeaInput({
    title: suggestion.title,
    summary: suggestion.summary,
    body: suggestion.body,
    targetType: "blog-post",
  });
  if (fieldErrors.title || fieldErrors.summary || fieldErrors.body) {
    return {
      status: "error",
      message:
        "The assistant's suggestion missed the length limits. Edit your notes and try again.",
    };
  }
  return { status: "ready", suggestion };
}

function defaultClient(): Anthropic | null {
  if (!isAssistantConfigured()) {
    return null;
  }
  return new Anthropic();
}

interface ParseLikeReply {
  stopReason?: string;
  parsedOutput?: unknown;
}

interface ParseLikeClient {
  messages: {
    parse: (params: unknown) => Promise<ParseLikeReply>;
  };
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export async function requestSuggestionFromOllama(
  input: AssistantRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<AssistantOutcome> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.OLLAMA_API_KEY) {
    headers.authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }
  const message: { role: "user"; content: string; images?: string[] } = {
    role: "user",
    content: buildAssistantPrompt(input),
  };
  if (input.image) {
    message.images = [input.image.base64];
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [message],
        format: SUGGESTION_SCHEMA,
        stream: false,
        think: false,
        options: { num_predict: ASSISTANT_MAX_TOKENS },
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch {
    return {
      status: "error",
      message: `Could not reach Ollama at ${baseUrl}. Is the daemon running, and (for cloud models) are you signed in?`,
    };
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    if (response.status === 404 || /not found/i.test(detail)) {
      return {
        status: "error",
        message: `Ollama does not know the model "${model}". Run \`ollama pull ${model}\` and try again.`,
      };
    }
    return {
      status: "error",
      message: `Ollama returned an error (${response.status}). ${detail}`.trim(),
    };
  }

  const payload = (await response.json().catch(() => null)) as OllamaChatResponse | null;
  if (payload?.error) {
    return { status: "error", message: `Ollama returned an error. ${payload.error}`.trim() };
  }
  const raw = payload?.message?.content ?? "";
  let parsedOutput: unknown = null;
  const attempt = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  parsedOutput =
    attempt(raw) ??
    attempt(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")) ??
    attempt(raw.slice(Math.max(raw.indexOf("{"), 0), raw.lastIndexOf("}") + 1)) ??
    null;
  return extractSuggestionFromReply({ parsedOutput });
}

export interface SuggestionDeps {
  client?: ParseLikeClient | null;
  fetchImpl?: typeof fetch;
}

export async function requestSuggestion(
  input: AssistantRequest,
  deps: SuggestionDeps = {},
): Promise<AssistantOutcome> {
  if (getAssistantProvider() === "ollama") {
    return requestSuggestionFromOllama(input, deps.fetchImpl);
  }

  const selected = deps.client === undefined ? (defaultClient() as ParseLikeClient | null) : deps.client;
  if (!selected) {
    return {
      status: "error",
      message:
        "The AI assistant is not configured. Set ANTHROPIC_API_KEY and restart the server.",
    };
  }

  const prompt = buildAssistantPrompt(input);
  const content = input.image
    ? [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: input.image.mediaType,
            data: input.image.base64,
          },
        },
        { type: "text" as const, text: prompt },
      ]
    : prompt;

  try {
    const reply = await selected.messages.parse({
      model: ASSISTANT_MODEL,
      max_tokens: ASSISTANT_MAX_TOKENS,
      messages: [{ role: "user", content }],
      output_config: {
        format: jsonSchemaOutputFormat(SUGGESTION_SCHEMA),
      },
    });
    return extractSuggestionFromReply({
      stopReason: reply.stopReason,
      parsedOutput: reply.parsedOutput,
    });
  } catch {
    return {
      status: "error",
      message:
        "Could not reach the AI assistant. Check the API key and try again shortly.",
    };
  }
}
