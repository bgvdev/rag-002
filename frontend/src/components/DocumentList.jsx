// Shows uploaded documents, each with a Delete button.
// Props:
//   documents         - [{ document_id, filename, created_at }, ...]
//   onDelete(id)      - called when Delete is clicked
function DocumentList({ documents, onDelete }) {
  return (
    <div className="card">
      <strong>Documents ({documents.length})</strong>

      {documents.length === 0 ? (
        <p className="muted">No documents yet. Upload one above.</p>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.document_id}>
              <span>
                {doc.filename}
                <span className="muted">
                  {" "}
                  · {new Date(doc.created_at).toLocaleString()}
                </span>
              </span>
              <button className="danger" onClick={() => onDelete(doc.document_id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default DocumentList;
