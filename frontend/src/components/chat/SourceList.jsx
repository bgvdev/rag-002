import { useState } from "react";

// The document chunks used for the answer, as small chips: "Sources (1) resume.pdf · 0.82".
// Click a chip to read that chunk's text below; click it again to close it.
// Props:
//   sources - [{ filename, content, score }, ...]
function SourceList({ sources }) {
  const [openIndex, setOpenIndex] = useState(null); // which chip is open (null = none)

  if (!sources || sources.length === 0) {
    return null;
  }

  const openSource = openIndex === null ? null : sources[openIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 13 }}>Sources</span>
        {sources.map((source, index) => (
          // index is fine as key here: this list is replaced, never reordered or edited
          <button
            key={index}
            type="button"
            className="chip"
            aria-expanded={openIndex === index}
            title={source.filename} // full name on hover, the chip may cut it short
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            style={openIndex === index ? { color: "var(--text)", borderColor: "var(--primary)" } : undefined}
          >
            <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {index + 1}. {source.filename}
            </span>
            · {source.score.toFixed(2)}
          </button>
        ))}
      </div>

      {openSource && (
        <p
          className="muted"
          style={{ margin: 0, padding: 12, borderRadius: 8, background: "var(--card)", fontSize: 13, whiteSpace: "pre-wrap" }}
        >
          {openSource.content}
        </p>
      )}
    </div>
  );
}

export default SourceList;
