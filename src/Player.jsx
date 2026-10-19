import { useEffect, useRef, useState } from "react";
import { formatTime, targetPosition } from "./model";
import { playbackDecision } from "./playerSync";
let api;
function youtube() {
  return (api ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const script = document.createElement("script");
    const timer = setTimeout(() => {
      api = null;
      reject(
        Error(
          "YouTube took too long to load. Check your connection and retry.",
        ),
      );
    }, 15000);
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      resolve(window.YT);
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => {
      clearTimeout(timer);
      api = null;
      reject(Error("YouTube could not load. Check your connection."));
    };
    document.head.append(script);
  }));
}
export default function Player({
  state,
  onAction,
  notify,
  offset = 0,
  disabled = false,
}) {
  const container = useRef(null),
    host = useRef(null),
    player = useRef(null),
    latest = useRef({ state, onAction, notify, offset, disabled });
  latest.current = { state, onAction, notify, offset, disabled };
  const loaded = useRef(null),
    nativeSeek = useRef(null),
    suppressed = useRef(0),
    sample = useRef(null),
    blockedRef = useRef(false),
    lastCommand = useRef(0);
  const [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0),
    [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false);
  const [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [draft, setDraft] = useState(null),
    [buffering, setBuffering] = useState(false);
  const key = state.current?.key;
  function suppress() {
    suppressed.current = Date.now() + 1000;
    sample.current = null;
    nativeSeek.current = null;
  }
  function transport(playing, position) {
    const current = latest.current;
    if (current.disabled || !current.state.current) return;
    suppress();
    lastCommand.current = Date.now();
    current.onAction({
      type: "transport",
      payload: {
        key: current.state.current.key,
        playing,
        position: Math.min(604800, Math.max(0, position)),
      },
    });
  }
  useEffect(() => {
    let active = true;
    setReady(false);
    setError("");
    youtube()
      .then((YT) => {
        if (!active) return;
        const mount = document.createElement("div");
        host.current.replaceChildren(mount);
        player.current = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            origin: location.origin,
            controls: 1,
            fs: 1,
          },
          events: {
            onReady: () => {
              if (active) setReady(true);
            },
            onAutoplayBlocked: () => {
              blockedRef.current = true;
              setBlocked(true);
            },
            onError: (e) => {
              if (active) {
                setError(
                  `YouTube cannot play this video (${e.data}). It may be unavailable or disallow embeds. Skip it or try another video.`,
                );
              }
            },
            onStateChange: (e) => {
              if (!active) return;
              setBuffering(e.data === 3);
              if (e.data === 3) {
                const previous = sample.current;
                const c = latest.current;
                if (
                  previous &&
                  Date.now() >= suppressed.current &&
                  !c.disabled
                ) {
                  const expected =
                    previous.position +
                    (previous.playing
                      ? (Date.now() + c.offset - previous.at) / 1000
                      : 0);
                  const position = player.current.getCurrentTime();
                  if (Math.abs(position - expected) > 2)
                    nativeSeek.current = {
                      key: c.state.current?.key,
                      position,
                    };
                }
                sample.current = null;
                return;
              }
              const current = latest.current;
              if (e.data === 1) {
                blockedRef.current = false;
                setBlocked(false);
                setError("");
              }
              if (
                Date.now() < suppressed.current ||
                !current.state.current ||
                current.disabled
              )
                return;
              if (e.data === 0) {
                suppress();
                current.onAction({
                  type: "skip",
                  payload: {
                    key: current.state.current.key,
                    at: current.state.at,
                  },
                });
              } else if (
                [1, 2].includes(e.data) &&
                nativeSeek.current?.key === current.state.current.key
              ) {
                transport(e.data === 1, player.current.getCurrentTime());
              } else if (
                [1, 2].includes(e.data) &&
                (e.data === 1) !== current.state.playing
              )
                transport(e.data === 1, player.current.getCurrentTime());
            },
          },
        });
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      player.current?.destroy();
      player.current = null;
      loaded.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const p = player.current;
    suppress();
    setDraft(null);
    setError("");
    if (!state.current) {
      p.stopVideo();
      loaded.current = null;
      setTime(0);
      setDuration(0);
      return;
    }
    const position = targetPosition(state, Date.now() + offset);
    if (loaded.current !== key) {
      loaded.current = key;
      blockedRef.current = false;
      setBlocked(false);
      if (state.playing)
        p.loadVideoById({ videoId: state.current.id, startSeconds: position });
      else
        p.cueVideoById({ videoId: state.current.id, startSeconds: position });
    } else {
      if (Math.abs(p.getCurrentTime() - position) > 1.5)
        p.seekTo(position, true);
      if (state.playing && !blockedRef.current) p.playVideo();
      else if (!state.playing) p.pauseVideo();
    }
  }, [key, state.playing, state.position, state.at, ready, offset]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      const p = player.current,
        c = latest.current;
      if (!p || !c.state.current) return;
      const position = p.getCurrentTime() || 0,
        ps = p.getPlayerState(),
        now = Date.now() + c.offset;
      setTime(position);
      setDuration(p.getDuration() || 0);
      const decision = playbackDecision({
        state: c.state,
        position,
        playerState: ps,
        previous: sample.current,
        now,
        suppressed:
          Date.now() < suppressed.current ||
          blockedRef.current ||
          c.disabled ||
          document.hidden,
      });
      if (
        decision.type === "publish" &&
        Date.now() - lastCommand.current > 1000
      )
        transport(decision.playing, decision.position);
      else if (decision.type === "correct") {
        suppress();
        p.seekTo(decision.position, true);
      }
      if (ps === 3 || Date.now() < suppressed.current) sample.current = null;
      else sample.current = { position, at: now, playing: ps === 1 };
    }, 750);
    const visible = () => {
      if (!document.hidden) {
        sample.current = null;
        if (latest.current.state.current && !blockedRef.current) {
          suppress();
          player.current.seekTo(
            targetPosition(
              latest.current.state,
              Date.now() + latest.current.offset,
            ),
            true,
          );
        }
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [ready]);
  const seek = (value) => {
    const position = Number(value);
    setDraft(null);
    if (!Number.isFinite(position)) return;
    suppress();
    player.current?.seekTo(position, true);
    transport(state.playing, position);
  };
  async function fullScreen() {
    try {
      if (container.current.requestFullscreen)
        await container.current.requestFullscreen();
      else
        notify(
          "Use the full-screen button inside the YouTube player on iPhone.",
        );
    } catch {
      notify("Use the full-screen button inside the YouTube player.");
    }
  }
  return (
    <>
      <div className="video" ref={container}>
        <div ref={host} />
      </div>
      {error ? (
        <div className="note" role="alert">
          {error}{" "}
          <button onClick={() => setAttempt((n) => n + 1)}>Retry player</button>
        </div>
      ) : null}
      {blocked ? (
        <div className="note">
          This device needs a tap before it can play sound.{" "}
          <button
            onClick={() => {
              suppress();
              player.current?.seekTo(
                targetPosition(state, Date.now() + offset),
                true,
              );
              player.current?.playVideo();
              blockedRef.current = false;
              setBlocked(false);
            }}
          >
            Enable playback on this device
          </button>
        </div>
      ) : null}
      <div className="timeline">
        <label className="sr-only" htmlFor="seek">
          Seek position
        </label>
        <input
          id="seek"
          type="range"
          min="0"
          max={duration || 1}
          step="1"
          value={Math.min(draft ?? time, duration || 1)}
          disabled={!ready || !key || disabled || !duration}
          onChange={(e) => setDraft(Number(e.target.value))}
          onPointerUp={(e) => seek(e.currentTarget.value)}
          onKeyUp={(e) => {
            if (
              [
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
                "PageUp",
                "PageDown",
              ].includes(e.key)
            )
              seek(e.currentTarget.value);
          }}
        />
        <span>
          {formatTime(draft ?? time)} / {formatTime(duration)}
          {buffering ? " · Buffering…" : ""}
        </span>
      </div>
      <div className="transport">
        <button
          disabled={!key || !ready || disabled}
          onClick={() => {
            const p = player.current;
            suppress();
            if (state.playing) p.pauseVideo();
            else p.playVideo();
            transport(!state.playing, p.getCurrentTime());
          }}
        >
          {state.playing ? "Ⅱ Pause" : "▶ Play"}
        </button>
        <button
          disabled={!key || !ready || disabled}
          onClick={() =>
            seek(Math.max(0, player.current.getCurrentTime() - 10))
          }
        >
          −10s
        </button>
        <button
          disabled={!key || !ready || disabled}
          onClick={() =>
            seek(
              Math.min(
                duration || 604800,
                player.current.getCurrentTime() + 10,
              ),
            )
          }
        >
          +10s
        </button>
        <button
          disabled={(!key && !state.queue.length) || disabled}
          onClick={() =>
            onAction({
              type: "skip",
              payload: { key: key || null, at: state.at },
            })
          }
        >
          {key ? "Next ↦" : "Start playlist ▶"}
        </button>
        <button
          disabled={!key || disabled}
          onClick={() =>
            onAction({ type: "previous", payload: { key, at: state.at } })
          }
        >
          ↤ Previous
        </button>
        <button
          disabled={!state.queue.length || disabled}
          onClick={() =>
            onAction({
              type: "restart",
              payload: { key: key || null, at: state.at },
            })
          }
        >
          Restart playlist
        </button>
        <button
          disabled={!ready || !key}
          onClick={() => {
            suppress();
            const pos = targetPosition(state, Date.now() + offset);
            player.current.seekTo(pos, true);
            if (state.playing) player.current.playVideo();
            notify("Resynced this device to the shared playback position.");
          }}
        >
          Resync ↔
        </button>
        <button onClick={fullScreen}>⛶ Full screen</button>
        <button
          onClick={() =>
            notify(
              "Experimental PiP: use a native browser or YouTube player PiP option if offered. Syncora cannot force PiP inside YouTube’s cross-origin iframe. Background playback is not guaranteed.",
            )
          }
        >
          PiP ⧉
        </button>
      </div>
    </>
  );
}
