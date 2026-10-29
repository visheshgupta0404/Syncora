import { useEffect, useRef, useState } from "react";
import { gifRendition, giphyKey, requestGiphy } from "../lib/giphy.js";
import { reactions } from "../lib/reactions.js";
import GiphyBrand from "./GiphyBrand.jsx";

export default function GifSearch({ onSelect, disabled }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("builtin");
  const [localQuery, setLocalQuery] = useState("");
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
      <div className="gif-source-tabs" role="group" aria-label="GIF collection">
        <button
          type="button"
          aria-pressed={source === "builtin"}
          onClick={() => setSource("builtin")}
        >
          Reactions
        </button>
        <button
          type="button"
          aria-pressed={source === "giphy"}
          onClick={() => setSource("giphy")}
        >
          Search GIPHY
        </button>
      </div>
      {source === "builtin" ? (
        <>
          <label htmlFor="reaction-search">Find a reaction</label>
          <input
            id="reaction-search"
            placeholder="Happy, love, dance…"
            value={localQuery}
            maxLength={80}
            onChange={(event) => setLocalQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
          <div className="gif-search-results builtin-reactions">
            {reactions
              .filter((item) =>
                `${item.title} ${item.tags}`
                  .toLowerCase()
                  .includes(localQuery.toLowerCase().trim()),
              )
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  disabled={disabled}
                  aria-label={`Send ${item.title} reaction`}
                  onClick={() => onSelect(`syncora:gif:${item.id}`)}
                >
                  <picture>
                    <source
                      media="(prefers-reduced-motion: reduce)"
                      srcSet={`/gifs/${item.id}.png`}
                    />
                    <img
                      src={`/gifs/${item.id}.gif`}
                      alt={item.title}
                      loading="lazy"
                    />
                  </picture>
                </button>
              ))}
          </div>
          {!reactions.some((item) =>
            `${item.title} ${item.tags}`
              .toLowerCase()
              .includes(localQuery.toLowerCase().trim()),
          ) && (
            <p role="status">No matching reactions. Try “love” or “dance”.</p>
          )}
          <p>Syncora originals · Tap to send</p>
        </>
      ) : (
        <>
          {!giphyKey ? (
            <p role="status">
              Online GIF search needs a GIPHY key. Reactions work now—no setup
              needed.
            </p>
          ) : (
            <>
              <label htmlFor="gif-search-query">
                Find the perfect reaction
              </label>
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
              {giphyKey && !searched && (
                <p>
                  Try “happy”, “dance” or “high five”. Tap a result to send it.
                </p>
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
                    onClick={() =>
                      onSelect(`https://giphy.com/gifs/${item.id}`)
                    }
                  >
                    {gifRendition(item) && (
                      <img
                        loading="lazy"
                        src={gifRendition(item)}
                        alt={item.title || "GIF reaction"}
                        referrerPolicy="no-referrer"
                      />
                    )}
                    {(item.user?.display_name ||
                      item.username ||
                      item.source_tld) && (
                      <small className="gif-creator">
                        {String(
                          item.user?.display_name ||
                            item.username ||
                            item.source_tld,
                        ).slice(0, 80)}
                      </small>
                    )}
                  </button>
                ))}
              </div>
              <GiphyBrand />
            </>
          )}
        </>
      )}
    </section>
  );
}
