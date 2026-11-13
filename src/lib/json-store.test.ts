import assert from "node:assert/strict";
import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, it } from "node:test";
import {
  createJsonStore,
  readJsonStore,
  writeJsonStoreAtomic,
} from "./json-store";

let dir: string;

interface Item {
  name: string;
}

function isItems(value: unknown): value is Item[] {
  return (
    Array.isArray(value) && value.every((v) => typeof (v as Item)?.name === "string")
  );
}

function makeStore() {
  return createJsonStore<Item[]>({
    file: () => path.join(dir, "items.json"),
    validate: isItems,
    defaults: () => [{ name: "default" }],
  });
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "json-store-test-"));
});

describe("json-store", () => {
  it("returns defaults when the file is missing", async () => {
    const store = makeStore();
    assert.deepEqual(await store.read(), [{ name: "default" }]);
  });

  it("writes and reads round-trip", async () => {
    const store = makeStore();
    await store.write([{ name: "alpha" }]);
    assert.deepEqual(await store.read(), [{ name: "alpha" }]);
  });

  it("throws on corrupt JSON", async () => {
    const store = makeStore();
    await writeJsonStoreAtomic(path.join(dir, "items.json"), "{not json");
    await assert.rejects(() => store.read(), /corrupt/i);
  });

  it("throws on JSON that fails validation", async () => {
    const store = makeStore();
    await writeJsonStoreAtomic(path.join(dir, "items.json"), [{ wrong: true }]);
    await assert.rejects(() => store.read(), /corrupt/i);
  });

  it("serializes concurrent updates so none are lost", async () => {
    const store = makeStore();
    await Promise.all([
      store.update((current) => ({ data: [...current, { name: "one" }], value: null })),
      store.update((current) => ({ data: [...current, { name: "two" }], value: null })),
      store.update((current) => ({ data: [...current, { name: "three" }], value: null })),
    ]);
    const names = (await store.read()).map((item) => item.name);
    assert.deepEqual(names.sort(), ["default", "one", "three", "two"]);
  });

  it("returns the mutator's value and leaves no temp files", async () => {
    const store = makeStore();
    const value = await store.update((current) => ({
      data: [...current, { name: "kept" }],
      value: current.length + 1,
    }));
    assert.equal(value, 2);
    const files = readdirSync(dir);
    assert.deepEqual(
      files.filter((f) => f.endsWith(".tmp")),
      [],
    );
  });

  it("readJsonStore returns null for a missing file", async () => {
    const missing = await readJsonStore(path.join(dir, "nope.json"), isItems);
    assert.equal(missing, null);
  });
});
