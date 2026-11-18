import {
  BRIEFS_STORAGE_KEY,
  readBriefsStorage,
  serializeBriefs,
  type Brief,
} from "./briefs";

const CHANGE_EVENT = "briefs-changed";
const EMPTY_SNAPSHOT: BriefsSnapshot = { briefs: [], unreadable: false };
const UNREADABLE_SNAPSHOT: BriefsSnapshot = { briefs: [], unreadable: true };

export interface BriefsSnapshot {
  briefs: Brief[];
  unreadable: boolean;
}

export interface BriefsWriteResult {
  ok: boolean;
  error?: string;
}

const listeners = new Set<() => void>();

let memoryFallback: BriefsSnapshot | null = null;
let cachedRaw: string | null = null;
let cachedSnapshot: BriefsSnapshot = EMPTY_SNAPSHOT;

function stableSnapshot(): BriefsSnapshot {
  if (memoryFallback !== null) {
    return memoryFallback;
  }
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(BRIEFS_STORAGE_KEY);
  } catch {
    return UNREADABLE_SNAPSHOT;
  }
  if (raw !== cachedRaw) {
    const state = readBriefsStorage(raw);
    cachedRaw = raw;
    cachedSnapshot = {
      briefs: state.briefs,
      unreadable: !state.usable,
    };
  }
  return cachedSnapshot;
}

export function getBriefsSnapshot(): BriefsSnapshot {
  return stableSnapshot();
}

export function getServerBriefsSnapshot(): BriefsSnapshot {
  return EMPTY_SNAPSHOT;
}

export function subscribeToBriefs(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function writeBriefs(next: Brief[]): BriefsWriteResult {
  try {
    window.localStorage.setItem(BRIEFS_STORAGE_KEY, serializeBriefs(next));
    memoryFallback = null;
  } catch {
    memoryFallback = { briefs: next, unreadable: false };
  }
  cachedRaw = null;
  for (const listener of listeners) {
    listener();
  }
  if (memoryFallback !== null) {
    return {
      ok: false,
      error:
        "Couldn't write to this browser's storage — it may be full or disabled. Briefs show here but won't survive a refresh.",
    };
  }
  return { ok: true };
}
