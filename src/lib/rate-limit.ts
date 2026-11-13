const MAX_FAILURES = 5;
const WINDOW_MS = 60_000;

interface AttemptRecord {
  failures: number;
  lockedUntil: number;
}

const attempts = new Map<string, AttemptRecord>();

export function isLoginAllowed(key: string, now: number = Date.now()): boolean {
  const record = attempts.get(key);
  if (!record) {
    return true;
  }
  if (record.lockedUntil > now) {
    return false;
  }
  if (record.lockedUntil > 0) {
    attempts.delete(key);
  }
  return true;
}

export function recordLoginFailure(
  key: string,
  now: number = Date.now(),
): void {
  const record = attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
  record.failures += 1;
  if (record.failures >= MAX_FAILURES) {
    record.lockedUntil = now + WINDOW_MS;
    record.failures = 0;
  }
  attempts.set(key, record);
}

export function resetLoginAttempts(key: string): void {
  attempts.delete(key);
}
