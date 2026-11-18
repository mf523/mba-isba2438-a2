import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import {
  addProject,
  deleteProject,
  parseTechStackInput,
  updateProject,
  validateProjectInput,
} from "./projects";

before(() => {
  process.env.PORTFOLIO_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), "projects-test-"),
  );
});

function storedProjects(): { slug: string; title?: string; summary?: string; techStack?: string[] }[] {
  const raw = readFileSync(
    path.join(process.env.PORTFOLIO_DATA_DIR ?? "", "projects.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

const VALID_PROJECT = {
  title: "Caching Lab",
  slug: "caching-lab",
  summary: "A small lab for cache experiments.",
  description: "Long description of the caching lab.",
  repoUrl: "",
  liveUrl: "",
  techStack: ["Next.js"],
};

describe("validateProjectInput", () => {
  it("accepts a complete project", () => {
    assert.deepEqual(
      validateProjectInput({
        ...VALID_PROJECT,
        repoUrl: "https://github.com/example/lab",
        liveUrl: "https://lab.example.com",
      }),
      {},
    );
  });

  it("reports one message per missing field", () => {
    const errors = validateProjectInput({
      title: "",
      slug: "",
      summary: "",
      description: "",
      repoUrl: "",
      liveUrl: "",
      techStack: [],
    });
    assert.match(errors.title ?? "", /required/i);
    assert.match(errors.slug ?? "", /slug/i);
    assert.match(errors.summary ?? "", /required/i);
    assert.match(errors.description ?? "", /required/i);
  });

  it("enforces the length limits", () => {
    const errors = validateProjectInput({
      title: "x".repeat(81),
      slug: "ok",
      summary: "x".repeat(201),
      description: "x".repeat(2001),
      repoUrl: "",
      liveUrl: "",
      techStack: [],
    });
    assert.match(errors.title ?? "", /80/);
    assert.match(errors.summary ?? "", /200/);
    assert.match(errors.description ?? "", /2000/);
  });

  it("rejects invalid slugs and URLs", () => {
    const errors = validateProjectInput({
      ...VALID_PROJECT,
      slug: "Bad Slug!",
      repoUrl: "not-a-url",
      liveUrl: "ftp://example.com",
    });
    assert.match(errors.slug ?? "", /lowercase/i);
    assert.match(errors.repoUrl ?? "", /http/i);
    assert.match(errors.liveUrl ?? "", /http/i);
  });

  it("rejects a non-array tech stack", () => {
    const errors = validateProjectInput({
      ...VALID_PROJECT,
      techStack: "Next.js" as unknown as string[],
    });
    assert.match(errors.techStack ?? "", /list/i);
  });
});

describe("parseTechStackInput", () => {
  it("splits a comma-separated string", () => {
    assert.deepEqual(parseTechStackInput(" React , CSS ,, "), ["React", "CSS"]);
  });

  it("accepts an array and trims entries", () => {
    assert.deepEqual(parseTechStackInput([" React", ""]), ["React"]);
  });

  it("returns an empty array for other values", () => {
    assert.deepEqual(parseTechStackInput(42), []);
  });
});

describe("project store", () => {
  it("seeds the default projects on first write", async () => {
    const added = await addProject({ ...VALID_PROJECT });
    assert.deepEqual(added, { ok: true, project: VALID_PROJECT });
    const slugs = storedProjects().map((project) => project.slug);
    assert.equal(slugs.includes("resume-site"), true);
    assert.equal(slugs.includes("caching-lab"), true);
  });

  it("rejects a duplicate slug without duplicating the entry", async () => {
    const duplicate = await addProject({ ...VALID_PROJECT, title: "Again" });
    assert.deepEqual(duplicate, { ok: false, reason: "duplicate-slug" });
    assert.equal(
      storedProjects().filter((project) => project.slug === "caching-lab").length,
      1,
    );
  });

  it("updates content but keeps the slug", async () => {
    const updated = await updateProject("caching-lab", {
      title: "Caching Lab v2",
      summary: "Updated summary.",
      description: "Updated description.",
      techStack: ["Next.js", "React"],
      repoUrl: "https://github.com/example/lab",
      liveUrl: "",
    });
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.project.slug, "caching-lab");
      assert.equal(updated.project.title, "Caching Lab v2");
      assert.deepEqual(updated.project.techStack, ["Next.js", "React"]);
    }
    const stored = storedProjects().find((p) => p.slug === "caching-lab");
    assert.equal(stored?.summary, "Updated summary.");
  });

  it("reports not-found on update", async () => {
    const updated = await updateProject("nope", {
      title: "x",
      summary: "x",
      description: "x",
      techStack: [],
      repoUrl: "",
      liveUrl: "",
    });
    assert.deepEqual(updated, { ok: false, reason: "not-found" });
  });

  it("deletes a project and reports not-found afterwards", async () => {
    const deleted = await deleteProject("caching-lab");
    assert.deepEqual(deleted, { ok: true });
    assert.equal(
      storedProjects().some((project) => project.slug === "caching-lab"),
      false,
    );
    const again = await deleteProject("caching-lab");
    assert.deepEqual(again, { ok: false, reason: "not-found" });
  });
});
