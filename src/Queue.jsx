export default function Queue({ queue, currentKey, dispatch, disabled }) {
  const currentIndex = queue.findIndex((v) => v.key === currentKey);
  return (
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
              <strong>
                {v.key === currentKey ? (
                  <small className="now-playing">▶ Now playing</small>
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
                disabled={disabled || i === 0}
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
                disabled={disabled || i === queue.length - 1}
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
                onClick={() =>
                  dispatch({ type: "remove", payload: { key: v.key } })
                }
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
  );
}
