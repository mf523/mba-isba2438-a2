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
