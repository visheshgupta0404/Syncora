import { useEffect, useRef, useState } from "react";
import { db } from "./backend";

function decodeTitle(value) {
  const text = document.createElement("textarea");
  text.innerHTML = value;
  return text.value.slice(0, 120);
}

export default function YouTubeSearch({ dispatch, disabled, full, notify }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(null);
  const [added, setAdded] = useState([]);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);

  async function search(event) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setMessage("");
    setItems([]);
    setAdded([]);
    try {
      const { data, error } = await db.auth.getSession();
      if (error || !data.session)
        throw Error("Join a shared room to search YouTube.");
      const response = await fetch(
        `/api/youtube-search?q=${encodeURIComponent(query.trim())}`,
        {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          signal: controller.signal,
        },
      );
      const result = await response.json().catch(() => {
        throw Error(
          "Search is unavailable here. Use the hosted Syncora app or paste a link.",
        );
      });
      if (!response.ok)
        throw Error(result.error || "Search unavailable. Please try later.");
      if (controller.signal.aborted) return;
      setItems(
        result.items.map((v) => ({
          ...v,
          title: decodeTitle(v.title),
          channel: decodeTitle(v.channel),
        })),
      );
      setMessage(
        result.items.length
          ? `${result.items.length} YouTube results`
          : "No videos found. Try another search.",
      );
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function add(video) {
    setAdding(video.id);
    try {
      const ok = await dispatch({
        type: "add",
        payload: { id: video.id, title: video.title, key: crypto.randomUUID() },
      });
      if (ok) {
        setAdded((previous) => [...previous, video.id]);
        notify("Added to the shared queue.");
      }
    } finally {
      setAdding(null);
    }
  }
  return (
    <details className="youtube-search" open>
      <summary>
        Search YouTube <span>Find a song or video</span>
      </summary>
      <section className="search-content" aria-label="Search YouTube">
        <form onSubmit={search}>
          <label>
            Search YouTube
            <input
              type="search"
              required
              maxLength={100}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Song, artist, or video…"
            />
          </label>
          <button disabled={disabled || busy || !db || !query.trim()}>
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        <p className="search-status" role="status">
          {message}
        </p>
        <div className="search-results" aria-busy={busy}>
          {items.map((video) => (
            <article key={video.id}>
              <img
                src={video.thumbnail}
                alt=""
                loading="lazy"
                width="120"
                height="68"
                referrerPolicy="no-referrer"
              />
              <div>
                <a
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {video.title}
                </a>
                <small>{video.channel}</small>
              </div>
              <button
                disabled={
                  disabled ||
                  full ||
                  adding !== null ||
                  added.includes(video.id)
                }
                onClick={() => add(video)}
                aria-label={`Add ${video.title} to queue`}
              >
                {added.includes(video.id)
                  ? "✓"
                  : adding === video.id
                    ? "Adding…"
                    : "+ Add"}
              </button>
            </article>
          ))}
        </div>
        <small className="muted search-credit">
          Results from YouTube · Searches are sent to YouTube.
        </small>
      </section>
    </details>
  );
}
