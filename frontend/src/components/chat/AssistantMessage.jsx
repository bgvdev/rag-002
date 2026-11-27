import Markdown from "react-markdown";
import ConfirmAction from "./ConfirmAction";
import SourceList from "./SourceList";
import ToolSteps from "./ToolSteps";

// One answer in the thread: avatar on the left, then (top to bottom)
// steps chip -> live status (while working) -> answer text -> error -> sources -> confirm card.
// Props:
//   message    - an assistant message from useChat (see the shape there)
//   isLatest   - true for the newest answer (its steps start opened)
//   onConfirm(id), onCancel(id) - the user's choice on an agent-proposed action
function AssistantMessage({ message, isLatest, onConfirm, onCancel }) {
  const { id, status, statusText, content, error, steps, sources, action, actionState, actionMessage } = message;
  const working = status === "working";

  // Agent steps: hide the chip while the agent is still thinking with no steps yet
  // (the status line below says what is happening), show it as soon as there is a step.
  const showSteps = steps && (steps.length > 0 || !working);

  // The confirm card only while a decision is open (pending) or running (busy)
  const showConfirm = action && (actionState === "pending" || actionState === "busy");

  return (
    <div className="msg-assistant">
      <span className="avatar" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="12" rx="3" />
          <path d="M12 4v4M9 13h.01M15 13h.01" />
        </svg>
      </span>

      <div className="msg-body">
        {showSteps && <ToolSteps steps={steps} defaultOpen={isLatest} />}

        {/* Live status until the first answer text arrives: "Round 1: 🔍 Searching the documents..." */}
        {working && !content && (
          <span className="chip status-line" role="status" style={{ alignSelf: "flex-start" }}>
            <span className="spinner" aria-hidden="true" />
            {statusText}
          </span>
        )}

        {/* The LLM writes Markdown (**bold**, lists). react-markdown turns it into real
            elements and IGNORES raw HTML, so HTML copied from a document can't run here. */}
        {content && (
          <div className="markdown">
            <Markdown components={MARKDOWN_COMPONENTS}>{content}</Markdown>
          </div>
        )}

        {status === "error" && <p className="status-error">{error}</p>}

        <SourceList sources={sources} />

        {showConfirm && (
          <ConfirmAction
            action={action}
            onConfirm={() => onConfirm(id)}
            onCancel={() => onCancel(id)}
            busy={actionState === "busy"}
          />
        )}

        {/* What happened to the action: "Deleted ...", "Cancelled ...", "Expired ...", or a retry error */}
        {actionMessage && (
          <p className="muted" style={{ fontSize: 13 }}>
            {actionMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// Links in answers open in a new tab, so clicking one never leaves the chat.
// rel="noopener noreferrer": the new tab can't control this page, and gets no referrer.
// (`node` is react-markdown's internal tree node: take it out so it isn't put on the <a>.)
const MARKDOWN_COMPONENTS = {
  // eslint-disable-next-line no-unused-vars
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

export default AssistantMessage;
