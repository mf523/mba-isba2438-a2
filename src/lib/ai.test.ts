import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAssistantPrompt,
  extractSuggestionFromReply,
  requestSuggestion,
  requestSuggestionFromOllama,
  validateAssistantRequest,
} from "./ai";

describe("validateAssistantRequest", () => {
  it("accepts notes with no image", () => {
    assert.deepEqual(
      validateAssistantRequest({ targetType: "blog-post", notes: "hello", image: null }),
      { ok: true },
    );
  });

  it("requires notes", () => {
    const result = validateAssistantRequest({ targetType: "blog-post", notes: "  " });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 400);
  });

  it("rejects unsupported image types", () => {
    const result = validateAssistantRequest({
      targetType: "blog-post",
      notes: "hello",
      image: { mediaType: "image/svg+xml", sizeBytes: 100 },
    });
    assert.equal(result.ok, false);
    assert.match(result.ok === false ? result.message : "", /PNG, JPEG, WebP or GIF/);
  });

  it("rejects oversized images with 413", () => {
    const result = validateAssistantRequest({
      targetType: "blog-post",
      notes: "hello",
      image: { mediaType: "image/png", sizeBytes: 11 * 1024 * 1024 },
    });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 413);
  });
});

describe("buildAssistantPrompt", () => {
  it("mentions the target type and notes", () => {
    const prompt = buildAssistantPrompt({
      targetType: "project",
      notes: "A case study about caching.",
      brief: null,
      image: null,
    });
    assert.match(prompt, /project entry/);
    assert.match(prompt, /A case study about caching\./);
    assert.match(prompt, /80 characters/);
  });

  it("includes brief fields when provided", () => {
    const prompt = buildAssistantPrompt({
      targetType: "blog-post",
      notes: "Notes.",
      brief: {
        title: "A brief",
        audience: "Graders",
        tone: "friendly",
        keyPoints: "Point one\nPoint two",
      },
      image: null,
    });
    assert.match(prompt, /A brief/);
    assert.match(prompt, /Graders/);
    assert.match(prompt, /friendly/);
    assert.match(prompt, /Point two/);
  });

  it("mentions the attached image", () => {
    const prompt = buildAssistantPrompt({
      targetType: "blog-post",
      notes: "Notes.",
      brief: null,
      image: { mediaType: "image/png", base64: "AAAA" },
    });
    assert.match(prompt, /image is attached/i);
  });

  it("asks for a JSON-only reply", () => {
    const prompt = buildAssistantPrompt({
      targetType: "blog-post",
      notes: "Notes.",
      brief: null,
      image: null,
    });
    assert.match(prompt, /ONLY a JSON object/);
  });
});

function stubClient(reply: {
  stopReason?: string;
  parsedOutput?: unknown;
} | null, throwInstead = false) {
  return {
    messages: {
      parse: async () => {
        if (throwInstead) {
          throw new Error("network down");
        }
        return reply ?? {};
      },
    },
  };
}

describe("requestSuggestion (anthropic provider)", () => {
  const input = {
    targetType: "blog-post",
    notes: "Notes.",
    brief: null,
    image: null,
  };

  it("returns a ready suggestion for a valid reply", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient({
      stopReason: "end_turn",
      parsedOutput: { title: "T", summary: "S", body: "B" },
    }) });
    assert.deepEqual(outcome, {
      status: "ready",
      suggestion: { title: "T", summary: "S", body: "B" },
    });
  });

  it("reports a refusal from the model", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient({
      stopReason: "refusal",
      parsedOutput: null,
    }) });
    assert.equal(outcome.status, "refusal");
    assert.match(outcome.status === "refusal" ? outcome.message : "", /declined/i);
  });

  it("reports a token-limit cut-off", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient({
      stopReason: "max_tokens",
      parsedOutput: null,
    }) });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /cut off/i);
  });

  it("reports a malformed reply (missing fields)", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient({
      stopReason: "end_turn",
      parsedOutput: { title: "Only a title" },
    }) });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /not in the expected format/i);
  });

  it("reports a reply that breaks the length limits", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient({
      stopReason: "end_turn",
      parsedOutput: { title: "x".repeat(81), summary: "S", body: "B" },
    }) });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /length limits/i);
  });

  it("reports network errors without throwing", async () => {
    const outcome = await requestSuggestion(input, { client: stubClient(null, true) });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /Could not reach/i);
  });

  it("reports an unconfigured assistant without calling the model", async () => {
    const outcome = await requestSuggestion(input, { client: null });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /not configured/i);
  });
});

describe("extractSuggestionFromReply", () => {
  it("trims the suggestion fields", () => {
    const outcome = extractSuggestionFromReply({
      stopReason: "end_turn",
      parsedOutput: { title: "  T  ", summary: " S ", body: " B " },
    });
    assert.deepEqual(outcome, {
      status: "ready",
      suggestion: { title: "T", summary: "S", body: "B" },
    });
  });
});

interface CapturedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    messages: { role: string; content: string; images?: string[] }[];
    format: { required?: string[]; additionalProperties?: boolean };
    stream: boolean;
    think: boolean;
    options: { num_predict: number };
  };
}

function stubOllamaFetch(
  handler: (captured: CapturedRequest) => Response | Promise<Response>,
) {
  const captured = {} as CapturedRequest;
  const fetchImpl: typeof fetch = async (url, init) => {
    captured.url = String(url);
    captured.headers = Object.fromEntries(new Headers(init?.headers).entries());
    captured.body = JSON.parse(String(init?.body));
    return await handler(captured);
  };
  return { fetchImpl, captured };
}

function ollamaReply(content: string) {
  return new Response(JSON.stringify({ message: { role: "assistant", content } }), {
    headers: { "content-type": "application/json" },
  });
}

const VALID_SUGGESTION = { title: "T", summary: "S", body: "B" };

describe("requestSuggestionFromOllama", () => {
  const input = {
    targetType: "blog-post",
    notes: "Notes.",
    brief: null,
    image: null,
  };

  it("posts the schema, model and prompt to the chat endpoint", async () => {
    const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_SUGGESTION)));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.deepEqual(outcome, { status: "ready", suggestion: VALID_SUGGESTION });
    assert.match(captured.url, /\/api\/chat$/);
    assert.equal(captured.body.model, "deepseek-v4.1-flash:cloud");
    assert.equal(captured.body.stream, false);
    assert.equal(captured.body.think, false);
    assert.equal(captured.body.options.num_predict > 0, true);
    assert.deepEqual(captured.body.format.required, ["title", "summary", "body"]);
    assert.equal(captured.body.format.additionalProperties, false);
    assert.equal(captured.body.messages[0].content.includes("Notes."), true);
    assert.equal(captured.body.messages[0].images, undefined);
  });

  it("attaches the image as base64 when provided", async () => {
    const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_SUGGESTION)));
    await requestSuggestionFromOllama(
      { ...input, image: { mediaType: "image/png", base64: "AAAA" } },
      fetchImpl,
    );
    assert.deepEqual(captured.body.messages[0].images, ["AAAA"]);
  });

  it("reports a malformed reply", async () => {
    const { fetchImpl } = stubOllamaFetch(() => ollamaReply("this is not json"));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /not in the expected format/i);
  });

  it("accepts a reply wrapped in markdown fences", async () => {
    const { fetchImpl } = stubOllamaFetch(() =>
      ollamaReply("```json\n" + JSON.stringify(VALID_SUGGESTION) + "\n```"));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.deepEqual(outcome, { status: "ready", suggestion: VALID_SUGGESTION });
  });

  it("reports an unparseable response envelope", async () => {
    const { fetchImpl } = stubOllamaFetch(() => new Response("<html>gateway error</html>", { status: 200 }));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /not in the expected format/i);
  });

  it("reports a missing model with a pull hint", async () => {
    const { fetchImpl } = stubOllamaFetch(() =>
      new Response("model not found", { status: 404 }));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /ollama pull deepseek-v4\.1-flash:cloud/i);
  });

  it("reports daemon errors with the status code", async () => {
    const { fetchImpl } = stubOllamaFetch(() => new Response("server busy", { status: 500 }));
    const outcome = await requestSuggestionFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /500/);
  });

  it("reports an unreachable daemon without throwing", async () => {
    const failing: typeof fetch = async () => {
      throw new Error("connection refused");
    };
    const outcome = await requestSuggestionFromOllama(input, failing);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /Could not reach Ollama/i);
  });

  it("uses OLLAMA_BASE_URL and sends the bearer key when set", async () => {
    const previousBase = process.env.OLLAMA_BASE_URL;
    const previousKey = process.env.OLLAMA_API_KEY;
    process.env.OLLAMA_BASE_URL = "http://127.0.0.1:40001";
    process.env.OLLAMA_API_KEY = "test-key";
    try {
      const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_SUGGESTION)));
      await requestSuggestionFromOllama(input, fetchImpl);
      assert.equal(captured.url, "http://127.0.0.1:40001/api/chat");
      assert.equal(captured.headers.authorization, "Bearer test-key");
    } finally {
      if (previousBase === undefined) delete process.env.OLLAMA_BASE_URL;
      else process.env.OLLAMA_BASE_URL = previousBase;
      if (previousKey === undefined) delete process.env.OLLAMA_API_KEY;
      else process.env.OLLAMA_API_KEY = previousKey;
    }
  });
});

describe("requestSuggestion provider routing", () => {
  const input = {
    targetType: "blog-post",
    notes: "Notes.",
    brief: null,
    image: null,
  };

  it("routes to ollama when AI_PROVIDER=ollama, even with a client stub", async () => {
    const previous = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "ollama";
    try {
      const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_SUGGESTION)));
      const outcome = await requestSuggestion(input, {
        client: stubClient({ stopReason: "end_turn", parsedOutput: VALID_SUGGESTION }),
        fetchImpl,
      });
      assert.deepEqual(outcome, { status: "ready", suggestion: VALID_SUGGESTION });
      assert.match(captured.url, /\/api\/chat$/);
    } finally {
      if (previous === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previous;
    }
  });

  it("routes to anthropic by default", async () => {
    const previous = process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER;
    try {
      const outcome = await requestSuggestion(input, { client: null });
      assert.equal(outcome.status, "error");
      assert.match(outcome.status === "error" ? outcome.message : "", /ANTHROPIC_API_KEY/);
    } finally {
      if (previous === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previous;
    }
  });
});
