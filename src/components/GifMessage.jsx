import { useState } from "react";
import { getGifUrl } from "../lib/chat-media.js";

export default function GifMessage({ text }) {
  const url = getGifUrl(text);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!url) return <p>{text}</p>;
  return (
    <div className="chat-gif-message">
      {visible && !failed && (
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
