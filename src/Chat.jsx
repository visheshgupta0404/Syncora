import { useEffect, useRef, useState } from "react";
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
    if (!text.trim()) return;
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
          messages.map((m) => (
            <article key={m.id}>
              <small>
                {m.name} ·{" "}
                {new Date(m.at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
              <p>{m.text}</p>
            </article>
          ))
        ) : (
          <div className="empty">
            ♡<h3>Say a little hello</h3>
            <p>A conversation just for this room.</p>
          </div>
        )}
      </div>
      <form onSubmit={send}>
        <label>
          Message
          <input
            maxLength={500}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Something on your mind?"
          />
        </label>
        <button
          className="primary"
          disabled={disabled || pending || !text.trim()}
        >
          {pending ? "Sending…" : "Send ↗"}
        </button>
      </form>
      <small className="muted">
        Latest 100 messages · visible to both room members
      </small>
    </div>
  );
}
