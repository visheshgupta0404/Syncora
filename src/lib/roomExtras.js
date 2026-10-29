export const quickReactions = ["❤️", "😂", "🔥", "👏", "🎶", "🥹"];
export const roomThemes = [
  { id: "midnight", name: "Midnight", mood: "City lights. Rainy nights. Your people." },
  { id: "cafe", name: "Cozy café", mood: "Warm lights. Slow sips. One more song." },
  { id: "cinema", name: "Cinema", mood: "Lights down. Settle in. Share the story." },
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
