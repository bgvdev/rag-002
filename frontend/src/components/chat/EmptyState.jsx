// Shown in the thread before the first question: a welcome line + suggested questions.
// Props:
//   documentCount       - how many documents are uploaded (0 = tell the user to upload first)
//   onPick(text, mode)  - called when a suggestion is clicked (asks it right away)
//   disabled            - true while an answer is loading

// Generic on purpose: they work for ANY uploaded files, not just today's.
// All use agent mode: whole-document questions need list_documents / read_document.
const SUGGESTIONS = [
  "What files have I uploaded?",
  "Summarise each of my documents",
  "List all the topics in my documents",
  "What are the most important facts in my documents?",
];

function EmptyState({ documentCount, onPick, disabled }) {
  return (
    <div className="empty-state">
      <span className="avatar" aria-hidden="true" style={{ width: 56, height: 56, color: "var(--primary)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="12" rx="3" />
          <path d="M12 4v4M9 13h.01M15 13h.01" />
        </svg>
      </span>

      <div>
        <h2>Ask about your documents</h2>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {documentCount === 0
            ? "Upload a .txt or .pdf file in the sidebar to get started."
            : `Answers come only from your ${documentCount} uploaded file${documentCount === 1 ? "" : "s"}, with sources.`}
        </p>
      </div>

      {documentCount > 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((text) => (
            <button key={text} type="button" onClick={() => onPick(text, "agent")} disabled={disabled}>
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
