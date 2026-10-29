import { useEffect, useRef, useState } from "react";
import { freshReactions, quickReactions } from "../lib/roomExtras.js";

export default function QuickReactions({
  messages,
  name,
  dispatch,
  disabled,
  offset = 0,
}) {
  const seen = useRef(new Set(messages.map((message) => message.id)));
  const timers = useRef(new Set());
  const lastSent = useRef(0);
  const [sending, setSending] = useState(false);
  const [floating, setFloating] = useState([]);
  useEffect(() => {
    const incoming = freshReactions(
      messages,
      seen.current,
      Date.now() + offset,
    );
    seen.current = new Set(messages.map((message) => message.id));
    if (!incoming.length) return;
    setFloating((previous) => [...previous, ...incoming].slice(-12));
    const ids = new Set(incoming.map((message) => message.id));
    const timer = setTimeout(() => {
      setFloating((previous) =>
        previous.filter((message) => !ids.has(message.id)),
      );
      timers.current.delete(timer);
    }, 2800);
    timers.current.add(timer);
  }, [messages, offset]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  async function react(emoji) {
    if (disabled || sending || Date.now() - lastSent.current < 1000) return;
    lastSent.current = Date.now();
    setSending(true);
    try {
      await dispatch({
        type: "chat",
        payload: {
          id: crypto.randomUUID(),
          name: name.trim() || "Listener",
          text: emoji,
        },
      });
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="quick-reactions">
      <div className="reaction-floats" aria-hidden="true">
        {floating.map((message, index) => (
          <span key={message.id} style={{ "--reaction-lane": index % 6 }}>
            <b>{message.text}</b>
            <small>{message.name}</small>
          </span>
        ))}
      </div>
      <div
        className="quick-reaction-buttons"
        role="group"
        aria-label="React with your room"
      >
        <span>Feel this moment</span>
        {quickReactions.map((emoji) => (
          <button
            type="button"
            key={emoji}
            aria-label={`React ${emoji}`}
            disabled={disabled || sending}
            onClick={() => react(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <small className="muted">
        Shared with the room · also appears in Conversation
      </small>
    </div>
  );
}
