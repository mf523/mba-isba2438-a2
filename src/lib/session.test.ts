import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSessionPayload,
  verifySessionToken,
} from "./session";

const SIGN = (payload: string) => `sig-${payload}`;
const DAY = 24 * 60 * 60 * 1000;

function makeToken(exp: number, signFn = SIGN): string {
  const payload = Buffer.from(JSON.stringify({ exp }), "utf8").toString(
    "base64url",
  );
  return `${payload}.${signFn(payload)}`;
}

test("parseSessionPayload accepts a future exp", () => {
  assert.equal(parseSessionPayload(makeToken(Date.now() + DAY).split(".")[0], Date.now()), true);
});

test("parseSessionPayload rejects an expired exp", () => {
  assert.equal(parseSessionPayload(makeToken(Date.now() - 1).split(".")[0], Date.now()), false);
});

test("parseSessionPayload rejects a non-number or missing exp", () => {
  const payload = Buffer.from(JSON.stringify({ exp: "soon" }), "utf8").toString("base64url");
  assert.equal(parseSessionPayload(payload, Date.now()), false);
  const empty = Buffer.from(JSON.stringify({}), "utf8").toString("base64url");
  assert.equal(parseSessionPayload(empty, Date.now()), false);
  assert.equal(parseSessionPayload("%%%not-base64url", Date.now()), false);
});

test("verifySessionToken accepts a correctly signed, unexpired token", () => {
  assert.equal(verifySessionToken(makeToken(Date.now() + DAY), SIGN, Date.now()), true);
});

test("verifySessionToken rejects a validly signed but expired token", () => {
  assert.equal(verifySessionToken(makeToken(Date.now() - 1000), SIGN, Date.now()), false);
});

test("verifySessionToken rejects a wrong signature", () => {
  assert.equal(
    verifySessionToken(makeToken(Date.now() + DAY), (p) => `sig-${p}-x`, Date.now()),
    false,
  );
});

test("verifySessionToken rejects malformed tokens", () => {
  assert.equal(verifySessionToken("", SIGN), false);
  assert.equal(verifySessionToken("no-signature", SIGN), false);
  assert.equal(verifySessionToken("a.b.c", SIGN), false);
});
