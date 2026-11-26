// Calls to the backend's /chat routes (backend/app/routes/chat.py)
import { API_URL, handleResponse } from "./client";

// Normal RAG: whole answer at once.
export async function askQuestion(question) {
  const response = await fetch(`${API_URL}/chat/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handleResponse(response); // -> { answer: "...", sources: [...] }
}

// Streaming RAG: calls onEvent(event) for every line the backend sends.
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

// Agent: the LLM decides when/what to search (tool calling).
// Not streamed: the backend runs all tool rounds first, then returns everything.
export async function askAgent(question) {
  const response = await fetch(`${API_URL}/chat/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  return handleResponse(response); // -> { answer, sources, steps: [{ round, tool, arguments }] }
}
