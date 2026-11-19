import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildChoicesPrompt,
  buildImagePrompt,
  extractChoicesFromReply,
  requestChoices,
  requestChoicesFromOllama,
  requestNarrativeImage,
  validateChoicesRequest,
} from "./ai";

describe("validateChoicesRequest", () => {
  it("accepts a seed with a valid target type", () => {
    assert.deepEqual(
      validateChoicesRequest({ seed: "caching strategies", targetType: "blog-post" }),
      { ok: true },
    );
  });

  it("requires a seed of at least a few characters", () => {
    const result = validateChoicesRequest({ seed: "  ", targetType: "blog-post" });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 400);
  });

  it("rejects a seed over 2000 characters", () => {
    const result = validateChoicesRequest({ seed: "x".repeat(2001), targetType: "blog-post" });
    assert.equal(result.ok, false);
  });

  it("rejects an unknown target type", () => {
    const result = validateChoicesRequest({ seed: "seed", targetType: "podcast" });
    assert.equal(result.ok, false);
    assert.equal(result.ok === false && result.status, 400);
  });
});

describe("buildChoicesPrompt", () => {
  it("asks for exactly three distinct choices as JSON", () => {
    const prompt = buildChoicesPrompt({
      seed: "caching",
      targetType: "project",
      brief: null,
    });
    assert.match(prompt, /exactly THREE distinct/);
    assert.match(prompt, /project entry/);
    assert.match(prompt, /caching/);
    assert.match(prompt, /ONLY a JSON object/);
  });

  it("includes brief fields when provided", () => {
    const prompt = buildChoicesPrompt({
      seed: "caching",
      targetType: "blog-post",
      brief: {
        title: "A brief",
        audience: "Graders",
        tone: "friendly",
        keyPoints: "Point one\nPoint two",
      },
    });
    assert.match(prompt, /A brief/);
    assert.match(prompt, /Point two/);
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

const VALID_CHOICES = {
  choices: [
    { angle: "practical", paragraph: "A practical walkthrough." },
    { angle: "contrarian", paragraph: "Cache invalidation is a myth." },
    { angle: "personal", paragraph: "I once lost a weekend to a stale cache." },
  ],
};

describe("extractChoicesFromReply", () => {
  it("returns three parsed choices", () => {
    const outcome = extractChoicesFromReply({
      stopReason: "end_turn",
      parsedOutput: VALID_CHOICES,
    });
    assert.equal(outcome.status, "ready");
    assert.equal(outcome.status === "ready" && outcome.choices.length, 3);
  });

  it("accepts a bare array reply", () => {
    const outcome = extractChoicesFromReply({
      stopReason: "end_turn",
      parsedOutput: VALID_CHOICES.choices,
    });
    assert.equal(outcome.status, "ready");
  });

  it("keeps the usable choices when some are malformed", () => {
    const outcome = extractChoicesFromReply({
      stopReason: "end_turn",
      parsedOutput: {
        choices: [VALID_CHOICES.choices[0], { angle: 1 }, { paragraph: "" }],
      },
    });
    assert.equal(outcome.status, "ready");
    assert.equal(outcome.status === "ready" && outcome.choices.length, 1);
  });

  it("trims and normalizes the fields", () => {
    const outcome = extractChoicesFromReply({
      stopReason: "end_turn",
      parsedOutput: {
        choices: [{ angle: "  Practical  ", paragraph: "  Text.  " }],
      },
    });
    assert.deepEqual(outcome.status === "ready" && outcome.choices[0], {
      angle: "practical",
      paragraph: "Text.",
    });
  });

  it("reports a refusal", () => {
    const outcome = extractChoicesFromReply({ stopReason: "refusal", parsedOutput: null });
    assert.equal(outcome.status, "refusal");
  });

  it("reports a token-limit cut-off", () => {
    const outcome = extractChoicesFromReply({ stopReason: "max_tokens", parsedOutput: null });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /cut off/i);
  });

  it("reports an empty parse as an error", () => {
    const outcome = extractChoicesFromReply({
      stopReason: "end_turn",
      parsedOutput: { choices: [{ angle: 5 }] },
    });
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /not in the expected format/i);
  });
});

interface CapturedRequest {
  url: string;
  headers: Record<string, string>;
  body: {
    model: string;
    messages: { role: string; content: string }[];
    format: { required?: string[]; additionalProperties?: boolean };
    stream: boolean;
    think: boolean;
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

describe("requestChoicesFromOllama", () => {
  const input = { seed: "caching", targetType: "blog-post", brief: null };

  it("posts the schema, model and prompt to the chat endpoint", async () => {
    const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_CHOICES)));
    const outcome = await requestChoicesFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "ready");
    assert.match(captured.url, /\/api\/chat$/);
    assert.equal(captured.body.model, "deepseek-v4.1-flash:cloud");
    assert.equal(captured.body.stream, false);
    assert.equal(captured.body.think, false);
    assert.deepEqual(captured.body.format.required, ["choices"]);
    assert.equal(captured.body.messages[0].content.includes("caching"), true);
  });

  it("accepts a reply wrapped in markdown fences", async () => {
    const { fetchImpl } = stubOllamaFetch(() =>
      ollamaReply("```json\n" + JSON.stringify(VALID_CHOICES) + "\n```"));
    const outcome = await requestChoicesFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "ready");
  });

  it("reports a missing model with a pull hint", async () => {
    const { fetchImpl } = stubOllamaFetch(() => new Response("model not found", { status: 404 }));
    const outcome = await requestChoicesFromOllama(input, fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /ollama pull deepseek-v4\.1-flash:cloud/i);
  });

  it("reports an unreachable daemon without throwing", async () => {
    const failing: typeof fetch = async () => {
      throw new Error("connection refused");
    };
    const outcome = await requestChoicesFromOllama(input, failing);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /Could not reach Ollama/i);
  });
});

describe("requestChoices provider routing", () => {
  const input = { seed: "caching", targetType: "blog-post", brief: null };

  it("routes to ollama when AI_PROVIDER=ollama, even with a client stub", async () => {
    const previous = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "ollama";
    try {
      const { fetchImpl, captured } = stubOllamaFetch(() => ollamaReply(JSON.stringify(VALID_CHOICES)));
      const outcome = await requestChoices(input, {
        client: stubClient({ stopReason: "end_turn", parsedOutput: VALID_CHOICES }),
        fetchImpl,
      });
      assert.equal(outcome.status, "ready");
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
      const outcome = await requestChoices(input, { client: null });
      assert.equal(outcome.status, "error");
      assert.match(outcome.status === "error" ? outcome.message : "", /ANTHROPIC_API_KEY/);
    } finally {
      if (previous === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previous;
    }
  });

  it("returns three choices from the anthropic path", async () => {
    const previous = process.env.AI_PROVIDER;
    delete process.env.AI_PROVIDER;
    try {
      const outcome = await requestChoices(input, {
        client: stubClient({ stopReason: "end_turn", parsedOutput: VALID_CHOICES }),
      });
      assert.equal(outcome.status, "ready");
      assert.equal(outcome.status === "ready" && outcome.choices.length, 3);
    } finally {
      if (previous === undefined) delete process.env.AI_PROVIDER;
      else process.env.AI_PROVIDER = previous;
    }
  });
});

describe("buildImagePrompt", () => {
  it("condenses whitespace and caps the subject length", () => {
    const prompt = buildImagePrompt("  a   very  long\nnarrative about caches  ");
    assert.match(prompt, /^Editorial illustration/);
    assert.equal(prompt.includes("a very long narrative about caches"), true);
  });
});

describe("requestNarrativeImage", () => {
  it("fetches from the pollinations prompt endpoint with a seed", async () => {
    let calledUrl = "";
    const fetchImpl: typeof fetch = async (url) => {
      calledUrl = String(url);
      return new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      });
    };
    const outcome = await requestNarrativeImage("a narrative about caches", fetchImpl);
    assert.equal(outcome.status, "ready");
    assert.match(calledUrl, /image\.pollinations\.ai\/prompt\//);
    assert.match(calledUrl, /width=1024/);
    assert.match(calledUrl, /seed=\d+/);
    assert.ok(outcome.status === "ready");
    assert.equal(outcome.extension, "png");
    assert.match(outcome.imagePrompt, /a narrative about caches/);
  });

  it("honors IMAGE_PROVIDER_URL", async () => {
    const previous = process.env.IMAGE_PROVIDER_URL;
    process.env.IMAGE_PROVIDER_URL = "http://127.0.0.1:40010/images";
    try {
      const fetchImpl: typeof fetch = async (url) => {
        assert.equal(String(url).startsWith("http://127.0.0.1:40010/images/prompt/"), true);
        return new Response(new Uint8Array([1]), { headers: { "content-type": "image/jpeg" } });
      };
      const outcome = await requestNarrativeImage("narrative", fetchImpl);
      assert.equal(outcome.status === "ready" && outcome.extension, "jpg");
    } finally {
      if (previous === undefined) delete process.env.IMAGE_PROVIDER_URL;
      else process.env.IMAGE_PROVIDER_URL = previous;
    }
  });

  it("reports transport errors without throwing", async () => {
    const failing: typeof fetch = async () => {
      throw new Error("offline");
    };
    const outcome = await requestNarrativeImage("narrative", failing);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /image service/i);
  });

  it("rejects non-image content types", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response("<html>not an image</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    const outcome = await requestNarrativeImage("narrative", fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /unsupported file type/i);
  });

  it("reports http errors from the image service", async () => {
    const fetchImpl: typeof fetch = async () => new Response("nope", { status: 503 });
    const outcome = await requestNarrativeImage("narrative", fetchImpl);
    assert.equal(outcome.status, "error");
    assert.match(outcome.status === "error" ? outcome.message : "", /503/);
  });
});
