// Shows the earlier turns of the conversation + a "New chat" button.
// Props:
//   turns           - earlier messages to SHOW, oldest first:
//                     [{ role: "user" | "assistant", content }, ...]
//                     (the latest answer is left out: AnswerCard already shows it)
//   rememberedCount - how many questions the agent remembers (incl. the latest one)
//   onNewChat()     - called when the user clicks "New chat"
//   disabled        - true while an answer is loading
function ChatHistory({ turns, rememberedCount, onNewChat, disabled }) {
  if (rememberedCount === 0) {
    return null; // no conversation yet
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <strong style={{ flex: 1 }}>
          💬 Conversation{" "}
          <span className="muted" style={{ fontWeight: "normal", fontSize: 14 }}>
            · the agent remembers {rememberedCount} question{rememberedCount === 1 ? "" : "s"}
          </span>
        </strong>
        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          style={{
            background: "transparent",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "6px 12px",
          }}
        >
          New chat
        </button>
      </div>

      {turns.map((turn, index) => (
        // index is fine as key: turns are only appended (or all cleared), never reordered
        <p key={index} style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>
          <strong className={turn.role === "user" ? "" : "muted"}>
            {turn.role === "user" ? "You: " : "Agent: "}
          </strong>
          <span className={turn.role === "user" ? "" : "muted"}>{turn.content}</span>
        </p>
      ))}
    </div>
  );
}

export default ChatHistory;
