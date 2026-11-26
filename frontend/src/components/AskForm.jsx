import { useState } from "react";

// Question box + Agent mode checkbox + Ask button.
// Props:
//   onAsk(question, agentMode) - called when the user submits
//   loading                    - true while waiting for an answer
function AskForm({ onAsk, loading }) {
  const [question, setQuestion] = useState("");
  const [agentMode, setAgentMode] = useState(false); // false = normal streaming RAG

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!question.trim()) return;
    onAsk(question, agentMode);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <textarea
        rows={3}
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <label style={{ display: "block", marginTop: 8 }}>
        <input
          type="checkbox"
          checked={agentMode}
          onChange={(e) => setAgentMode(e.target.checked)}
          disabled={loading}
        />{" "}
        Agent mode <span className="muted">(LLM decides what to search, using tools)</span>
      </label>
      <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? (agentMode ? "Agent working..." : "Thinking...") : "Ask"}
      </button>
    </form>
  );
}

export default AskForm;
