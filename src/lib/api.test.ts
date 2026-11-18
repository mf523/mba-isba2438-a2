import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_BODY_BYTES,
  bodySizeResponse,
  parseJsonBody,
  withRoute,
} from "./api";

function jsonRequest(body: string, length?: number): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: length ? { "content-length": String(length) } : {},
    body,
  });
}

test("parseJsonBody accepts a JSON object", async () => {
  const result = await parseJsonBody(jsonRequest('{"a":1}'));
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.body, { a: 1 });
});

test("parseJsonBody rejects invalid JSON and non-objects", async () => {
  assert.equal((await parseJsonBody(jsonRequest("not json"))).ok, false);
  assert.equal((await parseJsonBody(jsonRequest("[1,2]"))).ok, false);
  assert.equal((await parseJsonBody(jsonRequest("42"))).ok, false);
  assert.equal((await parseJsonBody(jsonRequest('"str"'))).ok, false);
});

test("bodySizeResponse allows bodies under the cap", () => {
  const small = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-length": "1000" },
  });
  assert.equal(bodySizeResponse(small), null);
  const none = new Request("http://localhost/api/test", { method: "POST" });
  assert.equal(bodySizeResponse(none), null);
});

test("bodySizeResponse returns 413 over the cap", () => {
  const huge = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "content-length": String(MAX_BODY_BYTES + 1) },
  });
  const response = bodySizeResponse(huge);
  assert.ok(response);
  assert.equal(response.status, 413);
});

test("withRoute returns the handler response on success", async () => {
  const handler = withRoute(async () => new Response("ok", { status: 201 }));
  const response = await handler(new Request("http://localhost/api/test"), undefined);
  assert.equal(response.status, 201);
});

test("withRoute converts a thrown error into a 500 JSON response", async () => {
  const handler = withRoute(async () => {
    throw new Error("store is corrupt");
  });
  const response = await handler(new Request("http://localhost/api/test"), undefined);
  assert.equal(response.status, 500);
  const json = await response.json();
  assert.deepEqual(json, { ok: false, message: "Internal server error." });
});
