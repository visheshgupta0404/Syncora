import { useEffect, useRef, useState } from "react";
import { appendPlaylist, cleanPlaylists, cleanTracks } from "../lib/library";
import { readSaved, save } from "../lib/storage";
import { useAccount } from "./AccountProvider";

export default function SavedPlaylists({ queue, dispatch, disabled, notify }) {
  const account = useAccount();
  const [localItems, setItems] = useState(() =>
    cleanPlaylists(readSaved("playlists")),
  );
  const items = account.signedIn
    ? cleanPlaylists(account.library.playlists)
    : localItems;
  const [name, setName] = useState("");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const active = useRef(true);
  const lock = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function persist(next) {
    if (account.signedIn) {
      if (lock.current) return false;
      lock.current = true;
      setLoading(true);
      try {
        const added = next.find(
          (item) => !items.some((existing) => existing.id === item.id),
        );
        const removed = items.find(
          (item) => !next.some((existing) => existing.id === item.id),
        );
        return added
          ? await account.mutate("save_playlist", added)
          : removed
            ? await account.mutate("delete_playlist", { id: removed.id })
            : true;
      } finally {
        lock.current = false;
        if (active.current) setLoading(false);
      }
    }
    if (!save("playlists", next)) {
      notify(
        "Device storage is unavailable. Your playlist could not be saved.",
      );
      return false;
    }
    setItems(next);
    return true;
  }
  async function load() {
    const item = items.find((item) => item.id === selected);
    if (!item || disabled || lock.current) return;
    const tracks = item.tracks.filter(
      (track) => !queue.some((existing) => existing.id === track.id),
    );
    if (!tracks.length) return notify("These videos are already in the queue.");
    if (tracks.length > 100 - queue.length)
      return notify(
        "Not enough queue space. Remove some videos before loading this playlist.",
      );
    setLoading(true);
    lock.current = true;
    let added = 0;
    try {
      added = await appendPlaylist(tracks, dispatch, () => active.current);
      if (active.current)
        notify(
          added === tracks.length
            ? `Added ${added} videos. Current playback continues.`
            : `Added ${added} of ${tracks.length} videos. Loading stopped; you can retry.`,
        );
    } finally {
      lock.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <details className="saved-playlists">
      <summary>
        Saved playlists <span>{items.length}</span>
      </summary>
      <p>
        {account.signedIn
          ? "Saved to your account across devices"
          : "Saved on this device"}
        , even after a room expires. Loading adds missing videos without
        replacing the queue.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || !queue.length || items.length >= 20) return;
          if (
            await persist([
              ...items,
              {
                id: crypto.randomUUID(),
                name: name.trim(),
                tracks: cleanTracks(queue),
              },
            ])
          ) {
            setName("");
            notify(
              account.signedIn
                ? "Playlist saved to your account."
                : "Playlist saved on this device.",
            );
          }
        }}
      >
        <label>
          Playlist name
          <input
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            placeholder="Our late-night songs"
          />
        </label>
        <button
          disabled={
            !queue.length || !name.trim() || items.length >= 20 || loading
          }
        >
          Save current queue
        </button>
      </form>
      {items.length > 0 && (
        <>
          <label>
            Your playlists
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={loading}
            >
              <option value="">Choose a playlist</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.tracks.length}{" "}
                  {item.tracks.length === 1 ? "video" : "videos"}
                </option>
              ))}
            </select>
          </label>
          <div className="library-actions">
            <button disabled={!selected || disabled || loading} onClick={load}>
              {loading ? "Working…" : "Add to this room"}
            </button>
            <button
              disabled={!selected || loading}
              onClick={async () => {
                if (await persist(items.filter((item) => item.id !== selected)))
                  setSelected("");
              }}
            >
              Delete saved copy
            </button>
          </div>
        </>
      )}
      <small>
        {account.signedIn
          ? "Synced with your account. Device-only playlists can be imported from your account panel."
          : "No cross-device sync. Clearing browser data removes saved playlists."}
      </small>
    </details>
  );
}
