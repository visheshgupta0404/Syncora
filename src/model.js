export const ROOM_CAPACITY = 6;

export function videoId(input) {
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const u = new URL(input);
    if (
      !["https:", "http:"].includes(u.protocol) ||
      ![
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(u.hostname)
    )
      return null;
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.searchParams.get("v") ||
          u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return /^[\w-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}
export const initialState = () => ({
  queue: [],
  current: null,
  playing: false,
  position: 0,
  at: 0,
  messages: [],
});
// Local demo mirrors the database's authoritative command semantics.
export function reduce(state, { type, payload: p }, now = Date.now()) {
  const s = structuredClone(state);
  if (type === "add") {
    if (s.queue.length >= 100) throw Error("Queue is full");
    if (
      !/^[\w-]{11}$/.test(p?.id || "") ||
      !p?.key ||
      !p.title?.trim() ||
      p.title.length > 120
    )
      throw Error("Invalid video");
    if (s.queue.some((v) => v.key === p.key) || s.current?.key === p.key)
      throw Error("Duplicate queue item");
    s.queue.push(p);
  } else if (["remove", "move", "play"].includes(type)) {
    const i = s.queue.findIndex((v) => v.key === p?.key);
    if (i < 0) return s;
    const [item] = s.queue.splice(i, 1);
    if (type === "move")
      s.queue.splice(Math.max(0, Math.min(p.to, s.queue.length)), 0, item);
    if (type === "play")
      Object.assign(s, { current: item, playing: true, position: 0, at: now });
  } else if (type === "skip") {
    if ((p?.key ?? null) !== (s.current?.key ?? null)) return s;
    s.current = s.queue.shift() || null;
    Object.assign(s, { playing: !!s.current, position: 0, at: now });
  } else if (type === "transport") {
    if (!s.current || p?.key !== s.current.key) return s;
    if (
      !Number.isFinite(p.position) ||
      p.position < 0 ||
      p.position > 604800 ||
      typeof p.playing !== "boolean"
    )
      throw Error("Invalid playback command");
    Object.assign(s, { playing: p.playing, position: p.position, at: now });
  } else if (type === "chat") {
    if (
      !p?.text?.trim() ||
      p.text.length > 500 ||
      !p.name?.trim() ||
      p.name.length > 30
    )
      throw Error("Invalid message");
    s.messages = [...s.messages, { ...p, at: now }].slice(-100);
  } else throw Error("Unknown command");
  return s;
}
export function targetPosition(s, now = Date.now()) {
  return Math.max(
    0,
    s.position + (s.playing ? Math.max(0, now - s.at) / 1000 : 0),
  );
}
export function parseInvite(value) {
  const text = value.trim();
  try {
    return (
      new URL(text).hash.match(/^#room=([a-f0-9]{32})$/i)?.[1]?.toLowerCase() ||
      null
    );
  } catch {
    return /^[a-f0-9]{32}$/i.test(text) ? text.toLowerCase() : null;
  }
}
export function formatTime(seconds) {
  const n = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
