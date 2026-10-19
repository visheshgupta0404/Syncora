import { test } from "node:test";
import assert from "node:assert/strict";
import {
  videoId,
  reduce,
  initialState,
  targetPosition,
  parseInvite,
  formatTime,
  formatRoomCode,
} from "../src/lib/model.js";
import { playbackDecision, resyncDecision } from "../src/lib/playerSync.js";
const track = (n) => ({
  key: String(n),
  id: "dQw4w9WgXcQ",
  title: `Track ${n}`,
});
test("YouTube links accept video formats and reject lookalike domains/protocols", () => {
  for (const link of [
    "https://youtu.be/dQw4w9WgXcQ?t=2",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "dQw4w9WgXcQ",
  ])
    assert.equal(videoId(link), "dQw4w9WgXcQ");
  for (const link of [
    "https://evil.test/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
    "garbage",
  ])
    assert.equal(videoId(link), null);
});
test("queue edits and play-next preserve playback; stale commands cannot resurrect removed tracks", () => {
  let s = initialState();
  for (let i = 0; i < 3; i++) s = reduce(s, { type: "add", payload: track(i) });
  s = reduce(s, { type: "move", payload: { key: "2", to: 0 } });
  assert.deepEqual(
    s.queue.map((x) => x.key),
    ["2", "0", "1"],
  );
  s = reduce(s, { type: "skip", payload: { key: null } });
  assert.equal(s.current.key, "2");
  s = reduce(s, { type: "remove", payload: { key: "0" } });
  s = reduce(s, { type: "play", payload: { key: "0" } });
  assert.equal(s.current.key, "2");
  s = reduce(s, { type: "skip", payload: { key: "2" } });
  assert.equal(s.current.key, "1");
  s = reduce(s, { type: "skip", payload: { key: "2" } });
  assert.equal(s.current.key, "1");
  s = reduce(s, { type: "skip", payload: { key: "1" } });
  assert.equal(s.current.key, "2");
  assert.equal(s.queue.length, 2);
  assert.equal(s.playing, true);
  assert.deepEqual(
    s.queue.map((v) => v.key),
    ["2", "1"],
  );
});
test("transport rejects old-track events and invalid positions", () => {
  const s = { ...initialState(), current: track(1) };
  assert.equal(
    reduce(s, {
      type: "transport",
      payload: { key: "old", playing: true, position: 10 },
    }).playing,
    false,
  );
  assert.throws(() =>
    reduce(s, {
      type: "transport",
      payload: { key: "1", playing: true, position: NaN },
    }),
  );
  assert.equal(
    targetPosition({ position: 10, playing: true, at: 1000 }, 4000),
    13,
  );
  assert.equal(
    targetPosition({ position: 10, playing: false, at: 1000 }, 4000),
    10,
  );
});
test("chat and queue have bounds and reject invalid content", () => {
  let s = initialState();
  for (let i = 0; i < 105; i++)
    s = reduce(s, {
      type: "chat",
      payload: { id: i, text: "Hello", name: "A" },
    });
  assert.equal(s.messages.length, 100);
  assert.equal(s.messages[0].id, 5);
  assert.throws(() =>
    reduce(s, { type: "chat", payload: { name: "A", text: " ".repeat(5) } }),
  );
  for (let i = 0; i < 100; i++)
    s = reduce(s, { type: "add", payload: track(i) });
  assert.throws(() => reduce(s, { type: "add", payload: track(100) }), /full/);
});
test("invitation parsing uses fragments and validates code length", () => {
  assert.equal(formatRoomCode("a1b2c3d4e5"), "A1B2C-3D4E5");
  assert.equal(parseInvite("A1B2C-3D4E5"), "a1b2c3d4e5");
  assert.equal(
    parseInvite("https://syncora.example/#room=a1b2c3d4e5"),
    "a1b2c3d4e5",
  );
  const code = "abcdef0123456789abcdef0123456789";
  assert.equal(parseInvite(`https://syncora.example/#room=${code}`), code);
  assert.equal(parseInvite(code.toUpperCase()), code);
  assert.equal(parseInvite("short"), null);
  assert.equal(formatTime(125), "2:05");
});
test("playback correction distinguishes a seek, drift, buffering and blocked playback", () => {
  const state = {
    ...initialState(),
    current: track(1),
    position: 10,
    playing: true,
    at: 1000,
  };
  const base = {
    state,
    position: 20,
    playerState: 1,
    previous: null,
    now: 2000,
    suppressed: false,
  };
  assert.equal(playbackDecision(base).type, "correct");
  assert.equal(
    playbackDecision({
      ...base,
      previous: { position: 10, at: 1000, playing: true },
    }).type,
    "publish",
  );
  assert.equal(playbackDecision({ ...base, playerState: 3 }).type, "wait");
  assert.equal(playbackDecision({ ...base, suppressed: true }).type, "wait");
  assert.equal(playbackDecision({ ...base, position: 11 }).type, "wait");
  assert.equal(
    playbackDecision({ ...base, state: { ...state, at: 4000 } }).type,
    "wait",
  );
  assert.equal(targetPosition({ ...state, at: 4000 }, 2000), 10);
  assert.equal(playbackDecision({ ...base, position: 12.2 }).type, "correct");
});

test("manual resync catches a moving timeline after buffering and restores pause locally", () => {
  const state = {
    ...initialState(),
    current: track(1),
    playing: true,
    position: 10,
    at: 1000,
  };
  const base = { state, position: 10, playerState: 1, now: 2000 };
  assert.deepEqual(resyncDecision(base), {
    position: 11,
    playing: true,
    seek: true,
  });
  assert.equal(resyncDecision({ ...base, playerState: 3 }), null);
  assert.deepEqual(resyncDecision({ ...base, now: 5000 }), {
    position: 14,
    playing: true,
    seek: true,
  });
  assert.equal(resyncDecision({ ...base, position: 10.9 }), null);
  assert.deepEqual(
    resyncDecision({ ...base, state: { ...state, playing: false } }),
    { position: 10, playing: false, seek: false },
  );
  assert.equal(resyncDecision({ ...base, now: 500 }), null);
  assert.equal(
    resyncDecision({ ...base, state: { ...state, current: null } }),
    null,
  );
});
