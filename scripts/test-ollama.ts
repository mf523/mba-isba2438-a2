import { OLLAMA_DEFAULT_BASE_URL, OLLAMA_DEFAULT_MODEL } from "../src/lib/ai";

interface TagList {
  models?: { name?: string; model?: string; remote_host?: string }[];
}

interface ChatResponse {
  message?: { content?: string };
  done_reason?: string;
  total_duration?: number;
  error?: string;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--base-url") {
      args["base-url"] = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--model") {
      args.model = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--prompt") {
      args.prompt = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--skip-chat") {
      args["skip-chat"] = true;
    } else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  return args;
}

function maskKey(key: string | undefined): string {
  if (!key) return "not set";
  return `${key.slice(0, 4)}…${key.slice(-2)} (set)`;
}

let failures = 0;
function check(name: string, pass: boolean, detail = ""): boolean {
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
  return pass;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = (
    (typeof args["base-url"] === "string" && args["base-url"]) ||
    process.env.OLLAMA_BASE_URL ||
    OLLAMA_DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const model =
    (typeof args.model === "string" && args.model) ||
    process.env.OLLAMA_MODEL ||
    OLLAMA_DEFAULT_MODEL;
  const apiKey = process.env.OLLAMA_API_KEY;
  const prompt = (typeof args.prompt === "string" && args.prompt) || "hello";

  console.log(`Ollama connection test`);
  console.log(`  base URL: ${baseUrl}`);
  console.log(`  model:    ${model}`);
  console.log(`  API key:  ${maskKey(apiKey)}`);
  console.log(`  prompt:   ${JSON.stringify(prompt)}`);
  console.log("");

  const headers: Record<string, string> = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  let tags: TagList | null = null;
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      check("daemon reachable", false, `GET /api/tags returned ${response.status}`);
    } else {
      tags = (await response.json()) as TagList;
      check("daemon reachable", true, `${Date.now() - started} ms`);
    }
  } catch (error) {
    check(
      "daemon reachable",
      false,
      `${error instanceof Error ? error.message : error} — is \`ollama serve\` running?`,
    );
  }

  if (tags) {
    const names = (tags.models ?? [])
      .map((entry) => entry.name ?? entry.model ?? "")
      .filter(Boolean);
    const installed = names.some((name) => name === model || name.split(":")[0] === model.split(":")[0]);
    check(
      "model available",
      installed,
      installed ? names.join(", ") : `not in ${names.join(", ") || "(empty)"} — run \`ollama pull ${model}\``,
    );
  } else {
    check("model available", false, "skipped, daemon unreachable");
  }

  if (args["skip-chat"] !== true) {
    const chatStarted = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: `${prompt}

Respond with ONLY a JSON object with the keys "title" and "summary": a two-word title and a one-sentence summary for a blog post about the prompt. No markdown formatting, no commentary before or after.`,
            },
          ],
          format: {
            type: "object",
            properties: { title: { type: "string" }, summary: { type: "string" } },
            required: ["title", "summary"],
            additionalProperties: false,
          },
          stream: false,
          think: false,
          options: { num_predict: 200 },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 200);
        check("chat request", false, `${response.status} ${detail}`);
      } else {
        const payload = (await response.json()) as ChatResponse;
        if (payload.error) {
          check("chat request", false, payload.error);
        } else {
          const content = payload.message?.content ?? "";
          let parsed: unknown = null;
          try {
            parsed = JSON.parse(content);
          } catch {
            parsed = null;
          }
          const valid =
            typeof parsed === "object" &&
            parsed !== null &&
            typeof (parsed as { title?: unknown }).title === "string";
          const seconds = ((Date.now() - chatStarted) / 1000).toFixed(1);
          check(
            "chat request",
            valid,
            valid
              ? `${seconds} s, done_reason=${payload.done_reason ?? "?"}, title=${JSON.stringify((parsed as { title: string }).title).slice(0, 60)}`
              : `unparsable reply (${seconds} s, done_reason=${payload.done_reason ?? "?"}): ${JSON.stringify(content).slice(0, 120)}`,
          );
        }
      }
    } catch (error) {
      check(
        "chat request",
        false,
        `${error instanceof Error ? error.message : error} — model may be missing, or the cloud backend is unreachable`,
      );
    }
  } else {
    console.log("SKIP chat request (--skip-chat)");
  }

  console.log("");
  if (failures > 0) {
    console.log(`${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("All checks passed.");
}

void main();
