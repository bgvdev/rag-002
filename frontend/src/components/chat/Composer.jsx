import { useRef, useState } from "react";

// The two answer modes: label on the toggle + the hint shown next to it.
const MODES = {
  normal: { label: "Normal", hint: "Fast answer from the top matching chunks." },
  agent: { label: "Agent", hint: "Picks tools and remembers this chat." },
};
// The keys work the same in both modes, so the tip is shown in both
const KEYBOARD_TIP = "Enter to send, Shift+Enter for a new line.";

const MAX_TEXTAREA_HEIGHT = 200; // px: grows with the text up to this, then scrolls

// The question box pinned at the bottom of the chat.
// Props:
//   onAsk(question, mode) - called when the user sends ("normal" | "agent")
//   loading               - true while an answer is streaming (sending is disabled)
function Composer({ onAsk, loading }) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("agent"); // agent by default: it handles follow-ups
  const textareaRef = useRef(null);

  const canSend = question.trim() !== "" && !loading;

  function send() {
    if (!canSend) return;
    onAsk(question.trim(), mode);
    setQuestion(""); // clear the box, like any chat app
    resizeTextarea(""); // and shrink it back
  }

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    send();
  }

  // Enter = send, Shift+Enter = new line.
  // isComposing: true while typing with an input method (e.g. Hindi, Japanese);
  // Enter then confirms the character, so it must NOT send the question.
  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault(); // no newline
      send();
    }
  }

  function handleChange(event) {
    setQuestion(event.target.value);
    resizeTextarea(event.target.value);
  }

  // Auto-grow: reset the height, then set it to the content's height (up to the max)
  function resizeTextarea(value) {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    if (value) el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT) + "px";
  }

  return (
    <form className="composer-wrap" onSubmit={handleSubmit}>
      <div className="composer">
        <label htmlFor="question" className="visually-hidden">
          Your question
        </label>
        <textarea
          id="question"
          ref={textareaRef}
          rows={2}
          placeholder="Ask a question about your documents..."
          value={question}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        />

        <div className="ask-footer" style={{ marginTop: 0 }}>
          <div className="mode-switch" role="group" aria-label="Answer mode">
            {Object.entries(MODES).map(([key, { label }]) => (
              <button
                key={key}
                type="button" // NOT "submit": choosing a mode must not send the form
                className={mode === key ? "active" : ""}
                aria-pressed={mode === key}
                onClick={() => setMode(key)}
                disabled={loading}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="hint muted">
            {MODES[mode].hint} {KEYBOARD_TIP}
          </span>

          <button type="submit" disabled={!canSend} aria-label="Send" style={{ width: 44, height: 44, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: "var(--bubble)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}

export default Composer;
