import { useEffect, useRef, useState } from "react";
import { formatTime, targetPosition } from "../lib/model";
import { playbackDecision, resyncDecision } from "../lib/playerSync";
import { sleepTimerDue } from "../lib/sleepTimer";
import { playbackError } from "../lib/roomFeedback";
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
    lastCommand = useRef(0),
    resyncUntil = useRef(0);
  const [ready, setReady] = useState(false),
    [attempt, setAttempt] = useState(0),
    [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false);
  const [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [draft, setDraft] = useState(null),
    [buffering, setBuffering] = useState(false),
    [resyncing, setResyncing] = useState(false);
  useEffect(() => {
    if (!resyncing) return;
    const timer = setTimeout(() => setResyncing(false), 6000);
    return () => clearTimeout(timer);
  }, [resyncing]);
  const key = state.current?.key;
  const sleepTimer = useRef(null),
    sleeping = useRef(false);
  const [sleep, setSleep] = useState(null),
    [asleep, setAsleep] = useState(false),
    [sleepNow, setSleepNow] = useState(Date.now());
  function checkSleep(ended = false) {
    if (
      !sleeping.current &&
      sleepTimerDue(
        sleepTimer.current,
        Date.now(),
        latest.current.state.current?.key,
        ended,
      )
    ) {
      sleeping.current = true;
      sleepTimer.current = null;
      setSleep(null);
      setAsleep(true);
      suppress();
      player.current?.pauseVideo();
      latest.current.notify(
        "Sleep timer finished. Playback paused on this device only.",
      );
    }
    return sleeping.current;
  }
  useEffect(() => {
    if (!sleep) return;
    const tick = () => {
      setSleepNow(Date.now());
      checkSleep();
    };
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [sleep]);
  const scheduled = Date.now() + offset < state.at;
  function suppress() {
    suppressed.current = Date.now() + 1000;
    sample.current = null;
    nativeSeek.current = null;
  }
  function transport(playing, position, seek = false) {
    if (checkSleep()) return;
    resyncUntil.current = 0;
    const current = latest.current;
    if (
      current.disabled ||
      !current.state.current ||
      Date.now() + current.offset < current.state.at
    )
      return;
    suppress();
    lastCommand.current = Date.now();
    // Restore native local changes until the shared execution time arrives.
    const p = player.current;
    if (p && Date.now() + current.offset >= current.state.at) {
      const sharedPosition = targetPosition(
        current.state,
        Date.now() + current.offset,
      );
      if (Math.abs(p.getCurrentTime() - sharedPosition) > 1.5)
        p.seekTo(sharedPosition, true);
      if (current.state.playing) p.playVideo();
      else p.pauseVideo();
    }
    current.onAction({
      type: "transport",
      payload: {
        key: current.state.current.key,
        playing,
        seek,
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
                setBuffering(false);
                setError(playbackError(e.data));
              }
            },
            onStateChange: (e) => {
              if (!active) return;
              if (checkSleep(e.data === 0)) {
                if (e.data === 1) player.current?.pauseVideo();
                return;
              }
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
                current.disabled ||
                Date.now() < resyncUntil.current ||
                Date.now() + current.offset < current.state.at
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
                transport(e.data === 1, player.current.getCurrentTime(), true);
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
    if (!ready || !player.current) return;
    const p = player.current;
    if (checkSleep()) {
      p.pauseVideo();
      return;
    }
    resyncUntil.current = 0;
    setResyncing(false);
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
    const wait = Math.max(0, state.at - (Date.now() + offset));
    if (loaded.current !== key) {
      loaded.current = key;
      blockedRef.current = false;
      setBlocked(false);
      p.cueVideoById({
        videoId: state.current.id,
        startSeconds: state.position,
      });
    }
    const apply = () => {
      if (checkSleep()) return;
      suppress();
      const position = targetPosition(state, Date.now() + offset);
      if (Math.abs(p.getCurrentTime() - position) > 0.25)
        p.seekTo(position, true);
      if (state.playing && !blockedRef.current) p.playVideo();
      else if (!state.playing) p.pauseVideo();
    };
    if (!wait) apply();
    else {
      suppressed.current = Date.now() + wait + 1000;
      const timer = setTimeout(apply, wait);
      return () => clearTimeout(timer);
    }
  }, [key, state.playing, state.position, state.at, ready, offset]);
  useEffect(() => {
    if (!ready || !player.current) return;
    const timer = setInterval(() => {
      const p = player.current,
        c = latest.current;
      if (!p || !c.state.current) return;
      if (checkSleep()) {
        if (p.getPlayerState() === 1) p.pauseVideo();
        return;
      }
      const position = p.getCurrentTime() || 0,
        ps = p.getPlayerState(),
        now = Date.now() + c.offset;
      setTime(position);
      setDuration(p.getDuration() || 0);
      // Briefly follow the moving room timeline after a manual resync.
      // Ignore recovery events so this device cannot pause or seek the room.
      if (Date.now() < resyncUntil.current) {
        sample.current = null;
        if (!document.hidden && !blockedRef.current) {
          const correction = resyncDecision({
            state: c.state,
            position,
            playerState: ps,
            now,
          });
          if (correction) {
            suppress();
            if (correction.seek) p.seekTo(correction.position, true);
            if (correction.playing) p.playVideo();
            else p.pauseVideo();
          }
        }
        return;
      }
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
        transport(decision.playing, decision.position, decision.seek || false);
      else if (decision.type === "correct") {
        suppress();
        p.seekTo(decision.position, true);
      }
      if (ps === 3 || Date.now() < suppressed.current) sample.current = null;
      else sample.current = { position, at: now, playing: ps === 1 };
    }, 750);
    const visible = () => {
      if (checkSleep()) return;
      if (!document.hidden) {
        sample.current = null;
        if (
          latest.current.state.current &&
          !blockedRef.current &&
          Date.now() + latest.current.offset >= latest.current.state.at
        ) {
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
    transport(state.playing, position, true);
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
          {key && state.queue.some((item) => item.key !== key) && (
            <button disabled={disabled || scheduled || asleep} onClick={() => onAction({ type: "skip", payload: { key, at: state.at } })}>Skip for room</button>
          )}
          {state.current && <a href={`https://www.youtube.com/watch?v=${state.current.id}`} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>}
        </div>
      ) : null}
      {blocked ? (
        <div className="note">
          This device needs a tap before it can play sound.{" "}
          <button
            onClick={() => {
              if (checkSleep()) return;
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
          disabled={
            !ready || !key || disabled || scheduled || !duration || asleep
          }
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
          {Date.now() + offset < state.at ? " · Synchronizing…" : ""}
        </span>
      </div>
      <div className="transport">
        <button
          disabled={!key || !ready || disabled || scheduled || asleep}
          onClick={() => {
            const p = player.current;
            suppress();
            transport(!state.playing, p.getCurrentTime());
          }}
        >
          {state.playing ? "Ⅱ Pause" : "▶ Play"}
        </button>
        <button
          disabled={
            (!key && !state.queue.length) || disabled || scheduled || asleep
          }
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
          disabled={!ready || !key || scheduled || resyncing || asleep}
          onClick={() => {
            suppress();
            resyncUntil.current = Date.now() + 6000;
            setResyncing(true);
            setDraft(null);
            const pos = targetPosition(state, Date.now() + offset);
            player.current.seekTo(pos, true);
            if (state.playing) player.current.playVideo();
            else player.current.pauseVideo();
            notify(
              "Catching this device up to the room. Buffering may take a moment.",
            );
          }}
        >
          {resyncing ? "Resyncing…" : "Resync ↔"}
        </button>
        <details className="more-controls">
          <summary>More controls</summary>
          <div className="more-controls-list">
            <button
              disabled={!key || !ready || disabled || scheduled || asleep}
              onClick={() => seek(0)}
            >
              ↺ Restart video
            </button>
            <button
              disabled={!key || disabled || scheduled || asleep}
              onClick={() =>
                onAction({ type: "previous", payload: { key, at: state.at } })
              }
            >
              ↤ Previous
            </button>
            <button
              disabled={!state.queue.length || disabled || scheduled || asleep}
              onClick={() =>
                onAction({
                  type: "restart",
                  payload: { key: key || null, at: state.at },
                })
              }
            >
              Restart playlist
            </button>
            <button onClick={fullScreen}>⛶ Full screen</button>
          </div>
        </details>
      </div>
      <div className="sleep-timer">
        <label htmlFor="sleep-timer">☾ Sleep timer</label>
        <select
          id="sleep-timer"
          value={
            sleep
              ? sleep.mode === "end"
                ? "end"
                : String(sleep.minutes)
              : "off"
          }
          disabled={!key || asleep}
          onChange={(event) => {
            const value = event.target.value;
            const timer =
              value === "off"
                ? null
                : value === "end"
                  ? { mode: "end", key }
                  : {
                      mode: "time",
                      minutes: Number(value),
                      until: Date.now() + Number(value) * 60000,
                    };
            sleepTimer.current = timer;
            setSleep(timer);
            setSleepNow(Date.now());
          }}
        >
          <option value="off">Off</option>
          {[15, 30, 45, 60, 90].map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
          <option value="end">End of this video</option>
        </select>
        {sleep && (
          <span role="status">
            {sleep.mode === "end"
              ? "Pauses when this video ends or changes"
              : `${formatTime(Math.ceil(Math.max(0, sleep.until - sleepNow) / 1000))} remaining`}
          </span>
        )}
        {asleep && (
          <button
            disabled={!ready || !key}
            onClick={() => {
              sleeping.current = false;
              setAsleep(false);
              suppress();
              const position = targetPosition(state, Date.now() + offset);
              if (loaded.current !== key) {
                loaded.current = key;
                player.current?.cueVideoById({
                  videoId: state.current.id,
                  startSeconds: position,
                });
              } else player.current?.seekTo(position, true);
              if (state.playing) player.current?.playVideo();
              else player.current?.pauseVideo();
            }}
          >
            Resume this device
          </button>
        )}
        <small>
          {asleep
            ? "Sleep timer finished. This device is paused."
            : "Only affects this device. Others keep listening. Leaving or reloading clears the timer."}
        </small>
      </div>
      {resyncing ? (
        <p className="recovery-status" role="status">
          Catching up to the room.{" "}
          {buffering
            ? "Waiting for YouTube to buffer…"
            : "Checking local playback…"}
        </p>
      ) : null}
      <small className="muted">
        Shared controls use a 1.5-second sync window, including video changes.
        Buffering may still cause drift.
      </small>
    </>
  );
}
