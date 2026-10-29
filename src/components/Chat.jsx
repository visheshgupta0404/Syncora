import {
  Fragment,
  Suspense,
  lazy,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import GifMessage from "./GifMessage.jsx";
import GifSearch from "./GifSearch.jsx";
import { getGifUrl, getGiphyId } from "../lib/chat-media.js";
import { getBuiltinGif } from "../lib/reactions.js";
const EmojiPicker = lazy(() => import("emoji-picker-react"));
export default function Chat({ messages, name, dispatch, disabled }) {
  const [text, setText] = useState(""),
    [pending, setPending] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false),
    [gifOpen, setGifOpen] = useState(false),
    [gifLink, setGifLink] = useState("");
  const input = useRef(null),
    composer = useRef(null),
    emojiToggle = useRef(null);
  const pickerId = useId();
  const picker = useRef(null);
  useEffect(() => {
    if (!emojiOpen && !gifOpen) return;
    picker.current
      ?.querySelector("input, button:not(:disabled)")
      ?.focus({ preventScroll: true });
    const closeOutside = (event) => {
      if (!composer.current?.contains(event.target)) {
        setEmojiOpen(false);
        setGifOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [emojiOpen, gifOpen]);
  function insertEmoji(emoji) {
    const start = input.current.selectionStart,
      end = input.current.selectionEnd;
    if (text.length - (end - start) + emoji.length > 500) return;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(
        start + emoji.length,
        start + emoji.length,
      );
    });
  }
  const list = useRef(null),
    follow = useRef(true);
  useEffect(() => {
    if (follow.current)
      list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages.length, messages.at(-1)?.id]);
  async function send(e) {
    e.preventDefault();
    await sendContent(text.trim());
  }
  async function sendContent(content, isGif = false) {
    if (
      !content ||
      disabled ||
      pending ||
      (isGif &&
        !getGifUrl(content) &&
        !getGiphyId(content) &&
        !getBuiltinGif(content))
    )
      return;
    setPending(true);
    const ok = await dispatch({
      type: "chat",
      payload: {
        id: crypto.randomUUID(),
        name: name.trim() || "Listener",
        text: content,
      },
    });
    if (ok) {
      if (!isGif) setText("");
      setGifLink("");
      setGifOpen(false);
      setEmojiOpen(false);
      follow.current = true;
    }
    setPending(false);
  }
  return (
    <div className="chat">
      <header className="chat-heading">
        <div>
          <h2>Room conversation</h2>
          <p>Share a thought while you listen.</p>
        </div>
        <span className="chat-count">{messages.length} / 100</span>
      </header>
      <div
        className="messages"
        role="log"
        aria-label="Room conversation"
        ref={list}
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        {messages.length ? (
          messages.map((m, i) => (
            <Fragment key={m.id}>
              {!i ||
              new Date(messages[i - 1].at).toDateString() !==
                new Date(m.at).toDateString() ? (
                <div className="chat-date">
                  {new Date(m.at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              ) : null}
              <article className="chat-message">
                <span className="chat-avatar" aria-hidden="true">
                  {(m.name || "L").slice(0, 1).toUpperCase()}
                </span>
                <div className="chat-bubble">
                  <div className="chat-meta">
                    <strong>{m.name}</strong>
                    <time dateTime={new Date(m.at).toISOString()}>
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <GifMessage text={m.text} />
                </div>
              </article>
            </Fragment>
          ))
        ) : (
          <div className="chat-empty">
            <span aria-hidden="true">✦</span>
            <h3>Start the conversation</h3>
            <p>
              Talk about the video, share a reaction,
              <br />
              or say hello to your room.
            </p>
          </div>
        )}
      </div>
      <form
        onSubmit={send}
        className="chat-composer"
        ref={composer}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            event.target.closest(".EmojiPickerReact")
          ) {
            event.preventDefault();
          }
          if (event.key === "Escape" && (emojiOpen || gifOpen)) {
            event.preventDefault();
            setEmojiOpen(false);
            setGifOpen(false);
            emojiToggle.current?.focus();
          }
        }}
        onBlur={(event) => {
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setEmojiOpen(false);
            setGifOpen(false);
          }
        }}
      >
        {emojiOpen && !disabled && !pending && (
          <div
            className="chat-emoji-picker"
            ref={picker}
            id={pickerId}
            role="group"
            aria-label="Choose an emoji"
          >
            <div className="chat-emoji-heading">
              <strong>A little reaction</strong>
              <span>Emojis</span>
            </div>
            <Suspense fallback={<p role="status">Loading emojis…</p>}>
              <EmojiPicker
                theme="dark"
                emojiStyle="native"
                width="100%"
                height={320}
                autoFocusSearch={true}
                previewConfig={{ showPreview: false }}
                onEmojiClick={({ emoji }) => insertEmoji(emoji)}
              />
            </Suspense>
          </div>
        )}
        {gifOpen && !disabled && !pending && (
          <div
            className="chat-emoji-picker chat-gif-picker"
            ref={picker}
            role="group"
            aria-label="Share a GIF"
          >
            <GifSearch
              disabled={disabled || pending}
              onSelect={(url) => sendContent(url, true)}
            />
            <details>
              <summary>Or paste a GIF link</summary>
              <label htmlFor={pickerId + "-gif"}>GIF link</label>
              <p>Paste a direct .gif link from Giphy or Tenor.</p>
              <input
                id={pickerId + "-gif"}
                type="url"
                maxLength={500}
                value={gifLink}
                placeholder="https://media.giphy.com/media/…/giphy.gif"
                onChange={(event) => setGifLink(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    sendContent(getGifUrl(gifLink), true);
                  }
                }}
              />
              {gifLink && !getGifUrl(gifLink) && (
                <small role="status">
                  Use an HTTPS .gif link hosted by Giphy or Tenor.
                </small>
              )}
              <button
                type="button"
                className="primary"
                disabled={!getGifUrl(gifLink)}
                onClick={() => sendContent(getGifUrl(gifLink), true)}
              >
                Send GIF ↑
              </button>
              <small>
                GIFs load from their provider when someone taps View GIF.
              </small>
            </details>
          </div>
        )}
        <label>
          Message
          <textarea
            ref={input}
            rows={2}
            disabled={pending}
            maxLength={500}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                e.currentTarget.form.requestSubmit();
              }
            }}
          />
        </label>
        <div className="chat-compose-actions">
          <button
            type="button"
            className="chat-emoji-toggle"
            ref={emojiToggle}
            aria-label="Choose an emoji"
            aria-expanded={emojiOpen && !disabled && !pending}
            aria-controls={
              emojiOpen && !disabled && !pending ? pickerId : undefined
            }
            disabled={disabled || pending}
            title="Emojis"
            onClick={() => {
              setEmojiOpen(!emojiOpen);
              setGifOpen(false);
            }}
          >
            <span aria-hidden="true">☺</span>
          </button>
          <button
            type="button"
            className="chat-gif-toggle"
            disabled={disabled || pending}
            aria-label="Share a GIF"
            aria-expanded={gifOpen && !disabled && !pending}
            onClick={() => {
              setGifOpen(!gifOpen);
              setEmojiOpen(false);
            }}
          >
            GIF
          </button>
          <button
            className="primary"
            disabled={disabled || pending || !text.trim()}
          >
            {pending ? "Sending…" : "Send ↑"}
          </button>
        </div>
      </form>
      <div className="chat-footer">
        <small>Visible to everyone in this room</small>
        <small>{text.length}/500</small>
      </div>
    </div>
  );
}
