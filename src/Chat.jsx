import { Fragment, useEffect, useRef, useState } from "react";
export default function Chat({ messages, name, dispatch, disabled }) {
  const [text, setText] = useState(""),
    [pending, setPending] = useState(false);
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
      <form onSubmit={send} className="chat-composer">
        <label>
          Message
          <textarea
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
        <button
          className="primary"
          disabled={disabled || pending || !text.trim()}
        >
          {pending ? "Sending…" : "Send ↑"}
        </button>
      </form>
      <div className="chat-footer">
        <small>Visible to everyone in this room</small>
        <small>{text.length}/500</small>
      </div>
    </div>
  );
}
