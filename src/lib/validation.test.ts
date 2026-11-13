import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidEmail,
  isValidHttpUrl,
  isValidProjectSlug,
  slugify,
} from "./validation";

describe("isValidEmail", () => {
  it("accepts valid addresses", () => {
    const valid = [
      "a@b.c",
      "a@b.co",
      "first.last@example.com",
      "user+tag@sub.domain.org",
      "x_y-z@long.domain.name",
    ];
    for (const email of valid) {
      assert.equal(isValidEmail(email), true, `expected valid: ${email}`);
    }
  });

  it("rejects invalid addresses", () => {
    const invalid = [
      "",
      "plain",
      "a@b",
      "@b.com",
      "a@",
      "a b@c.com",
      "a@b ..c".replace(" ", ""),
      "a@b..c",
      "a@.com",
      "a@b.",
      "a@b.c.",
      "a b@c.com",
    ];
    for (const email of invalid) {
      assert.equal(isValidEmail(email), false, `expected invalid: ${email}`);
    }
  });
});

describe("isValidHttpUrl", () => {
  it("accepts http(s) URLs", () => {
    const valid = [
      "http://example.com",
      "https://example.com/path?query=1",
      "https://a.b.c.deep/sub/page",
    ];
    for (const url of valid) {
      assert.equal(isValidHttpUrl(url), true, `expected valid: ${url}`);
    }
  });

  it("rejects non-http and malformed URLs", () => {
    const invalid = [
      "",
      "ftp://example.com",
      "javascript:alert(1)",
      "example.com",
      "https://",
      "not a url",
    ];
    for (const url of invalid) {
      assert.equal(isValidHttpUrl(url), false, `expected invalid: ${url}`);
    }
  });
});

describe("isValidProjectSlug", () => {
  it("accepts lowercase slugs", () => {
    const valid = ["a", "abc-123", "my-resume-site", "1"];
    for (const slug of valid) {
      assert.equal(isValidProjectSlug(slug), true, `expected valid: ${slug}`);
    }
  });

  it("rejects malformed slugs", () => {
    const invalid = ["", "A", "a b", "a_b", "-lead", "trail-", "a--", "a.b"];
    for (const slug of invalid) {
      assert.equal(isValidProjectSlug(slug), false, `expected invalid: ${slug}`);
    }
  });
});

describe("slugify", () => {
  it("lowercases and dashes", () => {
    assert.equal(slugify("My Cool Project!!"), "my-cool-project");
  });

  it("collapses whitespace", () => {
    assert.equal(slugify("  A   B  "), "a-b");
  });

  it("returns empty string without alphanumerics", () => {
    assert.equal(slugify("!!! 中文 ***"), "");
  });
});
