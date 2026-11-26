import { useState } from "react";

// The two answer modes: the label on the toggle + the hint shown next to it.
const MODES = {
  normal: { label: "⚡ Normal", hint: "Streams the answer from the top matching chunks." },
  agent: { label: "🤖 Agent", hint: "The LLM picks tools to search or read your documents." },
};

// Question box + Normal/Agent toggle + Ask button.
// Props:
//   onAsk(question, agentMode) - called when the user submits
//   loading                    - true while waiting for an answer
function AskForm({ onAsk, loading }) {
  const [question, setQuestion] = useState("");
  const [mode, setMode] = useState("normal"); // "normal" | "agent"

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!question.trim()) return;
    onAsk(question, mode === "agent");
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <textarea
        rows={3}
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <div className="ask-footer">
        <div className="mode-switch" role="group" aria-label="Answer mode">
          {Object.entries(MODES).map(([key, { label }]) => (
            <button
              key={key}
              type="button" // NOT "submit": choosing a mode must not send the form
              className={mode === key ? "active" : ""}
              aria-pressed={mode === key} // tells screen readers which one is selected
              onClick={() => setMode(key)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="hint muted">{MODES[mode].hint}</span>

        <button type="submit" disabled={loading}>
          {loading ? (mode === "agent" ? "Agent working..." : "Thinking...") : "Ask"}
        </button>
      </div>
    </form>
  );
}

export default AskForm;
