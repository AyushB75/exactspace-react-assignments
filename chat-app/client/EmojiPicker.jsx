import React, { useState } from "react";
const EMOJIS = [
  ["😀", "grinning happy smile"],
  ["😃", "happy smile"],
  ["😄", "laugh smile"],
  ["😁", "grin"],
  ["😆", "laugh"],
  ["😅", "sweat smile"],
  ["😂", "tears joy laugh"],
  ["🙂", "smile"],
  ["😉", "wink"],
  ["😊", "blush happy"],
  ["😍", "heart eyes love"],
  ["🥰", "love hearts"],
  ["😘", "kiss"],
  ["😎", "cool sunglasses"],
  ["🤔", "thinking"],
  ["😭", "cry sad"],
  ["😢", "sad"],
  ["😮", "surprised"],
  ["😴", "sleep"],
  ["🥳", "party"],
  ["👋", "wave hello hand"],
  ["👍", "thumbs up like"],
  ["👏", "clap applause"],
  ["🙌", "celebrate hands"],
  ["🙏", "thanks pray"],
  ["💪", "strong muscle"],
  ["❤️", "red heart love"],
  ["💙", "blue heart"],
  ["🔥", "fire"],
  ["✨", "sparkles"],
  ["🎉", "party celebration"],
  ["✅", "check done"],
  ["🚀", "rocket"],
  ["💡", "idea bulb"],
  ["☕", "coffee"],
  ["🌻", "flower"],
];
export default function EmojiPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const results = EMOJIS.filter(([, name]) =>
    name.includes(query.toLowerCase().trim()),
  );
  return (
    <section className="emoji-picker" aria-label="Emoji picker">
      <div className="picker-heading">
        <strong>Emoji</strong>
        <button type="button" aria-label="Close emoji picker" onClick={onClose}>
          ×
        </button>
      </div>
      <input
        autoFocus
        aria-label="Search emojis"
        placeholder="Search emojis…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (results[0]) onSelect(results[0][0]);
          }
        }}
      />
      <p>Smileys & people</p>
      <div className="emoji-grid">
        {results.map(([emoji, name]) => (
          <button
            key={emoji}
            type="button"
            aria-label={name}
            title={name}
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      {!results.length && <p>No emojis found.</p>}
    </section>
  );
}
