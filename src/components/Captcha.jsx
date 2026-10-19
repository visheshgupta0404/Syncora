import { useEffect, useRef, useState } from "react";
let loader;
function load() {
  return (loader ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    window.syncoraTurnstileReady = () => resolve(window.turnstile);
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=syncoraTurnstileReady";
    script.async = true;
    script.onerror = () => {
      loader = null;
      reject(Error("Verification could not load. Check your connection."));
    };
    document.head.append(script);
  }));
}
export default function Captcha({ siteKey, onToken, resetKey }) {
  const host = useRef(null),
    callback = useRef(onToken);
  callback.current = onToken;
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true,
      id;
    load()
      .then((t) => {
        if (!active) return;
        id = t.render(host.current, {
          sitekey: siteKey,
          theme: "dark",
          size: "flexible",
          callback: (token) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => {
            callback.current("");
            setError("Verification failed. Refresh to retry.");
          },
        });
      })
      .catch((e) => setError(e.message));
    return () => {
      active = false;
      if (id !== undefined) window.turnstile?.remove(id);
    };
  }, [siteKey, resetKey]);
  return (
    <div className="captcha">
      <div ref={host} />
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
