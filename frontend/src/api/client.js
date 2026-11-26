// Shared pieces used by every API file (healthApi, chatApi, documentsApi).
export const API_URL = "http://localhost:8000";

// Return JSON on success, throw a readable error otherwise.
export async function handleResponse(response) {
  if (!response.ok) {
    // FastAPI sends errors as { detail: "..." }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}
