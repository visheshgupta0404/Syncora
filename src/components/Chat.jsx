import { Fragment, useEffect, useId, useRef, useState } from "react";
const emojis = [
  ["😀", "Grinning"],
  ["😂", "Laughing"],
  ["🥹", "Touched"],
  ["🥰", "Loved"],
  ["😍", "Heart eyes"],
  ["😎", "Cool"],
  ["🥳", "Celebrating"],
  ["🤔", "Thinking"],
  ["😭", "Crying"],
  ["😮", "Surprised"],
  ["😴", "Sleepy"],
  ["🫶", "Heart hands"],
  ["❤️", "Heart"],
  ["💜", "Purple heart"],
  ["✨", "Sparkles"],
  ["🔥", "Fire"],
  ["👍", "Thumbs up"],
  ["👏", "Clapping"],
  ["🙌", "Hands raised"],
  ["👋", "Waving"],
  ["🎧", "Headphones"],
  ["🎵", "Music"],
  ["🎶", "Musical notes"],
  ["🎤", "Microphone"],
  ["🎬", "Movie"],
  ["🍿", "Popcorn"],
  ["💃", "Dancing"],
  ["🕺", "Dancer"],
  ["🌙", "Moon"],
  ["☕", "Coffee"],
  ["🤝", "Handshake"],
  ["💯", "Hundred"],
];
export default function Chat({ messages, name, dispatch, disabled }) {
  const [text, setText] = useState(""),
    [pending, setPending] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false);
  const input = useRef(null),
    composer = useRef(null),
    emojiToggle = useRef(null);
  const pickerId = useId();
  const picker = useRef(null);
  useEffect(() => {
    if (!emojiOpen) return;
    picker.current
      ?.querySelector("button:not(:disabled)")
      ?.focus({ preventScroll: true });
    const closeOutside = (event) => {
      if (!composer.current?.contains(event.target)) setEmojiOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [emojiOpen]);
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
    if (!text.trim() || disabled || pending) return;
    setPending(true);
    const ok = await dispatch({
      type: "chat",
      payload: {
        id: crypto.randomUUID(),
        name: name.trim() || "Listener",
        text: text.trim(),
      },
    });
    if (ok) {
      setText("");
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
                  <p>{m.text}</p>
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
          if (event.key === "Escape" && emojiOpen) {
            event.preventDefault();
            setEmojiOpen(false);
            emojiToggle.current?.focus();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setEmojiOpen(false);
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
            <div className="chat-emoji-grid">
              {emojis.map(([emoji, label]) => (
                <button
                  type="button"
                  key={emoji}
                  aria-label={label}
                  title={label}
                  disabled={
                    text.length -
                      ((input.current?.selectionEnd ?? 0) -
                        (input.current?.selectionStart ?? 0)) +
                      emoji.length >
                    500
                  }
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
            onClick={() => setEmojiOpen(!emojiOpen)}
          >
            <span aria-hidden="true">☺</span>
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
