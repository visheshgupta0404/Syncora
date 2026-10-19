import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { randomUUID } from "node:crypto";
let pg;
const users = Array.from({ length: 7 }, () => randomUUID());
async function identity(user = users[0], role = "authenticated") {
  await pg.exec("reset role");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
    user || "",
  ]);
  await pg.exec(`set role ${role}`);
}
async function open(code = null) {
  return (await pg.query("select * from public.open_room($1)", [code])).rows[0];
}
async function action(room, type, payload, id = randomUUID()) {
  return (
    await pg.query("select * from public.room_action($1,$2,$3::jsonb)", [
      room.id,
      id,
      JSON.stringify({ type, payload }),
    ])
  ).rows[0];
}
const track = (n) => ({
  key: String(n),
  id: "dQw4w9WgXcQ",
  title: `Track ${n}`,
});
before(async () => {
  pg = new PGlite();
  await pg.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to public;
 create schema realtime;create table realtime.messages(topic text,extension text);alter table realtime.messages enable row level security;
 grant usage on schema realtime to authenticated;grant select,insert on realtime.messages to authenticated;
 create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;`);
  const schema = await readFile(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  await pg.exec(schema);
  await pg.exec(schema); // rerunnable upgrade
});
after(async () => {
  await pg?.close();
});
beforeEach(async () => {
  await pg.exec("reset role;truncate public.rooms,public.room_limits");
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261019_scheduled_playback.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await identity();
});
test("six-member room, seventh-user rejection, outsider RLS and blocked writes", async () => {
  const r = await open();
  for (let i = 1; i < 6; i++) {
    await identity(users[i]);
    assert.equal((await open(r.code)).members.length, i + 1);
  }
  // Existing members can rejoin a full room without taking another seat.
  assert.equal((await open(r.code)).members.length, 6);
  await identity(users[6]);
  await assert.rejects(open(r.code), /maximum 6 people/);
  assert.equal((await pg.query("select * from rooms")).rows.length, 0);
  await assert.rejects(action(r, "add", track(1)), /access denied/);
  await assert.rejects(
    pg.query("update rooms set members=$1 where id=$2", [[users[6]], r.id]),
    /permission denied/,
  );
  await identity(null, "anon");
  await assert.rejects(open(), /permission denied/);
  await identity(null);
  await assert.rejects(open(), /Sign in first/);
});
test("playback commands and automatic transitions receive shared future deadlines", async () => {
  let r = await open();
  r = await action(r, "add", track(1));
  r = await action(r, "add", track(2));
  const clock = Number(
    (await pg.query("select public.room_clock() as now")).rows[0].now,
  );
  r = await action(r, "play", { key: "1" });
  assert.ok(r.state.at >= clock + 1400);
  const first = r.state.at;
  r = await action(r, "transport", { key: "1", playing: false, position: 20 });
  assert.ok(r.state.at > first);
  assert.ok(r.state.position >= 21.4 && r.state.position <= 21.7);
  r = await action(r, "transport", {
    key: "1",
    playing: true,
    position: 40,
    seek: true,
  });
  assert.equal(r.state.position, 40);
  const beforeNext = r.state.at;
  r = await action(r, "skip", { key: "1", at: r.state.at });
  assert.equal(r.state.current.key, "2");
  assert.ok(r.state.at > beforeNext);
  assert.equal(r.state.position, 0);
});
test("atomic commands, retries, stale skip and no resurrection", async () => {
  let r = await open();
  const command = randomUUID();
  r = await action(r, "add", track(1), command);
  r = await action(r, "add", track(1), command);
  assert.equal(r.state.queue.length, 1);
  r = await action(r, "add", track(2));
  r = await action(r, "move", { key: "2", to: 0 });
  assert.equal(r.state.queue[0].key, "2");
  r = await action(r, "skip", { key: null });
  assert.equal(r.state.current.key, "2");
  r = await action(r, "skip", { key: "2" });
  r = await action(r, "skip", { key: "2" });
  assert.equal(r.state.current.key, "1");
  r = await action(r, "transport", {
    key: "1",
    playing: false,
    position: 42,
    seek: true,
  });
  assert.equal(r.state.position, 42);
  assert.equal(r.state.playing, false);
  r = await action(r, "transport", { key: "old", playing: true, position: 0 });
  assert.equal(r.state.position, 42);
  r = await action(r, "add", track(3));
  r = await action(r, "remove", { key: "3" });
  r = await action(r, "play", { key: "3" });
  assert.equal(r.state.current.key, "1");
});
test("six-seat migration preserves existing two-person rooms and their history", async () => {
  let r = await open();
  await identity(users[1]);
  await open(r.code);
  r = await action(r, "add", track(1));
  r = await action(r, "chat", {
    name: "Existing member",
    text: "Keep this message",
  });
  await pg.exec("reset role");
  const schema = await readFile(
    new URL("../supabase/schema.sql", import.meta.url),
    "utf8",
  );
  const legacyOpen = schema
    .slice(
      schema.indexOf("create or replace function public.open_room("),
      schema.indexOf("\ndrop function if exists public.save_room"),
    )
    .replace(">= 6", ">= 2");
  await pg.exec(legacyOpen);
  await identity(users[2]);
  await assert.rejects(open(r.code), /maximum 6 people/);
  await pg.exec("reset role");
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261019_six_member_rooms.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pg.exec(migration);
  await pg.exec(migration);
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261019_short_room_codes.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const preserved = (await pg.query("select * from rooms where id=$1", [r.id]))
    .rows[0];
  assert.deepEqual(preserved.state, r.state);
  assert.deepEqual(preserved.members, r.members);
  assert.equal(preserved.code, r.code);
  for (let i = 2; i < 6; i++) {
    await identity(users[i]);
    assert.equal((await open(r.code)).members.length, i + 1);
  }
  await identity(users[6]);
  await assert.rejects(open(r.code), /maximum 6 people/);
  await pg.exec("reset role");
  await pg.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261019_reusable_playlist.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
test("playlist rotates finished or skipped tracks to the bottom and pins the current track", async () => {
  let r = await open();
  for (let i = 1; i <= 3; i++) r = await action(r, "add", track(i));
  r = await action(r, "play", { key: "2" });
  assert.equal(r.state.queue.length, 3);
  r = await action(r, "move", { key: "2", to: 0 });
  assert.equal(r.state.current.key, "2");
  const stale = { key: "2", at: r.state.at };
  r = await action(r, "skip", stale);
  assert.equal(r.state.current.key, "1");
  r = await action(r, "skip", stale);
  assert.equal(r.state.current.key, "1");
  r = await action(r, "previous", { key: "1", at: r.state.at });
  assert.equal(r.state.current.key, "2");
  r = await action(r, "play", { key: "3" });
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["3", "1", "2"],
  );
  r = await action(r, "skip", { key: "3", at: r.state.at });
  assert.equal(r.state.current.key, "1");
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["1", "2", "3"],
  );
  assert.equal(r.state.playing, true);
  assert.equal(r.state.queue.length, 3);
  r = await action(r, "restart", { key: "1", at: r.state.at });
  assert.equal(r.state.current.key, "1");
  assert.equal(r.state.playing, true);
  r = await action(r, "remove", { key: "1" });
  assert.equal(r.state.current, null);
  assert.equal(r.state.queue.length, 2);
});
test("rotation migration preserves entries and moves existing current to top without duplicates", async () => {
  let r = await open();
  for (let i = 1; i <= 3; i++) r = await action(r, "add", track(i));
  await pg.exec("reset role");
  await pg.query(
    "update rooms set state = state || jsonb_build_object('current', $1::jsonb) where id=$2",
    [JSON.stringify(track(2)), r.id],
  );
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261019_rotating_playlist.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pg.exec(migration);
  await pg.exec(migration);
  await identity();
  r = await open(r.code);
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["2", "1", "3"],
  );
  r = await action(r, "transport", { key: "2", playing: false, position: 40 });
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["2", "1", "3"],
  );
  r = await action(r, "skip", { key: "2", at: r.state.at });
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["1", "3", "2"],
  );
});
test("playlist migration preserves a legacy current video and is rerunnable", async () => {
  let r = await open();
  r = await action(r, "add", track(2));
  await pg.exec("reset role");
  await pg.query(
    "update rooms set state = state || jsonb_build_object('current', $1::jsonb) where id=$2",
    [JSON.stringify(track(1)), r.id],
  );
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261019_reusable_playlist.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pg.exec(migration);
  await pg.exec(migration);
  await identity();
  r = await open(r.code);
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["1", "2"],
  );
  assert.equal(r.state.current.key, "1");
});
test("short codes admit formatted input and legacy invitations remain valid", async () => {
  let r = await open();
  assert.match(r.code, /^[a-f0-9]{10}$/);
  await identity(users[1]);
  assert.equal(
    (await open(`${r.code.slice(0, 5)}-${r.code.slice(5)}`.toUpperCase())).id,
    r.id,
  );
  await pg.exec("reset role");
  const oldCode = "abcdef0123456789abcdef0123456789";
  await pg.query("update rooms set code=$1 where id=$2", [oldCode, r.id]);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261019_short_room_codes.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await pg.exec(migration);
  await pg.exec(migration);
  await identity(users[2]);
  const upgraded = await open(oldCode);
  assert.equal(upgraded.id, r.id);
  assert.match(upgraded.code, /^[a-f0-9]{10}$/);
  assert.equal(upgraded.legacy_code, oldCode);
  await assert.rejects(open("bad-code"), /Invalid room code/);
});
test("server validates payloads and stamps authors and timestamps", async () => {
  let r = await open();
  await assert.rejects(
    action(r, "add", { ...track(1), id: "bad" }),
    /Invalid video/,
  );
  await assert.rejects(
    action(r, "add", { id: "dQw4w9WgXcQ", key: "missing-title" }),
    /Invalid video/,
  );
  await assert.rejects(
    action(r, "chat", { name: "A", text: "x".repeat(501) }),
    /Invalid message/,
  );
  r = await action(r, "add", track(1));
  r = await action(r, "play", { key: "1" });
  await assert.rejects(
    action(r, "transport", { key: "1", playing: true, position: -1 }),
    /Invalid playback/,
  );
  r = await action(r, "chat", {
    name: "A",
    text: "Hello",
    sender: users[2],
    at: 0,
  });
  assert.equal(r.state.messages[0].sender, users[0]);
  assert.ok(r.state.messages[0].at > 0);
  await assert.rejects(
    pg.query("select save_room($1,0,$2)", [r.id, "{}"]),
    /does not exist/,
  );
});
test("seat release permits a replacement; final release deletes room", async () => {
  const r = await open();
  await identity(users[1]);
  await open(r.code);
  await pg.query("select leave_room($1)", [r.id]);
  await identity(users[2]);
  assert.equal((await open(r.code)).members.length, 2);
  await pg.query("select leave_room($1)", [r.id]);
  await identity();
  await pg.query("select leave_room($1)", [r.id]);
  await assert.rejects(open(r.code), /not found/);
});
test("expiry denies access and cleanup is admin-only", async () => {
  const r = await open();
  await pg.exec("reset role");
  await pg.query(
    "update rooms set expires_at=now()-interval '1 second' where id=$1",
    [r.id],
  );
  await identity();
  assert.equal((await pg.query("select * from rooms")).rows.length, 0);
  await assert.rejects(open(r.code), /expired/);
  await assert.rejects(action(r, "add", track(1)), /expired/);
  await assert.rejects(
    pg.query("select cleanup_syncora()"),
    /permission denied/,
  );
  await pg.exec("reset role");
  await pg.query("select cleanup_syncora()");
  assert.equal((await pg.query("select * from rooms")).rows.length, 0);
});
test("room creation and chat request limits are enforced", async () => {
  for (let i = 0; i < 5; i++) await open();
  await assert.rejects(open(), /five active rooms/);
  const r = (await pg.query("select * from rooms limit 1")).rows[0];
  for (let i = 0; i < 30; i++)
    await action(r, "chat", { name: "A", text: "Hello" });
  await assert.rejects(
    action(r, "chat", { name: "A", text: "One more" }),
    /Too many requests/,
  );
});
test("private presence is restricted to room members", async () => {
  const r = await open();
  await pg.query("select set_config('realtime.topic',$1,false)", [
    `room:${r.id}`,
  ]);
  await pg.query("insert into realtime.messages values($1,'presence')", [
    `room:${r.id}`,
  ]);
  assert.equal(
    (await pg.query("select * from realtime.messages")).rows.length,
    1,
  );
  await identity(users[2]);
  assert.equal(
    (await pg.query("select * from realtime.messages")).rows.length,
    0,
  );
  await assert.rejects(
    pg.query("insert into realtime.messages values($1,'presence')", [
      `room:${r.id}`,
    ]),
    /row-level security/,
  );
});
