import { useEffect, useRef, useState } from "react";

export default function LobbyAmbience() {
  const audio = useRef(null);
  const generation = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");

  async function start(media, current) {
    try {
      media.volume = 1;
      await media.play();
      if (current === generation.current) {
        setBlocked(false);
        setError("");
      }
    } catch (cause) {
      if (current !== generation.current) return;
      setBlocked(true);
      setError(
        cause.name === "NotAllowedError"
          ? ""
          : "Music could not play. Tap to retry.",
      );
    }
  }

  useEffect(() => {
    const media = audio.current;
    start(media, ++generation.current);
    return () => {
      generation.current++;
      media.pause();
      media.removeAttribute("src");
      media.load();
    };
  }, []);

  function toggle() {
    const media = audio.current;
    ++generation.current;
    if (playing && !muted && !blocked) {
      media.muted = true;
      setMuted(true);
      return;
    }
    media.muted = false;
    setMuted(false);
    setError("");
    if (media.error) media.load();
    start(media, generation.current);
  }
  const silent = muted || blocked || !playing;
  const label = error
    ? "Retry lobby music"
    : blocked || !playing
      ? "Enable lobby music"
      : muted
        ? "Unmute lobby music"
        : "Mute lobby music";
  return (
    <div className="scene-audio-control">
      <audio
        ref={audio}
        src="/audio/coffee-shop-warmth.mp3"
        preload="none"
        loop
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setBlocked(true);
          setError("Music could not load. Tap to retry.");
        }}
      />
      <button
        type="button"
        className={`scene-music-button${silent ? " is-silent" : ""}`}
        onClick={toggle}
        aria-label={label}
        aria-pressed={!silent}
        title={label}
      >
        <span aria-hidden="true">♫</span>
      </button>
      <span className="scene-music-hint" role="status">
        {error ||
          (blocked
            ? "Tap for sound"
            : muted
              ? "Sound off"
              : playing
                ? "Sound on"
                : "Starting music…")}
      </span>
    </div>
  );
}
