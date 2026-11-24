import { useState } from "react";

// Question box + Ask button.
// Props:
//   onAsk(question) - called when the user submits
//   loading         - true while waiting for an answer
function AskForm({ onAsk, loading }) {
  const [question, setQuestion] = useState("");

  function handleSubmit(event) {
    event.preventDefault(); // stop the browser from reloading the page
    if (!question.trim()) return;
    onAsk(question);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <textarea
        rows={3}
        placeholder="Ask a question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button type="submit" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? "Thinking..." : "Ask"}
      </button>
    </form>
  );
}

export default AskForm;
