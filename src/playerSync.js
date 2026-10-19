import { targetPosition } from "./model.js";
export function playbackDecision({
  state,
  position,
  playerState,
  previous,
  now,
  suppressed,
}) {
  if (
    !state.current ||
    now < state.at ||
    suppressed ||
    ![1, 2].includes(playerState)
  )
    return { type: "wait" };
  const playing = playerState === 1;
  // Distinguish a local seek from steady drift before correcting the device.
  if (previous && previous.playing === playing) {
    const expected =
      previous.position + (playing ? (now - previous.at) / 1000 : 0);
    if (Math.abs(position - expected) > 2)
      return { type: "publish", playing, position, seek: true };
  }
  if (playing !== state.playing) return { type: "publish", playing, position };
  const target = targetPosition(state, now);
  if (Math.abs(position - target) > 1)
    return { type: "correct", position: target };
  return { type: "wait" };
}
