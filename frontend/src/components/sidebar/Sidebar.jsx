import BackendStatus from "./BackendStatus";
import DocumentList from "./DocumentList";
import UploadForm from "./UploadForm";

// The left column: app title + backend status, New chat, upload, and the document list.
// Props:
//   documents, documentsError     - from useDocuments
//   onUploaded()                  - refresh the list after an upload
//   onDeleteDocument(id)          - the real delete (throws on failure)
//   onNewChat(), newChatDisabled  - start a fresh conversation (disabled while loading)
function Sidebar({ documents, documentsError, onUploaded, onDeleteDocument, onNewChat, newChatDisabled }) {
  // The trash button in the list: the USER clicked it, so a simple browser confirm is enough.
  // (Agent-proposed deletes use the confirm card in the chat instead.)
  async function handleDelete(documentId) {
    if (!window.confirm("Delete this document and all its chunks?")) return;
    try {
      await onDeleteDocument(documentId);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>DocChat</h1>
        <BackendStatus />
      </div>

      <button type="button" className="secondary" onClick={onNewChat} disabled={newChatDisabled}>
        + New chat
      </button>

      <UploadForm onUploaded={onUploaded} />

      {documentsError && <p className="status-error">{documentsError}</p>}
      <DocumentList documents={documents} onDelete={handleDelete} />
    </aside>
  );
}

export default Sidebar;
