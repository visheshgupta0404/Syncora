import { useEffect, useState } from "react";
import { useAccount } from "./AccountProvider";
export default function AccountPanel() {
  const account = useAccount();
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  return (
    <section className="account-panel" aria-label="Your Syncora account">
      <a
        className="account-privacy"
        href="/privacy.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        Privacy
      </a>
      {account.signedIn ? (
        <>
          <strong>
            {account.user.user_metadata?.full_name ||
              account.user.email ||
              "Your account"}
          </strong>
          <small>
            {account.syncing
              ? "Syncing your rooms and playlists…"
              : "Your rooms and playlists are saved to your account."}
          </small>
          <div className="library-actions">
            <button
              disabled={pending || account.syncing}
              onClick={async () => {
                setPending(true);
                try {
                  if (await account.importDeviceLibrary())
                    setMessage(
                      "Device playlists and available room nicknames imported.",
                    );
                } finally {
                  setPending(false);
                }
              }}
            >
              Import device library
            </button>
            <button disabled={pending} onClick={() => account.refresh()}>
              Refresh
            </button>
            <button
              disabled={pending || account.syncing}
              onClick={() => account.logout()}
            >
              Sign out
            </button>
          </div>
        </>
      ) : (
        <>
          <strong>Keep your moments across devices</strong>
          <p>
            Sign in to find your rooms and saved playlists on your phone or
            computer. Guest access stays available.
          </p>
          <button
            className="google-sign-in"
            disabled={!account.ready || account.authBusy}
            onClick={() => account.login()}
          >
            {account.authBusy ? "Opening Google…" : "Continue with Google"}
          </button>
        </>
      )}
      {account.error && <p role="alert">{account.error}</p>}
      {account.transferPending && (
        <button onClick={() => account.completeTransfer()}>
          Retry importing guest rooms
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
