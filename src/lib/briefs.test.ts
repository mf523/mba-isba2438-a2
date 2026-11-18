import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readBriefsStorage,
  serializeBriefs,
  sortBriefsNewestFirst,
  validateBriefInput,
  type Brief,
} from "./briefs";

const validInput = {
  title: "Server components post",
  contentType: "blog-post",
  audience: "Developers new to React Server Components",
  tone: "technical",
  keyPoints: "What changed\nWhy it matters\nMigration tips",
};

function makeBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    id: "id-1",
    title: "A brief",
    contentType: "blog-post",
    audience: "Readers",
    tone: "friendly",
    keyPoints: "Point one",
    createdAt: "2026-11-13T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("validateBriefInput", () => {
  it("accepts a complete brief", () => {
    assert.deepEqual(validateBriefInput(validInput), {});
  });

  it("reports every blank field", () => {
    const errors = validateBriefInput({
      title: "",
      contentType: "",
      audience: "",
      tone: "",
      keyPoints: "",
    });
    assert.match(errors.title ?? "", /required/i);
    assert.match(errors.contentType ?? "", /choose/i);
    assert.match(errors.audience ?? "", /required/i);
    assert.match(errors.tone ?? "", /choose/i);
    assert.match(errors.keyPoints ?? "", /key point/i);
  });

  it("rejects unknown type and tone values", () => {
    const errors = validateBriefInput({
      ...validInput,
      contentType: "video",
      tone: "sassy",
    });
    assert.match(errors.contentType ?? "", /choose/i);
    assert.match(errors.tone ?? "", /choose/i);
  });

  it("enforces length caps", () => {
    const errors = validateBriefInput({
      ...validInput,
      title: "x".repeat(81),
      audience: "x".repeat(121),
      keyPoints: "x".repeat(2001),
    });
    assert.match(errors.title ?? "", /80/);
    assert.match(errors.audience ?? "", /120/);
    assert.match(errors.keyPoints ?? "", /2000/);
  });
});

describe("serializeBriefs / readBriefsStorage round-trip", () => {
  it("preserves briefs through serialize → read", () => {
    const briefs = [
      makeBrief(),
      makeBrief({ id: "id-2", title: "Second", contentType: "project", tone: "professional" }),
    ];
    const state = readBriefsStorage(serializeBriefs(briefs));
    assert.equal(state.usable, true);
    assert.deepEqual(state.briefs, briefs);
  });
});

describe("readBriefsStorage tolerance", () => {
  it("treats missing and empty storage as a usable empty list", () => {
    for (const raw of [null, "", "   "]) {
      const state = readBriefsStorage(raw);
      assert.deepEqual(state, { briefs: [], usable: true, dropped: 0 });
    }
  });

  it("treats malformed JSON as unusable", () => {
    const state = readBriefsStorage("{not json");
    assert.deepEqual(state.briefs, []);
    assert.equal(state.usable, false);
  });

  it("treats valid JSON in the wrong shape as unusable", () => {
    for (const raw of ['{"nope": true}', "42", '"a string"', "true", "null"]) {
      const state = readBriefsStorage(raw);
      assert.deepEqual(state.briefs, [], `raw: ${raw}`);
      assert.equal(state.usable, false, `raw: ${raw}`);
    }
  });

  it("keeps valid briefs and reports dropped entries", () => {
    const raw = JSON.stringify([
      makeBrief({ id: "keep-me" }),
      { id: 3, title: 42 },
      { ...makeBrief({ id: "bad-tone" }), tone: "sassy" },
      makeBrief({ id: "bad-date", updatedAt: "not-a-date" }),
      "just a string",
    ]);
    const state = readBriefsStorage(raw);
    assert.deepEqual(
      state.briefs.map((brief) => brief.id),
      ["keep-me"],
    );
    assert.equal(state.usable, false);
    assert.equal(state.dropped, 4);
  });

  it("reports all-valid arrays with dropped = 0", () => {
    const state = readBriefsStorage(JSON.stringify([makeBrief()]));
    assert.equal(state.usable, true);
    assert.equal(state.dropped, 0);
  });
});

describe("sortBriefsNewestFirst", () => {
  it("sorts by updatedAt, then createdAt, descending", () => {
    const oldest = makeBrief({ id: "oldest", updatedAt: "2026-11-01T09:00:00.000Z" });
    const edited = makeBrief({
      id: "edited",
      createdAt: "2026-11-01T09:00:00.000Z",
      updatedAt: "2026-11-13T12:00:00.000Z",
    });
    const newest = makeBrief({ id: "newest", updatedAt: "2026-11-13T10:00:00.000Z" });
    const sorted = sortBriefsNewestFirst([oldest, edited, newest]);
    assert.deepEqual(
      sorted.map((brief) => brief.id),
      ["edited", "newest", "oldest"],
    );
  });

  it("does not mutate the input array", () => {
    const original = [makeBrief(), makeBrief({ id: "id-2", updatedAt: "2026-11-12T00:00:00.000Z" })];
    sortBriefsNewestFirst(original);
    assert.equal(original[0].id, "id-1");
  });
});
