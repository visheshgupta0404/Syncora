// Opt-in hosted check. Creates seven guest identities; deletes its room afterward.
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
try {
  process.loadEnvFile(".env.local");
} catch {}
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key)
  throw Error("Configure .env.local before running the hosted check.");
if (process.env.VITE_TURNSTILE_SITE_KEY)
  throw Error(
    "Use manual browser acceptance with CAPTCHA enabled; this script does not solve challenges.",
  );
const clients = Array.from({ length: 7 }, () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }),
);
let room, channel, receiveChange;
async function rpc(client, name, args) {
  const secured = ["open_room", "room_action"].includes(name);
  const { data, error } = await client
    .rpc(
      secured ? "secure_room_request" : name,
      secured
        ? { operation: name === "open_room" ? "open" : "action", ...args }
        : args,
    )
    .abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  if (secured && data?.error) throw Error(data.error);
  return secured ? data.data : data;
}
async function edit(client, type, payload, id = randomUUID()) {
  return rpc(client, "room_action", {
    room_id: room.id,
    command_id: id,
    action: { type, payload },
  });
}
try {
  for (const c of clients) {
    const { data, error } = await c.auth.signInAnonymously();
    if (error) throw error;
    await c.realtime.setAuth(data.session.access_token);
  }
  console.log("PASS: seven independent guest sessions");
  room = await rpc(clients[0], "open_room", { invite: null });
  assert.match(room.code, /^[a-f0-9]{10}$/);
  for (let i = 1; i < 6; i++) {
    const joined = await rpc(clients[i], "open_room", {
      invite: `${room.code.slice(0, 5)}-${room.code.slice(5)}`.toUpperCase(),
    });
    assert.equal(joined.members.length, i + 1);
  }
  await assert.rejects(
    rpc(clients[6], "open_room", { invite: room.code }),
    (e) => e.message.includes("maximum 6 people"),
  );
  const outsider = await clients[6]
    .from("rooms")
    .select("id")
    .eq("id", room.id);
  assert.ifError(outsider.error);
  assert.equal(outsider.data.length, 0);
  console.log(
    "PASS: six-member admission, seventh-user rejection and RLS isolation",
  );
  const subscribed = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Private realtime subscription timed out")),
      20000,
    );
    channel = clients[1]
      .channel(`room:${room.id}`, {
        config: {
          private: true,
          presence: { key: "acceptance-check" },
          postgres_changes_options: { wait: true, timeout: 15000 },
        },
      })
      .on("system", {}, (payload) =>
        console.log("Realtime:", payload.message || payload.status),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (e) => receiveChange?.(e),
      )
      .on("presence", { event: "sync" }, () => {})
      .subscribe((s, error) => {
        if (s === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        }
        if (s === "CHANNEL_ERROR") {
          clearTimeout(timer);
          reject(
            Error(
              "Private realtime authorization failed: " +
                (error?.message || "unknown error"),
            ),
          );
        }
      });
  });
  await subscribed;
  assert.equal(
    await channel.track({ online_at: new Date().toISOString() }),
    "ok",
  );
  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Realtime change was not delivered")),
      15000,
    );
    receiveChange = (e) => {
      if (e.new.state.queue.some((t) => t.key === "live-test")) {
        clearTimeout(timer);
        resolve();
      }
    };
  });
  const track = {
    key: "live-test",
    id: "M7lc1UVf-VE",
    title: "Hosted acceptance test",
  };
  const command = randomUUID();
  await edit(clients[0], "add", track, command);
  await received;
  let r = await edit(clients[0], "add", track, command);
  assert.equal(r.state.queue.length, 1);
  console.log(
    "PASS: private realtime, presence, change delivery and retry deduplication",
  );
  const beforePlay = await rpc(clients[0], "room_clock");
  r = await edit(clients[1], "play", { key: track.key });
  assert.ok(r.state.at >= beforePlay + 1400);
  assert.equal(r.state.current.key, track.key);
  assert.equal(r.state.queue.length, 1);
  const ended = { key: track.key, at: r.state.at };
  r = await edit(clients[0], "skip", ended);
  assert.equal(r.state.playing, false);
  assert.equal(r.state.queue.length, 1);
  r = await edit(clients[1], "restart", { key: track.key, at: r.state.at });
  assert.equal(r.state.playing, true);
  r = await edit(clients[0], "skip", ended);
  assert.equal(r.state.playing, true);
  console.log(
    "PASS: persistent playlist, stop at end, restart and stale-end rejection",
  );
  r = await edit(clients[0], "transport", {
    key: track.key,
    playing: false,
    position: 30,
    seek: true,
  });
  assert.equal(r.state.position, 30);
  const secondTrack = {
    ...track,
    key: "live-second",
    title: "Second rotation test",
  };
  await edit(clients[0], "add", secondTrack);
  r = await edit(clients[1], "skip", { key: track.key, at: r.state.at });
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["live-second", "live-test"],
  );
  assert.equal(r.state.current.key, "live-second");
  assert.ok(r.state.at > beforePlay + 1400);
  r = await edit(clients[0], "skip", {
    key: r.state.current.key,
    at: r.state.at,
  });
  assert.deepEqual(
    r.state.queue.map((v) => v.key),
    ["live-test", "live-second"],
  );
  console.log(
    "PASS: shared rotation keeps current first and moves skipped tracks last",
  );
  await Promise.all(
    clients.slice(0, 6).map((c, i) =>
      edit(c, "chat", {
        name: `Listener ${i + 1}`,
        text: `Hosted test ${i + 1}`,
      }),
    ),
  );
  const read = await clients[1]
    .from("rooms")
    .select("*")
    .eq("id", room.id)
    .single();
  assert.ifError(read.error);
  assert.equal(read.data.state.messages.length, 6);
  console.log(
    "PASS: play, pause/seek, six-member concurrent chat and persisted state readback",
  );
  await rpc(clients[1], "leave_room", { room_id: room.id });
  const replacement = await rpc(clients[6], "open_room", { invite: room.code });
  assert.equal(replacement.members.length, 6);
  console.log("PASS: seat release and replacement membership");
} finally {
  if (channel) await clients[1].removeChannel(channel);
  if (room)
    for (const c of clients) {
      try {
        await rpc(c, "leave_room", { room_id: room.id });
      } catch {}
    }
  for (const c of clients) {
    await c.removeAllChannels();
    await c.auth.signOut();
  }
  console.log(
    "Hosted test room released; guest Auth identities remain for administrator review.",
  );
}
