// Calls to the backend's /documents routes (backend/app/routes/documents.py)
import { API_URL, handleResponse } from "./client";

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file); // "file" must match the FastAPI parameter name

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: "POST",
    body: formData, // no Content-Type header: the browser sets it for FormData
  });
  return handleResponse(response); // -> { document_id, filename, chunk_count }
}

export async function listDocuments() {
  const response = await fetch(`${API_URL}/documents`);
  return handleResponse(response); // -> [{ document_id, filename, created_at }, ...]
}

export async function deleteDocument(documentId) {
  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: "DELETE",
  });
  return handleResponse(response); // -> { deleted: documentId }
}
