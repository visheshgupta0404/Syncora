import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanRooms,
  rememberRoom,
  cleanPlaylists,
  cleanTracks,
} from "../src/lib/library.js";
test("recent rooms stay distinct, bounded, private to storage and expire by last known expiry", () => {
  const room = {
    id: "a",
    code: "aabbccddee",
    expires_at: new Date(5000).toISOString(),
  };
  let rooms = rememberRoom([], room, 1000);
  rooms[0].name = "Friends";
  rooms = rememberRoom(rooms, { ...room, id: "b", code: "1122334455" }, 2000);
  assert.equal(rooms.length, 2);
  rooms = rememberRoom(rooms, room, 3000);
  assert.equal(rooms[0].name, "Friends");
  assert.equal(rooms[0].lastUsed, 3000);
  assert.equal(cleanRooms(rooms, 5000).length, 0);
  assert.equal(cleanRooms([null, {}, ...rooms], 4000).length, 2);
  assert.equal(rememberRoom(rooms, { id: "demo" }, 4000).length, 2);
});
test("saved playlists discard malformed content and retain only reusable video metadata", () => {
  const tracks = cleanTracks([
    { id: "M7lc1UVf-VE", title: " Track ", key: "private", sender: "private" },
    null,
    { id: "https://evil.test", title: "x" },
  ]);
  assert.deepEqual(tracks, [{ id: "M7lc1UVf-VE", title: "Track" }]);
  assert.equal(cleanTracks(Array(110).fill(tracks[0])).length, 100);
  assert.equal(
    cleanPlaylists([
      { id: "1", name: "Mix", tracks },
      { id: "2", name: "Empty", tracks: [] },
    ]).length,
    1,
  );
  assert.deepEqual(cleanPlaylists(null), []);
});

test("playlist loading stops when the listener switches rooms or a command fails", async () => {
  const { appendPlaylist } = await import("../src/lib/library.js");
  const tracks = [
    { id: "M7lc1UVf-VE", title: "One" },
    { id: "M7lc1UVf-VE", title: "Two" },
  ];
  let active = true,
    calls = [];
  const added = await appendPlaylist(
    tracks,
    async (action) => {
      calls.push(action);
      active = false;
      return true;
    },
    () => active,
  );
  assert.equal(added, 1);
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].payload.key, "string");
  assert.equal(
    await appendPlaylist(
      tracks,
      async () => false,
      () => true,
    ),
    0,
  );
  assert.deepEqual(
    cleanRooms([{ id: "a", code: {}, lastUsed: 1, expiresAt: 5000 }], 1000),
    [],
  );
});
