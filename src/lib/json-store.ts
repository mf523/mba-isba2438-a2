import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

let queue: Promise<unknown> = Promise.resolve();

export function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export function dataDir(): string {
  return process.env.PORTFOLIO_DATA_DIR ?? path.join(process.cwd(), "data");
}

export async function readJsonStore<T>(
  file: string,
  validate: (value: unknown) => boolean,
): Promise<T | null> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Store is corrupt: ${file}`);
  }
  if (!validate(parsed)) {
    throw new Error(`Store is corrupt: ${file}`);
  }
  return parsed as T;
}

export async function writeJsonStoreAtomic<T>(
  file: string,
  data: T,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
    await rename(tempFile, file);
  } catch (error) {
    await rm(tempFile, { force: true });
    throw error;
  }
}

export interface JsonStore<T> {
  read: () => Promise<T>;
  write: (data: T) => Promise<void>;
  update: <Out>(
    mutate: (current: T) => { data: T; value: Out },
  ) => Promise<Out>;
}

export function createJsonStore<T>(config: {
  file: () => string;
  validate: (value: unknown) => value is T;
  defaults: () => T;
}): JsonStore<T> {
  async function read(): Promise<T> {
    const stored = await readJsonStore<T>(config.file(), config.validate);
    return stored ?? config.defaults();
  }

  function write(data: T): Promise<void> {
    return enqueue(() => writeJsonStoreAtomic(config.file(), data));
  }

  async function update<Out>(
    mutate: (current: T) => { data: T; value: Out },
  ): Promise<Out> {
    return enqueue(async () => {
      const { data, value } = mutate(await read());
      await writeJsonStoreAtomic(config.file(), data);
      return value;
    });
  }

  return { read, write, update };
}
