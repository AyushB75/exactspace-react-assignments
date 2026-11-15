import React, { useEffect, useRef, useState } from "react";
import { USERS, MAX_MESSAGE_LENGTH } from "../shared/constants.js";
import EmojiPicker from "./EmojiPicker.jsx";

export default function Composer({ connected, publish }) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mention, setMention] = useState(null);
  const [selected, setSelected] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  const selection = useRef({ start: 0, end: 0 });
  const pending = useRef(null);
  const wasSending = useRef(false);
  useEffect(() => {
    if (wasSending.current && !sending) input.current?.focus();
    wasSending.current = sending;
  }, [sending]);
  const matches = mention
    ? USERS.filter((user) =>
        user.toLowerCase().startsWith(mention.query.toLowerCase()),
      )
    : [];
  function inspect(value, caret) {
    const match = value.slice(0, caret).match(/(?:^|\s)@([a-z]*)$/i);
    setMention(
      match
        ? { start: caret - match[1].length - 1, end: caret, query: match[1] }
        : null,
    );
    setSelected(0);
  }
  function insert(
    value,
    start = selection.current.start,
    end = selection.current.end,
  ) {
    const next = text.slice(0, start) + value + text.slice(end);
    if (next.length > MAX_MESSAGE_LENGTH) {
      setError("Messages can contain up to 2,000 characters.");
      return;
    }
    setText(next);
    setError("");
    setMention(null);
    setEmojiOpen(false);
    const caret = start + value.length;
    selection.current = { start: caret, end: caret };
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(caret, caret);
    });
  }
  function selectMention(user) {
    insert(`@${user} `, mention.start, mention.end);
  }
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || !connected || sending) return;
    const draft = text;
    if (!pending.current || pending.current.text !== draft)
      pending.current = { requestId: crypto.randomUUID(), text: draft };
    setSending(true);
    setError("");
    try {
      await publish("message:send", pending.current);
      setText("");
      pending.current = null;
      selection.current = { start: 0, end: 0 };
      setMention(null);
      setEmojiOpen(false);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSending(false);
      input.current?.focus();
    }
  }
  return (
    <form
      className="composer"
      onSubmit={send}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMention(null);
          setEmojiOpen(false);
          input.current?.focus();
        }
      }}
    >
      {error && (
        <p className="composer-error" role="alert">
          {error}
        </p>
      )}
      {emojiOpen && (
        <EmojiPicker
          onSelect={insert}
          onClose={() => {
            setEmojiOpen(false);
            input.current?.focus();
          }}
        />
      )}
      {mention && (
        <div
          id="mention-options"
          className="mentions"
          role="listbox"
          aria-label="Mention a user"
        >
          {matches.length ? (
            matches.map((user, index) => (
              <button
                id={`mention-${user}`}
                type="button"
                role="option"
                aria-selected={selected === index}
                key={user}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectMention(user)}
              >
                <span className={`avatar user-${user}`}>{user[0]}</span>
                {user}
              </button>
            ))
          ) : (
            <p>No matching users.</p>
          )}
        </div>
      )}
      <div className="input-shell">
        <textarea
          ref={input}
          rows="1"
          aria-label="Message"
          placeholder="Type Message"
          maxLength={MAX_MESSAGE_LENGTH}
          value={text}
          disabled={sending}
          aria-controls={mention ? "mention-options" : undefined}
          aria-expanded={Boolean(mention)}
          aria-activedescendant={
            mention && matches[selected]
              ? `mention-${matches[selected]}`
              : undefined
          }
          onSelect={(event) => {
            selection.current = {
              start: event.target.selectionStart,
              end: event.target.selectionEnd,
            };
          }}
          onChange={(event) => {
            setText(event.target.value);
            selection.current = {
              start: event.target.selectionStart,
              end: event.target.selectionEnd,
            };
            inspect(event.target.value, event.target.selectionStart);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") {
              setMention(null);
              setEmojiOpen(false);
            }
            if (
              mention &&
              matches.length &&
              ["ArrowDown", "ArrowUp"].includes(event.key)
            ) {
              event.preventDefault();
              setSelected(
                (index) =>
                  (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    matches.length) %
                  matches.length,
              );
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (mention && matches.length) selectMention(matches[selected]);
              else send(event);
            }
          }}
        />
        <button
          type="button"
          className="tool"
          aria-label="Mention a user"
          disabled={sending}
          onClick={() => {
            setEmojiOpen(false);
            const start = selection.current.start;
            const prefix = start && !/\s/.test(text[start - 1]) ? " @" : "@";
            const next =
              text.slice(0, start) + prefix + text.slice(selection.current.end);
            if (next.length > MAX_MESSAGE_LENGTH) return;
            setText(next);
            const caret = start + prefix.length;
            selection.current = { start: caret, end: caret };
            inspect(next, caret);
            input.current.focus();
            requestAnimationFrame(() =>
              input.current?.setSelectionRange(caret, caret),
            );
          }}
        >
          @
        </button>
        <button
          type="button"
          className="tool"
          aria-label="Choose emoji"
          aria-expanded={emojiOpen}
          disabled={sending}
          onClick={() => {
            setEmojiOpen((open) => !open);
            setMention(null);
          }}
        >
          ☺
        </button>
        <button
          className="send"
          type="submit"
          disabled={!connected || !text.trim() || sending}
        >
          {sending ? "Sending…" : "Send"}
          <span aria-hidden="true"> ➤</span>
        </button>
      </div>
      <div className="composer-meta">
        <span>Enter to send · Shift + Enter for a new line</span>
        <span>
          {text.length}/{MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  );
}
