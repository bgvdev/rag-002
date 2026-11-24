import { useRef, useState } from "react";
import { uploadDocument } from "../api";

// File picker + Upload button.
// Props:
//   onUploaded() - called after a successful upload (so the parent can refresh the list)
function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const inputRef = useRef(null); // direct access to the <input type="file">

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage("");

    try {
      const result = await uploadDocument(file);
      setIsError(false);
      setMessage(`Uploaded "${result.filename}" (${result.chunk_count} chunks)`);
      setFile(null);
      inputRef.current.value = ""; // clear the file picker
      onUploaded();
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <strong>Upload a document</strong>
      <p className="muted">Supported: .txt, .pdf</p>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf"
        onChange={(e) => setFile(e.target.files[0] || null)}
      />
      <button type="submit" disabled={!file || uploading} style={{ marginTop: 8 }}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && (
        <p className={isError ? "status-error" : "status-ok"}>{message}</p>
      )}
    </form>
  );
}

export default UploadForm;
