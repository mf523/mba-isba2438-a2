import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";

export const ASSISTANT_MODEL = "claude-opus-5-5";
export const ASSISTANT_MAX_TOKENS = 4096;

export type AssistantProvider = "anthropic" | "ollama";
export const OLLAMA_DEFAULT_MODEL = "deepseek-v4.1-flash:cloud";
export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
const OLLAMA_TIMEOUT_MS = 120_000;

export function getAssistantProvider(): AssistantProvider {
  return process.env.AI_PROVIDER === "ollama" ? "ollama" : "anthropic";
}

export function isAssistantConfigured(): boolean {
  if (getAssistantProvider() === "ollama") {
    return true;
  }
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface BriefDetails {
  title: string;
  audience: string;
  tone: string;
  keyPoints: string;
}

export interface ChoicesRequest {
  seed: string;
  targetType: string;
  brief?: BriefDetails | null;
}

export interface Choice {
  angle: string;
  paragraph: string;
  title?: string;
  summary?: string;
}

export type ChoicesOutcome =
  | { status: "ready"; choices: Choice[] }
  | { status: "refusal"; message: string }
  | { status: "error"; message: string };

export function validateChoicesRequest(input: {
  seed: string;
  targetType: string;
}): { ok: true } | { ok: false; status: 400; message: string } {
  if (input.seed.trim().length < 3) {
    return {
      ok: false,
      status: 400,
      message: "Give the assistant a seed of a few words or sentences first.",
    };
  }
  if (input.seed.trim().length > 2000) {
    return {
      ok: false,
      status: 400,
      message: "Keep the seed under 2000 characters.",
    };
  }
  if (input.targetType !== "blog-post" && input.targetType !== "project") {
    return {
      ok: false,
      status: 400,
      message: "Choose what the idea becomes: blog post or project.",
    };
  }
  return { ok: true };
}

const CHOICES_SCHEMA = {
  type: "object",
  properties: {
    choices: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          angle: { type: "string" },
          paragraph: { type: "string" },
        },
        required: ["angle", "paragraph"],
        additionalProperties: false,
      },
    },
  },
  required: ["choices"],
  additionalProperties: false,
} as const;

export function buildChoicesPrompt(input: ChoicesRequest): string {
  const targetLabel =
    input.targetType === "project" ? "project entry" : "blog post";
  const lines = [
    `You are helping a developer brainstorm content for their portfolio website.`,
    `From the seed below, produce exactly THREE distinct narrative directions for a ${targetLabel}.`,
    `The three angles must be genuinely different approaches (for example: a practical explainer, a contrarian take, a personal anecdote) — not rewrites of the same idea.`,
    `Each choice: "angle" is a 1-3 word label for the approach (lowercase); "title" is a specific working headline (max 80 characters, not generic); "summary" is a one-line summary of that narrative (max 200 characters); "paragraph" is a 2-4 sentence narrative the writer could publish.`,
    `Respond with ONLY a JSON object of the shape {"choices":[{"angle":"...","title":"...","summary":"...","paragraph":"..."}]} — no markdown, no commentary.`,
    ``,
    `Seed:`,
    input.seed.trim(),
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
  return lines.join("\n");
}

function optionalText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > max) {
    return undefined;
  }
  return trimmed;
}

function isValidChoice(value: unknown): value is Choice {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.angle === "string" &&
    entry.angle.trim().length > 0 &&
    entry.angle.trim().length <= 40 &&
    typeof entry.paragraph === "string" &&
    entry.paragraph.trim().length > 0 &&
    entry.paragraph.trim().length <= 4000
  );
}

export function extractChoicesFromReply(reply: {
  stopReason?: string;
  parsedOutput?: unknown;
}): ChoicesOutcome {
  if (reply.stopReason === "refusal") {
    return {
      status: "refusal",
      message:
        "The assistant declined this request. Try a different seed.",
    };
  }
  if (reply.stopReason === "max_tokens") {
    return {
      status: "error",
      message:
        "The assistant's answer was cut off by the token limit. Try a shorter seed.",
    };
  }
  const candidate = reply.parsedOutput as
    | { choices?: unknown }
    | unknown[]
    | null
    | undefined;
  const rawChoices = Array.isArray(candidate)
    ? candidate
    : Array.isArray(candidate?.choices)
      ? candidate.choices
      : [];
  const choices = rawChoices
    .filter(isValidChoice)
    .map((choice) => {
      const mapped: Choice = {
        angle: choice.angle.trim().toLowerCase(),
        paragraph: choice.paragraph.trim(),
      };
      const title = optionalText(choice.title, 120);
      if (title) {
        mapped.title = title;
      }
      const summary = optionalText(choice.summary, 300);
      if (summary) {
        mapped.summary = summary;
      }
      return mapped;
    });
  if (choices.length === 0) {
    return {
      status: "error",
      message:
        "The assistant's reply was not in the expected format. Shuffle and try again.",
    };
  }
  return { status: "ready", choices };
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

function parseLooseJson(raw: string): unknown {
  const attempt = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  return (
    attempt(raw) ??
    attempt(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")) ??
    attempt(raw.slice(Math.max(raw.indexOf("{"), 0), raw.lastIndexOf("}") + 1)) ??
    null
  );
}

export async function requestChoicesFromOllama(
  input: ChoicesRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<ChoicesOutcome> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || OLLAMA_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL || OLLAMA_DEFAULT_MODEL;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.OLLAMA_API_KEY) {
    headers.authorization = `Bearer ${process.env.OLLAMA_API_KEY}`;
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: buildChoicesPrompt(input) }],
        format: CHOICES_SCHEMA,
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
  return extractChoicesFromReply({
    parsedOutput: parseLooseJson(payload?.message?.content ?? ""),
  });
}

export interface ChoicesDeps {
  client?: ParseLikeClient | null;
  fetchImpl?: typeof fetch;
}

function defaultClient(): Anthropic | null {
  if (!isAssistantConfigured()) {
    return null;
  }
  return new Anthropic();
}

export async function requestChoices(
  input: ChoicesRequest,
  deps: ChoicesDeps = {},
): Promise<ChoicesOutcome> {
  if (getAssistantProvider() === "ollama") {
    return requestChoicesFromOllama(input, deps.fetchImpl);
  }

  const selected = deps.client === undefined ? (defaultClient() as ParseLikeClient | null) : deps.client;
  if (!selected) {
    return {
      status: "error",
      message:
        "The AI assistant is not configured. Set ANTHROPIC_API_KEY and restart the server.",
    };
  }

  try {
    const reply = await selected.messages.parse({
      model: ASSISTANT_MODEL,
      max_tokens: ASSISTANT_MAX_TOKENS,
      messages: [{ role: "user", content: buildChoicesPrompt(input) }],
      output_config: {
        format: jsonSchemaOutputFormat(CHOICES_SCHEMA),
      },
    });
    return extractChoicesFromReply({
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

export const IMAGE_GEN_TIMEOUT_MS = 60_000;
export const POLLINATIONS_DEFAULT_URL = "https://image.pollinations.ai";
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function getImageProvider(): { id: "pollinations"; url: string } {
  return {
    id: "pollinations",
    url: (process.env.IMAGE_PROVIDER_URL || POLLINATIONS_DEFAULT_URL).replace(
      /\/+$/,
      "",
    ),
  };
}

export type NarrativeImageOutcome =
  | {
      status: "ready";
      imagePrompt: string;
      bytes: Buffer;
      contentType: string;
      extension: string;
    }
  | { status: "error"; message: string };

export function buildImagePrompt(narrative: string): string {
  const condensed = narrative.replace(/\s+/g, " ").trim().slice(0, 400);
  return `Editorial illustration for a developer blog post. Abstract, modern, clean vector style. Subject: ${condensed}`;
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function requestNarrativeImage(
  narrative: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NarrativeImageOutcome> {
  const imagePrompt = buildImagePrompt(narrative);
  const base = (process.env.IMAGE_PROVIDER_URL || POLLINATIONS_DEFAULT_URL).replace(/\/+$/, "");
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `${base}/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=768&nologo=true&seed=${seed}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(IMAGE_GEN_TIMEOUT_MS),
    });
  } catch {
    return {
      status: "error",
      message:
        "Could not reach the image service. The narrative is saved — try generating the picture again shortly.",
    };
  }

  if (!response.ok) {
    return {
      status: "error",
      message: `The image service returned an error (${response.status}). Try again shortly.`,
    };
  }
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0];
  const extension = EXTENSIONS[contentType];
  if (!extension) {
    return {
      status: "error",
      message: "The image service returned an unsupported file type.",
    };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    return { status: "error", message: "The image service returned an empty file." };
  }
  if (bytes.byteLength > IMAGE_MAX_BYTES) {
    return { status: "error", message: "The image service returned a file that is too large." };
  }
  return { status: "ready", imagePrompt, bytes, contentType, extension };
}
