// Shows the document chunks that were used to build the answer.
// Props:
//   sources - [{ filename, content, score }, ...]
function SourceList({ sources }) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 12 }}>
      <strong>Sources</strong>
      {sources.map((source, index) => (
        // index is fine as key here: this list is replaced, never reordered or edited
        <details key={index} style={{ marginTop: 6 }}>
          <summary>
            {index + 1}. {source.filename}{" "}
            <span className="muted">(score {source.score.toFixed(2)})</span>
          </summary>
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {source.content}
          </p>
        </details>
      ))}
    </div>
  );
}

export default SourceList;
