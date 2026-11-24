import SourceList from "./SourceList";

// Shows the answer (with its sources), or an error message.
// Props:
//   answer  - the LLM's answer text
//   sources - chunks used for the answer [{ filename, content, score }, ...]
//   error   - an error message (if the request failed)
function AnswerCard({ answer, sources, error }) {
  if (error) {
    return <p className="card status-error">{error}</p>;
  }

  if (!answer) {
    return null; // nothing to show yet
  }

  return (
    <div className="card">
      <strong>Answer</strong>
      <p style={{ whiteSpace: "pre-wrap" }}>{answer}</p>
      <SourceList sources={sources} />
    </div>
  );
}

export default AnswerCard;
