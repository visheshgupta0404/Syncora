export const quickReactions = ["❤️", "😂", "🔥", "👏", "🎶", "🥹"];
export const roomThemes = [
  { id: "midnight", name: "Midnight" },
  { id: "cafe", name: "Cozy café" },
  { id: "cinema", name: "Cinema" },
];
export function validRoomTheme(value) {
  return roomThemes.some((theme) => theme.id === value) ? value : "midnight";
}
export function freshReactions(messages, seen, now = Date.now()) {
  return messages
    .filter(
      (message) =>
        !seen.has(message.id) &&
        quickReactions.includes(message.text) &&
        Number.isFinite(message.at) &&
        now - message.at >= -5000 &&
        now - message.at < 5000,
    )
    .slice(-6);
}
