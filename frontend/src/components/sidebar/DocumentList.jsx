// Uploaded documents: one compact row each (file icon, name, date, delete icon).
// Props:
//   documents     - [{ document_id, filename, created_at }, ...]
//   onDelete(id)  - called when the trash button is clicked
function DocumentList({ documents, onDelete }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="section-label">
        <span>Documents</span>
        <span>{documents.length}</span>
      </div>

      {documents.length === 0 ? (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>No documents yet. Upload one above.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.document_id}>
              <svg className="doc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
              </svg>

              <span className="doc-info">
                {/* title = the full name on hover, because a long one is cut with "…" */}
                <span className="doc-name" title={doc.filename}>{doc.filename}</span>
                <span className="doc-meta">{formatDate(doc.created_at)}</span>
              </span>

              <button
                type="button"
                className="icon-button danger-hover"
                aria-label={`Delete ${doc.filename}`} // icon-only: screen readers need a name
                title="Delete"
                onClick={() => onDelete(doc.document_id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "2026-11-27T13:17:01+05:30" -> "27 Nov, 1:17 pm" (in the user's own locale format)
function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default DocumentList;
