import { useEffect, useRef, useState } from "react";

export default function LobbyAmbience() {
  const audio = useRef(null);
  const graph = useRef(null);
  const fadeTimer = useRef(null);
  const generation = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(18);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  function level(value, immediate = false) {
    const gain = graph.current?.gain.gain;
    if (!gain) return;
    const now = graph.current.context.currentTime;
    gain.cancelScheduledValues(now);
    if (immediate) gain.setValueAtTime(value, now);
    else gain.setTargetAtTime(value, now, 0.09);
  }

  useEffect(() => {
    level(playing && !muted ? volume / 100 : 0);
  }, [playing, muted, volume]);

  useEffect(() => {
    const media = audio.current;
    return () => {
      generation.current++;
      clearTimeout(fadeTimer.current);
      media.pause();
      media.removeAttribute("src");
      media.load();
      graph.current?.context.close().catch(() => {});
    };
  }, []);

  async function toggle() {
    const media = audio.current;
    clearTimeout(fadeTimer.current);
    if (playing) {
      level(0);
      setPlaying(false);
      fadeTimer.current = setTimeout(() => media.pause(), 300);
      return;
    }
    const current = ++generation.current;
    setError("");
    setLoading(true);
    try {
      if (!graph.current) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context)
          throw Error("Lobby ambience is not supported by this browser.");
        const context = new Context();
        const gain = context.createGain();
        const source = context.createMediaElementSource(media);
        source.connect(gain);
        gain.connect(context.destination);
        graph.current = { context, gain };
      }
      level(0, true);
      // Both start in this user gesture; audio is never started on page load.
      await Promise.all([graph.current.context.resume(), media.play()]);
      if (current !== generation.current) return;
      setPlaying(true);
    } catch (cause) {
      if (current !== generation.current) return;
      media.pause();
      setPlaying(false);
      setError(cause.message || "Could not play ambience. Tap to try again.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  return (
    <section className="lobby-ambience" aria-label="Optional lobby ambience">
      <audio
        ref={audio}
        src="/audio/coffee-shop-warmth.mp3"
        preload="none"
        loop
        onError={() => {
          setError(
            "The ambience could not load. Check your connection and try again.",
          );
          setLoading(false);
          setPlaying(false);
        }}
      />
      <div className="ambience-heading">
        <span aria-hidden="true">♫</span>
        <div>
          <strong>Coffee shop warmth</strong>
          <small>Optional lobby ambience</small>
        </div>
      </div>
      <button
        type="button"
        className="ambience-toggle"
        onClick={toggle}
        disabled={loading}
        aria-pressed={playing}
      >
        {loading
          ? "Loading…"
          : playing
            ? "Ⅱ Pause ambience"
            : "▷ Enable ambience"}
      </button>
      {playing ? (
        <div className="ambience-volume">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "Unmute lobby ambience" : "Mute lobby ambience"}
            aria-pressed={muted}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <label>
            Volume{" "}
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              aria-valuetext={`${volume} percent`}
            />
          </label>
          <span>{volume}%</span>
        </div>
      ) : null}
      <p className="ambience-status" role="status">
        {error ||
          (playing
            ? "Playing softly. Stops when you enter a room."
            : "Sound stays off until you choose to play.")}
      </p>
    </section>
  );
}
