// All calls to the FastAPI backend live in this file.
const API_URL = "http://localhost:8000";

// Shared helper: return JSON on success, throw a readable error otherwise.
async function handleResponse(response) {
  if (!response.ok) {
    // FastAPI sends errors as { detail: "..." }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

// ---------- Health ----------

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return handleResponse(response); // -> { status: "ok" }
}

// ---------- Chat ----------

export async function askQuestion(question) {
  const response = await fetch(`${API_URL}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handleResponse(response); // -> { answer: "...", sources: [...] }
}

// Streaming version: calls onEvent(event) for every line the backend sends.
// Events: { type: "sources" | "token" | "done" | "error", ... }
export async function askQuestionStream(question, onEvent) {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    // Error BEFORE streaming started (normal JSON error, e.g. 500)
    await handleResponse(response);
  }

  const reader = response.body.getReader(); // read the body piece by piece
  const decoder = new TextDecoder(); // bytes -> text
  let buffer = ""; // holds an incomplete line until the rest arrives

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop(); // last part may be incomplete: keep it for next time

    for (const line of lines) {
      if (line.trim()) {
        onEvent(JSON.parse(line));
      }
    }
  }
}

// ---------- Documents ----------

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
