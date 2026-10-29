import { useEffect, useRef, useState } from "react";

export default function Queue({ queue, currentKey, dispatch, disabled }) {
  const [removed, setRemoved] = useState(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 15000);
    return () => clearTimeout(timer);
  }, [removed]);
  async function remove(item) {
    if (lock.current || disabled) return;
    lock.current = true;
    setPending(true);
    try {
      if (await dispatch({ type: "remove", payload: { key: item.key } })) setRemoved(item);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function undo() {
    if (lock.current || disabled || !removed) return;
    lock.current = true;
    setPending(true);
    try {
      // Append as a new queue entry; do not resurrect a stale playback command.
      if (await dispatch({ type: "add", payload: { id: removed.id, title: removed.title, key: crypto.randomUUID() } })) setRemoved(null);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  disabled = disabled || pending;
  const currentIndex = queue.findIndex((v) => v.key === currentKey);
  return (
    <div className="queue-panel">
      <div className="panel-heading">
        <span className="eyebrow">A SOUNDTRACK TO SHARE</span>
        <h2>
          Your shared playlist{" "}
          <span className="panel-total">{queue.length}/100</span>
        </h2>
        <p>Everyone gets a say in what plays next.</p>
      </div>
      {removed && <div className="queue-undo" role="status">
        <span>Removed “{removed.title}”. Undo adds it to the end.</span>
        <button disabled={disabled || queue.length >= 100} onClick={undo}>Undo</button>
      </div>}
      <div className="queue">
        {queue.length ? (
          queue.map((v, i) => (
            <article
              key={v.key}
              className={v.key === currentKey ? "current-track" : ""}
              aria-current={v.key === currentKey ? "true" : undefined}
            >
              <div className="track">
                <span className="number">{String(i + 1).padStart(2, "0")}</span>
                <img
                  className="queue-thumbnail"
                  src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                  alt=""
                  width="80"
                  height="45"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <strong title={v.title}>
                  {v.key === currentKey ? (
                    <small className="now-playing">▶ Now playing</small>
                  ) : null}
                  {v.key !== currentKey && i === (currentKey ? 1 : 0) ? (
                    <small className="now-playing">Up next</small>
                  ) : null}
                  {v.title}
                </strong>
              </div>
              <div className="rowactions">
                <button
                  disabled={disabled}
                  onClick={() =>
                    dispatch({ type: "play", payload: { key: v.key } })
                  }
                >
                  Play
                </button>
                <button
                  disabled={
                    disabled || v.key === currentKey || i === currentIndex + 1
                  }
                  onClick={() =>
                    dispatch({
                      type: "move",
                      payload: {
                        key: v.key,
                        to:
                          currentIndex < 0
                            ? 0
                            : currentIndex + (i > currentIndex ? 1 : 0),
                      },
                    })
                  }
                >
                  Play next
                </button>
                <button
                  aria-label={`Move ${v.title} up`}
                  disabled={disabled || i === 0 || (currentKey && i === 1)}
                  onClick={() =>
                    dispatch({
                      type: "move",
                      payload: { key: v.key, to: i - 1 },
                    })
                  }
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${v.title} down`}
                  disabled={
                    disabled || v.key === currentKey || i === queue.length - 1
                  }
                  onClick={() =>
                    dispatch({
                      type: "move",
                      payload: { key: v.key, to: i + 1 },
                    })
                  }
                >
                  ↓
                </button>
                <button
                  aria-label={`Remove ${v.title}`}
                  disabled={disabled}
                  onClick={() => remove(v)}
                >
                  ×
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            ♫<h3>Make it your soundtrack</h3>
            <p>
              The queue is empty.
              <br />
              Your discoveries go here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
