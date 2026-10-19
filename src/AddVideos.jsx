import { useState } from "react";
import { videoId } from "./model";
import YouTubeSearch from "./YouTubeSearch";
export default function AddVideos({ queue, dispatch, notify, disabled }) {
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
    </>
  );
}
