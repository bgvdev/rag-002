import SourceList from "./SourceList";
import ToolSteps from "./ToolSteps";

// Shows the answer (with its sources), or an error message.
// Props:
//   answer  - the LLM's answer text
//   sources - chunks used for the answer [{ filename, content, score }, ...]
//   steps   - agent tool calls [{ round, tool, arguments }, ...], or null in normal mode
//   error   - an error message (if the request failed)
function AnswerCard({ answer, sources, steps, error }) {
  if (error) {
    return <p className="card status-error">{error}</p>;
  }

  if (!answer) {
    return null; // nothing to show yet
  }

  return (
    <div className="card">
      <ToolSteps steps={steps} />
      <strong>Answer</strong>
      <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
      <SourceList sources={sources} />
    </div>
  );
}

export default AnswerCard;
