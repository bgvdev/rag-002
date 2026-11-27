import { useCallback, useEffect, useState } from "react";
import { deleteDocument, listDocuments } from "../api";

// Everything about the uploaded documents: the list, and what you can do with it.
// No JSX here: components decide how it looks, this hook decides the data.
//
// Returns:
//   documents        - [{ document_id, filename, created_at }, ...]
//   error            - "" or a short message if the list could not be loaded
//   reload()         - fetch the list again (e.g. after an upload)
//   remove(id)       - delete a document, then reload. Throws on failure,
//                      so the caller can show its own error message.
function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");

  // useCallback = keep the SAME function between renders,
  // so the useEffect below doesn't re-run on every render.
  const reload = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
      setError("");
    } catch (err) {
      console.error("Could not load documents:", err);
      setError("Could not load documents.");
    }
  }, []);

  // Load the list once, when the component using this hook first appears
  useEffect(() => {
    reload();
  }, [reload]);

  const remove = useCallback(
    async (documentId) => {
      await deleteDocument(documentId); // the normal DELETE /documents/{id}
      await reload();
    },
    [reload]
  );

  return { documents, error, reload, remove };
}

export default useDocuments;
