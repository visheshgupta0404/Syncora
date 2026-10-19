export default function Queue({ queue, dispatch, disabled }) {
  return (
    <div className="queue">
      {queue.length ? (
        queue.map((v, i) => (
          <article key={v.key}>
            <div className="track">
              <span className="number">{String(i + 1).padStart(2, "0")}</span>
              <strong>{v.title}</strong>
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
                disabled={disabled || i === 0}
                onClick={() =>
                  dispatch({ type: "move", payload: { key: v.key, to: 0 } })
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
