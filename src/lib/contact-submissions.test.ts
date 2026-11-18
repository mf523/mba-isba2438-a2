import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import {
  deleteContactSubmission,
  getContactSubmissionById,
  getContactSubmissions,
  saveContactSubmission,
  updateContactSubmission,
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
    assert.equal(saved.status, "new");

    await saveContactSubmission({
      name: "Second",
      email: "second@example.com",
      message: "Two",
    });
    const all = await getContactSubmissions();
    assert.equal(all.length, 2);
  });

  it("reads stored submissions without a status field as new", async () => {
    const dir = process.env.PORTFOLIO_DATA_DIR ?? "";
    const file = path.join(dir, "contact-submissions.json");
    const stored = JSON.parse(readFileSync(file, "utf8")) as {
      status?: string;
    }[];
    delete stored[0].status;
    writeFileSync(file, JSON.stringify(stored));
    const all = await getContactSubmissions();
    assert.equal(all[0].status, "new");
  });

  it("finds one submission by id", async () => {
    const all = await getContactSubmissions();
    const found = await getContactSubmissionById(all[0].id);
    assert.equal(found?.id, all[0].id);
    assert.equal(await getContactSubmissionById("nope"), undefined);
  });

  it("updates the status and reports not-found", async () => {
    const all = await getContactSubmissions();
    const updated = await updateContactSubmission(all[0].id, "archived");
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.submission.status, "archived");
      assert.equal(updated.submission.message, all[0].message);
    }
    const reread = await getContactSubmissionById(all[0].id);
    assert.equal(reread?.status, "archived");
    const missing = await updateContactSubmission("nope", "new");
    assert.deepEqual(missing, { ok: false, reason: "not-found" });
  });

  it("deletes a submission and reports not-found afterwards", async () => {
    const all = await getContactSubmissions();
    const deleted = await deleteContactSubmission(all[0].id);
    assert.deepEqual(deleted, { ok: true });
    const remaining = await getContactSubmissions();
    assert.equal(remaining.length, all.length - 1);
    const again = await deleteContactSubmission(all[0].id);
    assert.deepEqual(again, { ok: false, reason: "not-found" });
  });
});
