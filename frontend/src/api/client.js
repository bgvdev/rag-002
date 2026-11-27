// Shared pieces used by every API file (healthApi, chatApi, documentsApi).
export const API_URL = "http://localhost:8000";

// Return JSON on success, throw a readable error otherwise.
export async function handleResponse(response) {
  if (!response.ok) {
    // FastAPI sends errors as { detail: "..." }
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.detail || `Request failed: ${response.status}`);
    error.status = response.status; // lets callers react to e.g. 404 differently
    throw error;
  }
  return response.json();
}
