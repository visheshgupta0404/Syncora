import { useState } from "react";
import { videoId } from "./model";
import YouTubeSearch from "./YouTubeSearch";
export default function Queue({ queue, dispatch, notify, disabled }) {
  const [url, setUrl] = useState(""),
    [title, setTitle] = useState(""),
    [pending, setPending] = useState(false);
  async function add(e) {
    e.preventDefault();
    const id = videoId(url.trim());
    if (!id)
      return notify("Paste a valid YouTube link or 11-character video ID.");
    setPending(true);
    const ok = await dispatch({
      type: "add",
      payload: {
        id,
        key: crypto.randomUUID(),
        title: title.trim() || `YouTube · ${id}`,
      },
    });
    if (ok) {
      setUrl("");
      setTitle("");
    }
    setPending(false);
  }
  return (
    <>
      <YouTubeSearch
        dispatch={dispatch}
        disabled={disabled}
        full={queue.length >= 100}
        notify={notify}
      />
      <details className="paste-video">
        <summary>Paste a YouTube link</summary>
        <form onSubmit={add} className="add">
          <label>
            YouTube link
            <input
              required
              maxLength={2048}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a video link…"
            />
          </label>
          <label>
            Label (optional)
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give it a name"
            />
          </label>
          <button
            className="primary"
            disabled={disabled || pending || queue.length >= 100}
          >
            {pending ? "Adding…" : "+ Add to our queue"}
          </button>
        </form>
      </details>
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
    </>
  );
}
