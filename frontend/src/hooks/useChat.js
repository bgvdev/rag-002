import { useRef, useState } from "react";
import { askAgentStream, askQuestionStream } from "../api";
import { getToolInfo } from "../utils/toolInfo";

// Conversation memory limits. Must match backend/app/schemas/chat.py
// (MAX_HISTORY_TURNS, MAX_TURN_CHARS), or the backend returns 422.
const MAX_HISTORY = 20;
const MAX_TURN_CHARS = 4000;

// Everything about the chat: the list of messages and what you can do with it.
// No JSX here: components decide how it looks, this hook decides the data.
//
// Message shapes:
//   { id, role: "user", mode, content }
//   { id, role: "assistant", mode, content, status, statusText, error,
//     steps, sources, action, actionState, actionMessage }
//     status:      "working" | "done" | "error"
//     steps:       [] in agent mode (tool calls), null in normal mode
//     action:      the agent's "confirm" event, or null
//     actionState: null | "pending" | "busy" | "done" | "cancelled" | "failed" | "expired"
//
// Param:
//   removeDocument(id) - does the REAL delete when the user confirms (from useDocuments)
function useChat({ removeDocument }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1); // a counter that survives re-renders without causing one

  function newId() {
    return nextId.current++;
  }

  // Change one message by id. `changes(message)` returns only the fields to update.
  function updateMessage(id, changes) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes(m) } : m)));
  }

  // ---------- Ask a question ----------
  async function ask(question, mode) {
    if (loading || !question.trim()) return;

    const history = buildHistory(messages); // memory = earlier agent turns, BEFORE this one
    const userId = newId();
    const assistantId = newId();
    const isAgent = mode === "agent";

    setLoading(true);
    setMessages((prev) => [
      // Safety: an old, unconfirmed proposal must not stay clickable under a new question
      ...prev.map((m) =>
        m.actionState === "pending"
          ? { ...m, actionState: "expired", actionMessage: "Expired: a new question was asked. Nothing was changed." }
          : m
      ),
      { id: userId, role: "user", mode, content: question },
      {
        id: assistantId,
        role: "assistant",
        mode,
        content: "",
        status: "working",
        statusText: isAgent ? "Agent is thinking..." : "Thinking...",
        error: "",
        steps: isAgent ? [] : null,
        sources: [],
        action: null,
        actionState: null,
        actionMessage: "",
      },
    ]);

    // Each stream event updates ONLY this question's assistant message
    function handleEvent(event) {
      if (event.type === "step") {
        const { icon, label } = getToolInfo(event.tool);
        updateMessage(assistantId, (m) => ({
          steps: [...m.steps, event],
          statusText: `Round ${event.round}: ${icon} ${label}...`,
        }));
      } else if (event.type === "confirm") {
        updateMessage(assistantId, () => ({ action: event, actionState: "pending" }));
      } else if (event.type === "sources") {
        updateMessage(assistantId, () => ({ sources: event.sources }));
      } else if (event.type === "token") {
        updateMessage(assistantId, (m) => ({ content: m.content + event.text }));
      } else if (event.type === "error") {
        updateMessage(assistantId, () => ({ status: "error", error: event.message }));
      }
      // "done": nothing to do, the stream reader in api/ ends by itself
    }

    try {
      if (isAgent) {
        await askAgentStream(question, handleEvent, history);
      } else {
        await askQuestionStream(question, handleEvent);
      }
      // Finished: mark done, unless an "error" event already marked it
      updateMessage(assistantId, (m) => (m.status === "error" ? {} : { status: "done" }));
    } catch (err) {
      updateMessage(assistantId, () => ({ status: "error", error: err.message }));
    } finally {
      setLoading(false);
    }
  }

  // ---------- Human-in-the-loop: the agent proposed an action ----------
  // The ONLY place a proposal turns into a real change: after a human click.
  async function confirmAction(messageId) {
    const message = messages.find((m) => m.id === messageId);
    if (!message || message.actionState !== "pending") return;

    const { action } = message;
    updateMessage(messageId, () => ({ actionState: "busy" }));
    try {
      if (action.action === "delete_document") {
        await removeDocument(action.document_id);
        updateMessage(messageId, () => ({
          actionState: "done",
          actionMessage: `Deleted "${action.filename}".`,
        }));
      }
    } catch (err) {
      // Back to "pending": the card stays, so the user can retry or cancel
      updateMessage(messageId, () => ({
        actionState: "pending",
        actionMessage: `Could not complete the action: ${err.message}`,
      }));
    }
  }

  function cancelAction(messageId) {
    updateMessage(messageId, () => ({
      actionState: "cancelled",
      actionMessage: "Cancelled. Nothing was changed.",
    }));
  }

  // ---------- New chat ----------
  function newChat() {
    if (!loading) setMessages([]);
  }

  return { messages, loading, ask, newChat, confirmAction, cancelAction };
}

// Conversation memory for the backend, computed from the messages (no extra state):
// only AGENT turns that finished well, as [{ role, content }], last MAX_HISTORY only.
function buildHistory(messages) {
  const history = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const question = messages[i];
    const answer = messages[i + 1];
    if (
      question.role === "user" &&
      question.mode === "agent" &&
      answer.role === "assistant" &&
      answer.status === "done" &&
      answer.content
    ) {
      history.push(
        { role: "user", content: question.content.slice(0, MAX_TURN_CHARS) },
        { role: "assistant", content: answer.content.slice(0, MAX_TURN_CHARS) }
      );
    }
  }
  return history.slice(-MAX_HISTORY);
}

export default useChat;
