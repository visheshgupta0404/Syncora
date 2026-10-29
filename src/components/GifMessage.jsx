import { useEffect, useRef, useState } from "react";
import { getGifUrl, getGiphyId } from "../lib/chat-media.js";
import { gifRendition, requestGiphy } from "../lib/giphy.js";
import { getBuiltinGif } from "../lib/reactions.js";
import GiphyBrand from "./GiphyBrand.jsx";

export default function GifMessage({ text }) {
  const builtin = getBuiltinGif(text);
  const directUrl = builtin || getGifUrl(text);
  const id = getGiphyId(text);
  const [resolvedUrl, setResolvedUrl] = useState(null);
  const [credit, setCredit] = useState("");
  const [visible, setVisible] = useState(
    () =>
      (typeof window === "undefined" ||
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches),
  );
  const container = useRef(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!container.current || !id) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [id]);
  useEffect(() => {
    if (!visible || !id || !nearViewport || resolvedUrl) return;
    const controller = new AbortController();
    setResolvedUrl(null);
    requestGiphy(id, {}, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        const url = gifRendition(result.data);
        if (!url) throw new Error("GIF unavailable");
        setResolvedUrl(url);
        setCredit(
          String(
            result.data.user?.display_name ||
              result.data.username ||
              result.data.source_tld ||
              "",
          ).slice(0, 80),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
          setVisible(false);
        }
      });
    return () => controller.abort();
  }, [visible, id, nearViewport, resolvedUrl]);
  if (!directUrl && !id) return <p>{text}</p>;
  const url = directUrl || resolvedUrl;
  return (
    <div className="chat-gif-message" ref={container}>
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
      {id && credit && <small>{credit}</small>}
      {id && <GiphyBrand />}
      {failed && <small>GIF unavailable. You can try loading it again.</small>}
      <button
        type="button"
        onClick={() => {
          if (failed && id) setResolvedUrl(null);
          setFailed(false);
          setVisible(!visible);
        }}
      >
        {visible ? "Hide GIF" : "View GIF"}
      </button>
    </div>
  );
}
