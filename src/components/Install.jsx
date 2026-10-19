import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
export default function Install({ notify }) {
  const [prompt, setPrompt] = useState(null),
    [installed, setInstalled] = useState(
      matchMedia("(display-mode: standalone)").matches,
    );
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const before = (e) => {
        e.preventDefault();
        setPrompt(e);
      },
      done = () => {
        setPrompt(null);
        setInstalled(true);
      };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return (
    <div className="install-actions">
      {needRefresh ? (
        <button
          onClick={() => {
            if (!document.hidden) updateServiceWorker(true);
          }}
        >
          Update available · reload
        </button>
      ) : null}
      {!installed ? (
        <button
          onClick={async () => {
            if (prompt) {
              await prompt.prompt();
              const { outcome } = await prompt.userChoice;
              if (outcome === "accepted") setPrompt(null);
            } else
              notify(
                "Install Syncora: on Android, choose Install app in your browser menu. On iPhone, use Safari → Share → Add to Home Screen. Installation requires HTTPS.",
              );
          }}
        >
          Install app ↓
        </button>
      ) : (
        <span className="muted">Installed ✓</span>
      )}
    </div>
  );
}
