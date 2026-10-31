import { useEffect, useId, useRef, useState } from "react";
import { useAccount } from "./AccountProvider";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.74 2.98-4.31 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.24-2.5c-.9.6-2.05.97-3.37.97-2.6 0-4.81-1.76-5.6-4.12H3.05v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.93a6 6 0 0 1 0-3.86V7.48H3.05a10 10 0 0 0 0 9.04l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.95c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.48l3.35 2.59A5.99 5.99 0 0 1 12 5.95Z"
      />
    </svg>
  );
}
export default function AccountPanel() {
  const account = useAccount();
  const headingId = useId();
  const menu = useRef(null);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const displayName =
    account.user?.user_metadata?.full_name ||
    account.user?.email ||
    "Your account";
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const closeOutside = (event) => {
      if (menu.current?.open && !menu.current.contains(event.target))
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  return (
    <section
      className={`account-panel ${account.signedIn ? "is-signed-in" : "is-guest"}`}
      aria-labelledby={headingId}
    >
      {account.signedIn ? (
        <>
          <div className="account-profile">
            <span className="account-avatar" aria-hidden="true">
              {displayName.trim().slice(0, 1).toUpperCase()}
            </span>
            <div className="account-identity">
              <h3 id={headingId}>{displayName}</h3>
              <span title={account.user.email}>{account.user.email}</span>
            </div>
            <details
              className="account-menu"
              ref={menu}
              onKeyDown={(event) => {
                if (event.key === "Escape" && menu.current.open) {
                  event.preventDefault();
                  menu.current.open = false;
                  menu.current.querySelector("summary")?.focus();
                }
              }}
            >
              <summary>
                Manage <span aria-hidden="true">⌄</span>
              </summary>
              <div className="account-menu-content">
                <span className="account-menu-caption">YOUR LIBRARY</span>
                <button
                  disabled={pending || account.syncing}
                  onClick={async () => {
                    setPending(true);
                    try {
                      if (await account.importDeviceLibrary())
                        setMessage("Device library imported.");
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  {pending ? "Importing…" : "Import device library"}
                  <small>Bring your device playlists into this account</small>
                </button>
                <button
                  disabled={pending || account.syncing}
                  onClick={() => account.refresh()}
                >
                  Refresh library
                </button>
                <button
                  className="account-sign-out"
                  disabled={pending || account.syncing}
                  onClick={() => account.logout()}
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
          <p
            className={`account-sync-status ${account.error ? "needs-attention" : ""}`}
            role="status"
          >
            <span
              className={
                account.syncing
                  ? "account-sync-dot is-syncing"
                  : "account-sync-dot"
              }
              aria-hidden="true"
            />
            {account.error
              ? "Sync needs attention"
              : account.syncing
                ? "Syncing your library…"
                : "Rooms & playlists saved to your account"}
          </p>
        </>
      ) : (
        <>
          <span className="account-eyebrow">YOUR SYNCORA, EVERYWHERE</span>
          <h3 id={headingId}>Pick up where you left off.</h3>
          <p className="account-description">
            Keep your rooms and playlists with you, on every device.
          </p>
          <button
            className="google-sign-in"
            disabled={!account.ready || account.authBusy}
            onClick={() => account.login()}
          >
            {account.authBusy ? (
              <span className="account-button-spinner" aria-hidden="true" />
            ) : (
              <GoogleMark />
            )}
            <span>
              {account.authBusy
                ? "Connecting to Google…"
                : "Continue with Google"}
            </span>
          </button>
        </>
      )}
      <div className="account-bottomline">
        <span>
          {account.signedIn
            ? "Only you can see your library"
            : "Optional · Guest access stays available"}
        </span>
        <a
          className="account-privacy"
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy <span aria-hidden="true">↗</span>
        </a>
      </div>
      {account.error && (
        <p className="account-error" role="alert">
          {account.error}
        </p>
      )}
      {account.transferPending && (
        <button
          className="account-retry"
          onClick={() => account.completeTransfer()}
        >
          Retry guest-room import
        </button>
      )}
      {message && (
        <p className="account-feedback" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
