import React, {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { captchaSiteKey, db } from "./backend";
import { parseInvite, formatRoomCode, ROOM_CAPACITY } from "./model";
import { readSaved, save } from "./storage";
import { useRoom } from "./useRoom";
import Player from "./Player";
import Queue from "./Queue";
import AddVideos from "./AddVideos";
import Chat from "./Chat";
import Captcha from "./Captcha";
import Install from "./Install";
import "./style.css";

class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="shell landing">
        <h1>Let’s reconnect.</h1>
        <p>
          Syncora could not display this room. Reload to recover your session.
        </p>
        <button onClick={() => location.reload()}>Reload Syncora</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function App() {
  const [notice, setNoticeState] = useState(null),
    [name, setName] = useState(() => readSaved("name", "You"));
  const setNotice = useCallback(
    (message) => setNoticeState(message ? { message } : null),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNoticeState(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [code, setCode] = useState(() => parseInvite(location.href) || ""),
    [token, setToken] = useState(""),
    [captchaReset, setCaptchaReset] = useState(0),
    [hasSession, setHasSession] = useState(false);
  const [tab, setTab] = useState("search");
  const inviteDialog = useRef(null),
    helpDialog = useRef(null);
  const session = useRoom(setNotice),
    { room, state, busy, status, online, offset, presence, dispatch } = session;
  const demo = room?.id === "demo",
    disabled = !!room && !demo && (!online || busy);
  useEffect(() => {
    save("name", name);
  }, [name]);
  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => setHasSession(!!data.session));
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, s) => setHasSession(!!s));
    return () => subscription.unsubscribe();
  }, []);
  const verificationRequired = !!captchaSiteKey && !hasSession;
  async function open(invite) {
    await session.open(invite, token || undefined);
    setToken("");
    setCaptchaReset((n) => n + 1);
  }
  async function join(e) {
    e.preventDefault();
    const invite = parseInvite(code);
    if (!invite)
      return setNotice(
        "Paste a 32-character room code or a Syncora invitation link.",
      );
    await open(invite);
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Invitation copied. Share it privately with your group.");
    } catch {
      inviteDialog.current?.showModal();
    }
  }
  const invite =
    room && !demo
      ? `${location.origin}${location.pathname}#room=${room.code}`
      : "";
  return (
    <div className="shell">
      <header>
        <a className="brand" href="/" aria-label="Syncora home">
          ≋{" "}
          <span>
            syncora<i>together, in tune.</i>
          </span>
        </a>
        <span className="badge">✦ A little closer, wherever you are</span>
        <Install notify={setNotice} />
      </header>
      {!room ? (
        <main className="landing">
          <span className="eyebrow">YOUR PRIVATE LISTENING ROOM</span>
          <h1>
            Different places.
            <br />
            <em>Same moment.</em>
          </h1>
          <p>
            Press play on something you love.
            <br />
            Share the music, the conversation, and the quiet in between.
          </p>
          <section className="join panel">
            <label>
              Your name
              <input
                maxLength={30}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                autoComplete="nickname"
              />
            </label>
            {verificationRequired ? (
              <Captcha
                siteKey={captchaSiteKey}
                onToken={setToken}
                resetKey={captchaReset}
              />
            ) : null}
            <button
              className="primary"
              disabled={busy || (verificationRequired && !token)}
              onClick={() => open(null)}
            >
              {busy ? "Connecting…" : "Create a room ↗"}
            </button>
            <div className="divider">or meet someone here</div>
            <form onSubmit={join}>
              <label>
                Private room code or invite link
                <input
                  required
                  maxLength={2048}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your invitation"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </label>
              <button disabled={busy || (verificationRequired && !token)}>
                Join room →
              </button>
            </form>
            {readSaved("room")?.code ? (
              <button
                className="link"
                disabled={busy || (verificationRequired && !token)}
                onClick={() => open(readSaved("room").code)}
              >
                Resume your room ↔
              </button>
            ) : null}
            <button className="link" disabled={busy} onClick={session.demo}>
              Explore the local demo
            </button>
            <small>
              {db
                ? `Private rooms · ${ROOM_CAPACITY} seats · expire after 7 days`
                : "Demo available · shared rooms need Supabase setup"}
            </small>
          </section>
          <div className="features">
            <span>↔ Shared controls</span>
            <span>♫ A queue for everyone</span>
            <span>♡ Up to {ROOM_CAPACITY} people</span>
          </div>
        </main>
      ) : (
        <main>
          <div className="roomhead">
            <div>
              <span className="eyebrow">
                {demo ? "TRY IT OUT" : "THE LISTENING ROOM"}
              </span>
              <h1>
                A moment, shared<span className="dot">.</span>
              </h1>
              <p role="status">
                {status}
                {!demo
                  ? ` · ${room.members.length}/${ROOM_CAPACITY} seats · ${presence} device${presence === 1 ? "" : "s"} online`
                  : ""}
              </p>
            </div>
            <div className="room-actions">
              {!demo ? (
                <button onClick={() => inviteDialog.current.showModal()}>
                  Invite people ↗
                </button>
              ) : null}
              <button disabled={busy} onClick={() => session.leave()}>
                Back to lobby
              </button>
              {!demo ? (
                <button
                  disabled={busy || !online}
                  onClick={() => session.leave(true)}
                >
                  Release my seat
                </button>
              ) : null}
            </div>
          </div>
          {!online && !demo ? (
            <div className="note" role="status">
              You’re offline. Playback may continue locally; shared edits resume
              after you reconnect.
            </div>
          ) : null}
          <div className="workspace">
            <section className="watch panel">
              <div className="sectiontitle">
                <span>NOW PLAYING</span>
                <span>YOUTUBE</span>
              </div>
              <Player
                state={state}
                onAction={dispatch}
                notify={setNotice}
                offset={offset}
                disabled={disabled}
              />
              <h2>
                {state.current?.title || "Your next favorite moment awaits"}
              </h2>
              <p>
                {state.current
                  ? "Everyone in the room can control playback."
                  : "Add a YouTube video, then start the queue."}
              </p>
              <div className="note">
                On iPhone, tap the YouTube player to allow sound. Keep Syncora
                open for synchronization. Background playback is not guaranteed.
              </div>
              <div className="listening-as">
                <label>
                  Listening as
                  <input
                    maxLength={30}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                {!demo ? (
                  <small>
                    Room expires {new Date(room.expires_at).toLocaleString()}
                  </small>
                ) : null}
              </div>
            </section>
            <aside className="panel">
              <nav aria-label="Room panels">
                <button
                  aria-pressed={tab === "search"}
                  className={tab === "search" ? "selected" : ""}
                  onClick={() => setTab("search")}
                >
                  Search
                </button>
                <button
                  aria-pressed={tab === "queue"}
                  className={tab === "queue" ? "selected" : ""}
                  onClick={() => setTab("queue")}
                >
                  Queue <b>{state.queue.length}</b>
                </button>
                <button
                  aria-pressed={tab === "chat"}
                  className={tab === "chat" ? "selected" : ""}
                  onClick={() => setTab("chat")}
                >
                  Conversation <b>{state.messages.length}</b>
                </button>
              </nav>
              <div hidden={tab !== "search"}>
                <AddVideos
                  queue={state.queue}
                  dispatch={dispatch}
                  notify={setNotice}
                  disabled={disabled}
                />
              </div>
              {tab === "queue" ? (
                <Queue
                  queue={state.queue}
                  currentKey={state.current?.key}
                  dispatch={dispatch}
                  notify={setNotice}
                  disabled={disabled}
                />
              ) : tab === "chat" ? (
                <Chat
                  messages={state.messages}
                  name={name}
                  dispatch={dispatch}
                  disabled={disabled}
                />
              ) : null}
            </aside>
          </div>
        </main>
      )}
      <dialog ref={inviteDialog} aria-labelledby="invite-title">
        <h2 id="invite-title">Invite your people</h2>
        <p>
          Up to {ROOM_CAPACITY} people, including you, can join this room.
          Anyone with this invitation can claim an available seat. Share it
          privately.
        </p>
        <label>
          Room code
          <input
            className="invite-code"
            readOnly
            value={formatRoomCode(room?.code)}
            onFocus={(e) => e.target.select()}
          />
        </label>
        <label>
          Invitation link
          <input readOnly value={invite} onFocus={(e) => e.target.select()} />
        </label>
        <div className="dialog-actions">
          <button className="primary" onClick={() => copy(invite)}>
            Copy invitation link
          </button>
          <button onClick={() => copy(formatRoomCode(room?.code))}>
            Copy room code
          </button>
          <a
            className="whatsapp-share"
            href={`https://wa.me/?text=${encodeURIComponent(`Hey lets make some memories together with Syncora\njoin the room via this link\n${invite}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Share on WhatsApp ↗
          </a>
          <button onClick={() => inviteDialog.current.close()}>Close</button>
        </div>
        <small>
          Back to lobby keeps your seat. Release my seat lets someone else join;
          the room disappears when its last member leaves.
        </small>
      </dialog>
      <dialog ref={helpDialog} aria-labelledby="help-title">
        <h2 id="help-title">A few things to know</h2>
        <p>
          Syncora uses YouTube’s official embedded player. Videos, ads and
          player controls stay on YouTube; some videos cannot be embedded.
          Playing a video shares playback data with YouTube.
        </p>
        <p>
          Each iPhone may need a tap to allow playback. Keep everyone’s app
          visible. Screen lock, ads and buffering may interrupt synchronization.
          Use Resync to catch up.
        </p>
        <p>
          Room codes are private invitations. Chat is visible to members and the
          database administrator; it is not end-to-end encrypted. Rooms expire
          after seven days; chat keeps the latest 100 messages.
        </p>
        <button onClick={() => helpDialog.current.close()}>Got it</button>
      </dialog>
      {notice ? (
        <div className="toast" role="status">
          <span>{notice.message}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      ) : null}
      <footer>
        <span>SYNCORA · BETTER TOGETHER</span>
        <button className="link" onClick={() => helpDialog.current.showModal()}>
          Playback, installation & privacy
        </button>
        <span>iPhone: Safari → Share → Add to Home Screen</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
