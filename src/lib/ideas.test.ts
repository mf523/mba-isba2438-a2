import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import {
  addIdea,
  deleteIdea,
  getIdeaById,
  isUsableIdeaId,
  listIdeas,
  updateIdea,
  updateIdeaImage,
  validateIdeaInput,
} from "./ideas";

before(() => {
  process.env.PORTFOLIO_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), "ideas-test-"),
  );
});

describe("isUsableIdeaId", () => {
  it("accepts uuid ids and slug ids", () => {
    assert.equal(isUsableIdeaId("0f7d6a1e-3f2b-4a9c-8d1e-2b3c4d5e6f7a"), true);
    assert.equal(isUsableIdeaId("idea-component-library"), true);
  });

  it("rejects empty, oversized, or path-like ids", () => {
    assert.equal(isUsableIdeaId(""), false);
    assert.equal(isUsableIdeaId("   "), false);
    assert.equal(isUsableIdeaId("../etc/passwd"), false);
    assert.equal(isUsableIdeaId("a".repeat(101)), false);
    assert.equal(isUsableIdeaId("bad id with spaces"), false);
  });
});

describe("validateIdeaInput", () => {
  const valid = {
    title: "An idea",
    summary: "One line.",
    body: "The body.",
    targetType: "blog-post",
  };

  it("accepts a complete idea", () => {
    assert.deepEqual(validateIdeaInput(valid), {});
  });

  it("reports blank fields", () => {
    const errors = validateIdeaInput({
      title: "",
      summary: "",
      body: "",
      targetType: "",
    });
    assert.match(errors.title ?? "", /required/i);
    assert.match(errors.summary ?? "", /required/i);
    assert.match(errors.body ?? "", /required/i);
    assert.match(errors.targetType ?? "", /choose/i);
  });

  it("enforces the blog/project length limits", () => {
    const errors = validateIdeaInput({
      ...valid,
      title: "x".repeat(81),
      summary: "x".repeat(201),
      body: "x".repeat(5001),
    });
    assert.match(errors.title ?? "", /80/);
    assert.match(errors.summary ?? "", /200/);
    assert.match(errors.body ?? "", /5000/);
  });

  it("rejects unknown target types", () => {
    const errors = validateIdeaInput({ ...valid, targetType: "video" });
    assert.match(errors.targetType ?? "", /choose/i);
  });
});

describe("ideas store", () => {
  it("serves the two seed ideas from a fresh store", async () => {
    const ideas = await listIdeas();
    assert.equal(ideas.length, 2);
    assert.deepEqual(
      ideas.map((idea) => idea.origin).sort(),
      ["hand", "hand"],
    );
  });

  it("adds an idea with timestamps and an id", async () => {
    const idea = await addIdea({
      title: "Hand-written",
      summary: "Added by a test.",
      body: "Body text.",
      targetType: "project",
      origin: "hand",
    });
    assert.match(idea.id, /^[0-9a-f-]{36}$/);
    assert.equal(idea.origin, "hand");
    const fetched = await getIdeaById(idea.id);
    assert.equal(fetched?.title, "Hand-written");
  });

  it("updates an idea in place, keeping origin and createdAt", async () => {
    const created = await addIdea({
      title: "Before",
      summary: "Before summary.",
      body: "Before body.",
      targetType: "blog-post",
      origin: "assistant",
    });
    const updated = await updateIdea(created.id, {
      title: "After",
      summary: "After summary.",
      body: "After body.",
      targetType: "project",
    });
    assert.equal(updated?.title, "After");
    assert.equal(updated?.targetType, "project");
    assert.equal(updated?.origin, "assistant");
    assert.equal(updated?.createdAt, created.createdAt);
  });

  it("returns undefined when updating an unknown id", async () => {
    const updated = await updateIdea("nope", {
      title: "x",
      summary: "x",
      body: "x",
      targetType: "project",
    });
    assert.equal(updated, undefined);
  });

  it("deletes an idea and reports unknown ids", async () => {
    const created = await addIdea({
      title: "Doomed",
      summary: "Will be deleted.",
      body: "Body.",
      targetType: "blog-post",
      origin: "hand",
    });
    assert.equal(await deleteIdea(created.id), true);
    assert.equal(await getIdeaById(created.id), undefined);
    assert.equal(await deleteIdea(created.id), false);
  });

  it("persists artwork fields and returns undefined for unknown ids", async () => {
    const created = await addIdea({
      title: "With art",
      summary: "Has artwork.",
      body: "The narrative body.",
      targetType: "blog-post",
      origin: "assistant",
    });
    const updated = await updateIdeaImage(created.id, {
      imagePrompt: "Editorial illustration for a developer blog post. Subject: The narrative body.",
      imageUrl: `/api/images/${created.id}`,
    });
    assert.equal(updated?.imagePrompt?.includes("The narrative body"), true);
    assert.equal(updated?.imageUrl, `/api/images/${created.id}`);
    assert.equal(await updateIdeaImage("no-such-id", { imagePrompt: "p", imageUrl: "u" }), undefined);

    const reread = await getIdeaById(created.id);
    assert.equal(reread?.imageUrl, `/api/images/${created.id}`);
  });
});
