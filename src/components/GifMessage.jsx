import { useEffect, useState } from "react";
import { getGifUrl, getGiphyId } from "../lib/chat-media.js";
import { gifRendition, requestGiphy } from "../lib/giphy.js";
import { getBuiltinGif } from "../lib/reactions.js";

export default function GifMessage({ text }) {
  const builtin = getBuiltinGif(text);
  const directUrl = builtin || getGifUrl(text);
  const id = getGiphyId(text);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [visible, setVisible] = useState(
    () =>
      Boolean(builtin) &&
      (typeof window === "undefined" ||
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!visible || !id) return;
    const controller = new AbortController();
    setResolvedUrl(null);
    requestGiphy(id, {}, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const url = gifRendition(result.data);
        if (!url) throw new Error("GIF unavailable");
        setResolvedUrl(url);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
          setVisible(false);
        }
      });
    return () => controller.abort();
  }, [visible, id]);
  if (!directUrl && !id) return <p>{text}</p>;
  const url = directUrl || resolvedUrl;
  return (
    <div className="chat-gif-message">
      {visible && !failed && !url && <small role="status">Loading GIF…</small>}
      {visible && !failed && url && (
        <img
          src={url}
          alt="Shared animated GIF"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setFailed(true);
            setVisible(false);
          }}
        />
      )}
      {id && <small>Powered by GIPHY</small>}
      {failed && <small>GIF unavailable. You can try loading it again.</small>}
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setVisible(!visible);
        }}
      >
        {visible ? "Hide GIF" : "View GIF"}
      </button>
    </div>
  );
}
