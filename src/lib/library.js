import { videoId, parseInvite } from "./model.js";

export async function appendPlaylist(tracks, dispatch, isActive) {
  let added = 0;
  for (const track of tracks) {
    if (!isActive()) break;
    if (
      !(await dispatch({
        type: "add",
        payload: { ...track, key: crypto.randomUUID() },
      }))
    )
      break;
    added++;
  }
  return added;
}

export function cleanRooms(value, now = Date.now()) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        item.id.length <= 64 &&
        !seen.has(item.id) &&
        typeof item.code === "string" &&
        parseInvite(item.code) &&
        Number.isFinite(item.lastUsed) &&
        Number.isFinite(item.expiresAt) &&
        item.expiresAt > now &&
        seen.add(item.id),
    )
    .slice(0, 20)
    .map((item) => ({
      id: item.id,
      code: parseInvite(item.code),
      name: String(item.name || "My room").slice(0, 40),
      lastUsed: item.lastUsed,
      expiresAt: item.expiresAt,
    }));
}
export function rememberRoom(rooms, room, now = Date.now()) {
  if (room.id === "demo") return cleanRooms(rooms, now);
  const previous = cleanRooms(rooms, now).find((item) => item.id === room.id);
  return cleanRooms(
    [
      {
        id: room.id,
        code: room.code,
        name: previous?.name || "My room",
        lastUsed: now,
        expiresAt: new Date(room.expires_at).getTime(),
      },
      ...cleanRooms(rooms, now).filter((item) => item.id !== room.id),
    ],
    now,
  );
}
export function cleanTracks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        videoId(item.id) === item.id &&
        typeof item.title === "string" &&
        item.title.trim(),
    )
    .slice(0, 100)
    .map((item) => ({ id: item.id, title: item.title.trim().slice(0, 120) }));
}
export function cleanPlaylists(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        item.name.trim() &&
        cleanTracks(item.tracks).length,
    )
    .slice(0, 20)
    .map((item) => ({
      id: item.id,
      name: item.name.trim().slice(0, 40),
      tracks: cleanTracks(item.tracks),
    }));
}
