import { useEffect, useRef, useState } from "react";
import LobbyAmbience from "./LobbyAmbience";

export default function MemoryScene() {
  const scene = useRef(null);
  const [paused, setPaused] = useState(false);
  const [inactive, setInactive] = useState(document.hidden);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    const visibility = () => setInactive(document.hidden);
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    const root = scene.current;
    if (!root) return;
    let frame = 0,
      x = 0,
      y = 0;
    const reset = () => {
      root.style.setProperty("--scene-x", "0px");
      root.style.setProperty("--scene-y", "0px");
    };
    reset();
    if (paused || reduced || inactive) return;
    const paint = () => {
      frame = 0;
      root.style.setProperty("--scene-x", `${x}px`);
      root.style.setProperty("--scene-y", `${y}px`);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const pointer = (e) => {
      if (e.pointerType !== "mouse") return;
      x = (e.clientX / window.innerWidth - 0.5) * 20;
      y = (e.clientY / window.innerHeight - 0.5) * 14;
      schedule();
    };
    const scroll = () => {
      if (!matchMedia("(max-width: 700px)").matches) return;
      x = 0;
      y = Math.max(-16, Math.min(16, window.scrollY * 0.035));
      schedule();
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", pointer);
      window.removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
      reset();
    };
  }, [paused, reduced, inactive]);
  const still = paused || reduced || inactive;
  return (
    <div
      ref={scene}
      className="memory-scene cinematic-scene"
      data-motion={still ? "paused" : "playing"}
    >
      <div className="cinema-stage" aria-hidden="true">
        <div className="cinema-drift">
          <div className="cinema-picture">
            <img
              src="/art/shared-night.webp"
              srcSet="/art/shared-night-small.webp 768w, /art/shared-night.webp 1536w"
              sizes="(max-width: 700px) 90vw, 600px"
              width="1536"
              height="1024"
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="cinema-shade" />
        </div>
        <div className="cinema-orbit orbit-one" />
        <div className="cinema-orbit orbit-two" />
        <div className="cinema-dust">
          {Array.from({ length: 14 }, (_, i) => (
            <i
              key={i}
              style={{
                "--i": i,
                "--spark-y": `${30 + ((i * 13) % 55)}%`,
                "--bar-height": `${10 + ((i * 7) % 25)}px`,
              }}
            />
          ))}
        </div>
        <div className="memory-snapshot snapshot-one">
          <div />
          <span>the nights we keep.</span>
        </div>
        <div className="memory-snapshot snapshot-two">
          <div />
          <span>our kind of together.</span>
        </div>
        <div className="floating-headphones">
          <span />
          <i />
          <b />
        </div>
        <div className="floating-vinyl">
          <span />
        </div>
        <div className="cinema-tag">
          <span /> DIFFERENT PLACES. ONE LITTLE WORLD.
        </div>
        <div className="cinema-equalizer">
          {Array.from({ length: 17 }, (_, i) => (
            <i
              key={i}
              style={{
                "--i": i,
                "--spark-y": `${30 + ((i * 13) % 55)}%`,
                "--bar-height": `${10 + ((i * 7) % 25)}px`,
              }}
            />
          ))}
        </div>
        <div className="cinema-bottom">
          <span>Make this a memory.</span>
        </div>
      </div>
      <LobbyAmbience />
      <div className="memory-caption">
        <span>A little closer, wherever you are.</span>
        {!reduced ? (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={
              paused
                ? "Play decorative scene motion"
                : "Pause decorative scene motion"
            }
          >
            {paused ? "▷ Play scene" : "Ⅱ Pause scene"}
          </button>
        ) : (
          <span className="motion-static">Still moments</span>
        )}
      </div>
    </div>
  );
}
