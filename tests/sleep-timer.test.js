import test from "node:test";
import assert from "node:assert/strict";
import { sleepTimerDue } from "../src/lib/sleepTimer.js";

test("sleep deadlines use wall-clock time and survive delayed callbacks", () => {
  const timer = { mode: "time", until: 10000 };
  assert.equal(sleepTimerDue(timer, 9999, "a"), false);
  assert.equal(sleepTimerDue(timer, 10000, "a"), true);
  assert.equal(sleepTimerDue(timer, 60000, "b"), true);
  assert.equal(sleepTimerDue(null, 60000, "a", true), false);
});

test("end-of-video sleep also stops when the room moves to another track", () => {
  const timer = { mode: "end", key: "a" };
  assert.equal(sleepTimerDue(timer, 100, "a"), false);
  assert.equal(sleepTimerDue(timer, 100, "a", true), true);
  assert.equal(sleepTimerDue(timer, 100, "b"), true);
  assert.equal(sleepTimerDue(timer, 100, undefined), true);
});
