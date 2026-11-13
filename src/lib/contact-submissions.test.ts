import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import {
  getContactSubmissions,
  saveContactSubmission,
  validateContactInput,
} from "./contact-submissions";

before(() => {
  process.env.PORTFOLIO_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), "contacts-test-"),
  );
});

describe("validateContactInput", () => {
  it("accepts a complete submission", () => {
    const errors = validateContactInput({
      name: "Ada",
      email: "ada@example.com",
      message: "Hello!",
    });
    assert.deepEqual(errors, {});
  });

  it("reports every blank field", () => {
    const errors = validateContactInput({ name: "", email: "", message: "" });
    assert.match(errors.name ?? "", /required/i);
    assert.match(errors.email ?? "", /required/i);
    assert.match(errors.message ?? "", /required/i);
  });

  it("rejects malformed emails", () => {
    const errors = validateContactInput({
      name: "Ada",
      email: "not-an-email",
      message: "Hello!",
    });
    assert.match(errors.email ?? "", /valid email/i);
  });
});

describe("contact-submissions store", () => {
  it("starts empty and appends trimmed submissions", async () => {
    assert.deepEqual(await getContactSubmissions(), []);
    const saved = await saveContactSubmission({
      name: "  Ada Lovelace  ",
      email: "  ada@example.com ",
      message: " First message! ",
    });
    assert.equal(saved.name, "Ada Lovelace");
    assert.equal(saved.email, "ada@example.com");
    assert.equal(saved.message, "First message!");
    assert.match(saved.id, /^[0-9a-f-]{36}$/);
    assert.match(saved.submittedAt, /^\d{4}-\d{2}-\d{2}T/);

    await saveContactSubmission({
      name: "Second",
      email: "second@example.com",
      message: "Two",
    });
    const all = await getContactSubmissions();
    assert.equal(all.length, 2);
  });
});
