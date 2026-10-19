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

// Local recovery only: never publish player events or seek repeatedly while buffering.
export function resyncDecision({ state, position, playerState, now }) {
  if (!state.current || now < state.at || ![1, 2].includes(playerState))
    return null;
  const target = targetPosition(state, now);
  const seek = Math.abs(position - target) > 0.25;
  if (!seek && (playerState === 1) === state.playing) return null;
  return { position: target, playing: state.playing, seek };
}
