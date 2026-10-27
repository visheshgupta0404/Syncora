import { useEffect, useRef, useState } from "react";
import { gifRendition, giphyKey, requestGiphy } from "../lib/giphy.js";

export default function GifSearch({ onSelect, disabled }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search() {
    if (!query.trim() || busy || disabled) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError("");
    setItems([]);
    setSearched(true);
    try {
      const result = await requestGiphy(
        "search",
        { q: query.trim(), limit: "12", rating: "g", lang: "en" },
        { signal: current.signal },
      );
      if (!current.signal.aborted)
        setItems(Array.isArray(result.data) ? result.data : []);
    } catch (cause) {
      if (!current.signal.aborted)
        setError(cause.message || "GIF search is unavailable.");
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="gif-search" aria-label="Search GIFs">
      <label htmlFor="gif-search-query">Find the perfect reaction</label>
      <div className="gif-search-input">
        <input
          id="gif-search-query"
          placeholder="Search GIFs…"
          maxLength={80}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              search();
            }
          }}
        />
        <button
          type="button"
          onClick={search}
          disabled={busy || disabled || !query.trim() || !giphyKey}
        >
          Search
        </button>
      </div>
      {!giphyKey && (
        <p role="status">
          GIF search is awaiting setup. Paste a direct GIF link below for now.
        </p>
      )}
      {giphyKey && !searched && (
        <p>Try “happy”, “dance” or “high five”. Tap a result to send it.</p>
      )}
      {busy && <p role="status">Finding GIFs…</p>}
      {error && <p role="alert">{error}</p>}
      {searched && !busy && !error && !items.length && (
        <p role="status">No GIFs found. Try another search.</p>
      )}
      <div className="gif-search-results">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={
              disabled ||
              !gifRendition(item) ||
              !/^[a-zA-Z0-9]{1,80}$/.test(item.id)
            }
            aria-label={`Send ${item.title || "GIF"}`}
            onClick={() => onSelect(`https://giphy.com/gifs/${item.id}`)}
          >
            {gifRendition(item) && (
              <img
                loading="lazy"
                src={gifRendition(item)}
                alt={item.title || "GIF reaction"}
                referrerPolicy="no-referrer"
              />
            )}
          </button>
        ))}
      </div>
      <a
        className="giphy-attribution"
        href="https://giphy.com/"
        target="_blank"
        rel="noreferrer"
      >
        Powered by GIPHY
      </a>
    </section>
  );
}
