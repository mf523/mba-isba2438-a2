import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isLoginAllowed,
  recordLoginFailure,
  resetLoginAttempts,
} from "./rate-limit";

describe("rate-limit", () => {
  it("allows logins before any failure", () => {
    assert.equal(isLoginAllowed("clean-key", 1000), true);
  });

  it("locks after five failures", () => {
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure("lock-key", 1000 + i);
    }
    assert.equal(isLoginAllowed("lock-key", 2000), false);
  });

  it("unlocks only after the window passes", () => {
    // lock-key: 5 failures at t=1000..1004, lockedUntil = 1004 + 60_000 = 61_004
    assert.equal(isLoginAllowed("lock-key", 61_003), false);
    assert.equal(isLoginAllowed("lock-key", 61_004), true);
  });

  it("reset clears the lockout immediately", () => {
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure("reset-key", 5000 + i);
    }
    assert.equal(isLoginAllowed("reset-key", 5005), false);
    resetLoginAttempts("reset-key");
    assert.equal(isLoginAllowed("reset-key", 5006), true);
  });

  it("re-locks after a fresh set of five failures", () => {
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure("again-key", 10_000 + i);
    }
    assert.equal(isLoginAllowed("again-key", 10_010), false);
    // first lockout expires at 70_004
    for (let i = 0; i < 5; i += 1) {
      recordLoginFailure("again-key", 80_000 + i);
    }
    assert.equal(isLoginAllowed("again-key", 80_010), false);
    assert.equal(isLoginAllowed("again-key", 140_003), false);
    assert.equal(isLoginAllowed("again-key", 140_004), true);
  });
});
