import { useState } from "react";
export default function HostControls({ room, isHost, dispatch, disabled }) {
  const [pending, setPending] = useState(false);
  if (room.state.controlsVersion !== 1) return null;
  return (
    <div className="host-controls">
      {isHost ? (
        <label>
          Room controls
          <select
            value={room.state.hostOnly ? "host" : "everyone"}
            disabled={disabled || pending}
            onChange={async (event) => {
              setPending(true);
              try {
                await dispatch({
                  type: "controls",
                  payload: { hostOnly: event.target.value === "host" },
                });
              } finally {
                setPending(false);
              }
            }}
          >
            <option value="everyone">Everyone can control</option>
            <option value="host">Host controls playback & queue</option>
          </select>
        </label>
      ) : (
        <p>
          {room.state.hostOnly
            ? "The host controls playback and the queue. You can still chat and react."
            : "Everyone can control playback and the queue."}
        </p>
      )}
      <small>
        {isHost ? "You’re the host. " : ""}Hosting transfers to the next member
        only when the host releases their seat.
        {room.state.hostOnly &&
          " The host should keep Syncora open for automatic video transitions."}
      </small>
    </div>
  );
}
