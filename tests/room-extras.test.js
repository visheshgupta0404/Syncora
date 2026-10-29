import test from "node:test";
import assert from "node:assert/strict";
import { freshReactions, validRoomTheme } from "../src/lib/roomExtras.js";

test("quick reactions ignore replayed, stale, malformed and non-reaction messages", () => {
  const messages = [
    { id: "old", text: "❤️", at: 9900 },
    { id: "new", text: "🔥", at: 9950 },
    { id: "stale", text: "😂", at: 1000 },
    { id: "bad-time", text: "👏", at: "wrong" },
    { id: "future", text: "🎶", at: 30000 },
    { id: "chat", text: "Hello", at: 9999 },
  ];
  assert.deepEqual(
    freshReactions(messages, new Set(["old"]), 10000).map((item) => item.id),
    ["new"],
  );
  assert.equal(
    freshReactions(
      Array.from({ length: 20 }, (_, id) => ({ id, text: "🔥", at: 9999 })),
      new Set(),
      10000,
    ).length,
    6,
  );
});

test("room theme preference only accepts supported palettes", () => {
  assert.equal(validRoomTheme("cafe"), "cafe");
  assert.equal(validRoomTheme("cinema"), "cinema");
  for (const value of [null, "", "invalid", "url(evil)"])
    assert.equal(validRoomTheme(value), "midnight");
});
