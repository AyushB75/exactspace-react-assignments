import React, { useEffect, useRef, useState } from "react";
import Composer from "./Composer.jsx";
import { useChat } from "./useChat";
import { USERS } from "../shared/constants.js";
function MessageText({ text }) {
  return text
    .split(/(@(?:Alan|Bob|Carol|Dean|Elin)\b)/g)
    .map((part, index) =>
      /^@(Alan|Bob|Carol|Dean|Elin)$/.test(part) ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      ),
    );
}
function Message({ message, connected, publish }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);
  async function like() {
    if (busy) return;
    pending.current ||= {
      messageId: message.id,
      requestId: crypto.randomUUID(),
    };
    setBusy(true);
    setError("");
    try {
      await publish("message:like", pending.current);
      pending.current = null;
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="message">
      <span className={`avatar user-${message.username}`} aria-hidden="true">
        {message.username[0]}
      </span>
      <div className="message-content">
        <div className="message-heading">
          <strong>{message.username}</strong>
          <time dateTime={message.createdAt}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
        <div className="bubble">
          <p>
            <MessageText text={message.text} />
          </p>
          <button
            className="message-like"
            aria-label={`Like message by ${message.username}`}
            disabled={!connected || busy}
            onClick={like}
          >
            <span aria-hidden="true">♡</span> <span>{message.likes}</span>
          </button>
        </div>
        {error && (
          <p className="message-error" role="alert">
            {error} Click like to retry.
          </p>
        )}
      </div>
    </article>
  );
}
export default function App() {
  const { messages, connected, error, publish } = useChat();
  const thread = useRef(null);
  const nearBottom = useRef(true);
  useEffect(() => {
    if (nearBottom.current && thread.current)
      thread.current.scrollTop = thread.current.scrollHeight;
  }, [messages]);
  return (
    <main className="chat">
      <header className="chat-header">
        <div>
          <h1>Introduction</h1>
          <p>The channel for company-wide chatter</p>
        </div>
        <div className="connection">
          <span className={connected ? "dot online" : "dot"} />
          <span role="status">{connected ? "Connected" : "Reconnecting…"}</span>
          <span className="member-count" title={USERS.join(", ")}>
            ♧ {USERS.length}
          </span>
        </div>
      </header>
      {error && (
        <div className="connection-error" role="alert">
          {error}
        </div>
      )}
      <section
        ref={thread}
        className="thread"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        onScroll={() => {
          const node = thread.current;
          nearBottom.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 100;
        }}
      >
        <div className="message-list">
          {messages.length === 0 && (
            <div className="welcome">
              <span className="welcome-icon">👋</span>
              <h2>Welcome to Team Chat</h2>
              <p>Say hello! Send a message to start the conversation.</p>
              <p className="welcome-hint">
                Try an emoji or mention a teammate with @
              </p>
            </div>
          )}
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              connected={connected}
              publish={publish}
            />
          ))}
        </div>
      </section>
      <Composer connected={connected} publish={publish} />
    </main>
  );
}
