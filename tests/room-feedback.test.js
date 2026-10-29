import test from "node:test";
import assert from "node:assert/strict";
import { connectionFeedback, playbackError } from "../src/lib/roomFeedback.js";
import { initialState, reduce } from "../src/lib/model.js";

test("connection feedback distinguishes network loss from fallback polling and live updates", () => {
  assert.equal(connectionFeedback("Live room", false).tone, "offline");
  assert.equal(connectionFeedback("Live room", true).tone, "connected");
  assert.equal(connectionFeedback("Connected · recovery mode", true).tone, "recovering");
  assert.equal(connectionFeedback("Reconnecting…", true).tone, "connecting");
  assert.equal(connectionFeedback("Live room", false, true).tone, "local");
});
test("YouTube errors offer the appropriate recovery guidance", () => {
  assert.match(playbackError(100), /removed or made private/);
  assert.equal(playbackError(101), playbackError(150));
  assert.match(playbackError(153), /origin/);
  assert.match(playbackError(5), /Retry/);
  assert.match(playbackError(2), /link/);
  assert.match(playbackError(999), /Retry/);
});
test("undoing removal by re-adding never restarts or replaces current playback", () => {
  const a = { id: "M7lc1UVf-VE", key: "a", title: "First" };
  const b = { ...a, key: "b", title: "Second" };
  let state = { ...initialState(), queue: [a, b], current: a, playing: true, position: 45, at: 100 };
  state = reduce(state, { type: "remove", payload: { key: "b" } }, 200);
  state = reduce(state, { type: "add", payload: { ...b, key: "restored-b" } }, 300);
  assert.equal(state.current.key, "a");
  assert.equal(state.playing, true);
  assert.equal(state.position, 45);
  assert.equal(state.at, 100);
  assert.deepEqual(state.queue.map(item => item.key), ["a", "restored-b"]);
  state = reduce(state, { type: "remove", payload: { key: "a" } }, 400);
  state = reduce(state, { type: "add", payload: { ...a, key: "restored-a" } }, 500);
  assert.equal(state.current, null);
  assert.equal(state.playing, false);
});
