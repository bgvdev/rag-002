// Calls to the backend's /health route (backend/app/routes/health.py)
import { API_URL, handleResponse } from "./client";

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return handleResponse(response); // -> { status: "ok" }
}
