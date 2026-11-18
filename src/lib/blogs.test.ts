import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { before, describe, it } from "node:test";
import {
  addBlog,
  deleteBlog,
  getBlogs,
  updateBlog,
  validateBlogInput,
} from "./blogs";

before(() => {
  process.env.PORTFOLIO_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), "blogs-test-"),
  );
});

describe("validateBlogInput", () => {
  it("accepts a complete post", () => {
    const errors = validateBlogInput({
      title: "Hello",
      slug: "hello",
      summary: "A post",
      content: "Body text",
    });
    assert.deepEqual(errors, {});
  });

  it("reports one message per missing field", () => {
    const errors = validateBlogInput({
      title: "",
      slug: "",
      summary: "",
      content: "",
    });
    assert.match(errors.title ?? "", /required/i);
    assert.match(errors.slug ?? "", /slug/i);
    assert.match(errors.summary ?? "", /required/i);
    assert.match(errors.content ?? "", /required/i);
  });

  it("enforces length caps", () => {
    const errors = validateBlogInput({
      title: "x".repeat(81),
      slug: "ok-slug",
      summary: "x".repeat(201),
      content: "x".repeat(5001),
    });
    assert.match(errors.title ?? "", /80/);
    assert.match(errors.summary ?? "", /200/);
    assert.match(errors.content ?? "", /5000/);
  });

  it("rejects malformed slugs", () => {
    const errors = validateBlogInput({
      title: "Hello",
      slug: "Bad Slug!",
      summary: "A post",
      content: "Body",
    });
    assert.match(errors.slug ?? "", /lowercase/i);
  });
});

describe("blogs store", () => {
  it("serves the two default posts from a fresh store", async () => {
    const blogs = await getBlogs();
    assert.equal(blogs.length, 2);
    assert.deepEqual(
      blogs.map((blog) => blog.slug).sort(),
      ["building-this-portfolio", "server-forms-vs-api-routes"],
    );
  });

  it("adds a post with a timestamp and serves it back", async () => {
    const result = await addBlog({
      slug: "test-post",
      title: "Test Post",
      summary: "From the unit tests",
      content: "Paragraph one.\n\nParagraph two.",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.blog.publishedAt, /^\d{4}-\d{2}-\d{2}T/);
      const blogs = await getBlogs();
      const stored = blogs.find((blog) => blog.slug === "test-post");
      assert.equal(stored?.title, "Test Post");
    }
  });

  it("rejects a duplicate slug without changing the store", async () => {
    const before = await getBlogs();
    const result = await addBlog({
      slug: "test-post",
      title: "Another",
      summary: "Duplicate",
      content: "Body",
    });
    assert.deepEqual(result, { ok: false, reason: "duplicate-slug" });
    const after = await getBlogs();
    assert.equal(after.length, before.length);
  });

  it("updates content but keeps the slug and publish date", async () => {
    const original = (await getBlogs()).find((blog) => blog.slug === "test-post");
    const result = await updateBlog("test-post", {
      title: "Test Post v2",
      summary: "Updated summary",
      content: "Updated body.",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.blog.slug, "test-post");
      assert.equal(result.blog.title, "Test Post v2");
      assert.equal(result.blog.publishedAt, original?.publishedAt);
    }
    const stored = (await getBlogs()).find((blog) => blog.slug === "test-post");
    assert.equal(stored?.summary, "Updated summary");
  });

  it("reports not-found on update", async () => {
    const result = await updateBlog("nope", {
      title: "x",
      summary: "x",
      content: "x",
    });
    assert.deepEqual(result, { ok: false, reason: "not-found" });
  });

  it("deletes a post and reports not-found afterwards", async () => {
    const result = await deleteBlog("test-post");
    assert.deepEqual(result, { ok: true });
    assert.equal(
      (await getBlogs()).some((blog) => blog.slug === "test-post"),
      false,
    );
    assert.deepEqual(await deleteBlog("test-post"), {
      ok: false,
      reason: "not-found",
    });
  });
});
