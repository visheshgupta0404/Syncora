export function connectionFeedback(status, online, demo = false) {
  if (demo) return { tone: "local", label: "Local demo", detail: "Changes stay in this browser." };
  if (!online) return { tone: "offline", label: "Offline", detail: "Reconnect to sync. Shared edits are unavailable." };
  if (status === "Live room") return { tone: "connected", label: "Connected", detail: "Room updates are live." };
  if (status === "Connected · recovery mode") return { tone: "recovering", label: "Recovering live connection", detail: "Room updates are checked periodically while we reconnect." };
  return { tone: "connecting", label: "Reconnecting", detail: "Restoring the live connection to your room." };
}

// YouTube IFrame API onError: https://developers.google.com/youtube/iframe_api_reference#onError
export function playbackError(code) {
  if ([101, 150].includes(Number(code))) return "This video’s owner does not allow playback inside other apps. Choose another video or watch it on YouTube.";
  if (Number(code) === 100) return "This video is unavailable. It may have been removed or made private.";
  if (Number(code) === 2) return "YouTube could not recognize this video. Check the video link or choose another.";
  if (Number(code) === 5) return "Your browser could not play this video. Retry the player or choose another video.";
  if (Number(code) === 153) return "YouTube could not verify this player’s origin. Retry, or check whether a browser privacy extension is blocking it.";
  return "YouTube could not play this video. Retry the player or choose another video.";
}
