import { useEffect, useState } from "react";
import { askAgentStream, askQuestionStream, deleteDocument, listDocuments } from "./api";
import AnswerCard from "./components/AnswerCard";
import AskForm from "./components/AskForm";
import BackendStatus from "./components/BackendStatus";
import ChatHistory from "./components/ChatHistory";
import ConfirmAction from "./components/ConfirmAction";
import DocumentList from "./components/DocumentList";
import Loader from "./components/Loader";
import UploadForm from "./components/UploadForm";
import { getToolInfo } from "./toolInfo";
import "./App.css";

// Conversation memory: keep at most this many earlier messages.
// Must not exceed MAX_HISTORY_TURNS in backend/app/schemas/chat.py (also 20), or the backend returns 422.
const MAX_HISTORY = 20;
const MAX_TURN_CHARS = 4000; // same as MAX_TURN_CHARS in the backend schema

function App() {
  // ---------- Documents ----------
  const [documents, setDocuments] = useState([]);

  async function loadDocuments() {
    try {
      setDocuments(await listDocuments());
    } catch (err) {
      console.error("Could not load documents:", err);
    }
  }

  // Load the list once when the page opens
  useEffect(() => {
    loadDocuments();
  }, []);

  async function handleDelete(documentId) {
    if (!window.confirm("Delete this document and all its chunks?")) return;

    try {
      await deleteDocument(documentId);
      await loadDocuments();
    } catch (err) {
      alert(err.message);
    }
  }

  // ---------- Chat ----------
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [steps, setSteps] = useState(null); // agent tool calls; null = normal mode
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  // Conversation memory (agent mode): earlier turns, oldest first.
  // [{ role: "user", content: "..." }, { role: "assistant", content: "..." }, ...]
  const [history, setHistory] = useState([]);
  // true = the answer on screen was saved as the LAST pair of `history`
  const [answerSaved, setAnswerSaved] = useState(false);

  // Turns to show in the conversation card: everything EXCEPT the pair that
  // AnswerCard is already showing (otherwise the latest answer appears twice).
  const earlierTurns = answerSaved ? history.slice(0, -2) : history;

  function handleNewChat() {
    setHistory([]);
    setAnswerSaved(false);
  }

  // ---------- Human-in-the-loop (agent-proposed actions) ----------
  const [pendingAction, setPendingAction] = useState(null); // the "confirm" event, or null
  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState(""); // "Deleted ..." / "Cancelled ..."

  // The ONLY place an agent proposal turns into a real change: after a human click
  async function handleConfirmAction() {
    const action = pendingAction;
    setActionBusy(true);
    try {
      if (action.action === "delete_document") {
        await deleteDocument(action.document_id); // the normal DELETE /documents/{id}
        await loadDocuments(); // refresh the document list on screen
        setActionResult(`🗑️ Deleted "${action.filename}".`);
      }
      setPendingAction(null);
    } catch (err) {
      setActionResult(`Could not complete the action: ${err.message}`);
    } finally {
      setActionBusy(false);
    }
  }

  function handleCancelAction() {
    setPendingAction(null);
    setActionResult("Cancelled. Nothing was changed.");
  }

  async function handleAsk(question, agentMode) {
    setLoading(true);
    setLoadingMessage(agentMode ? "Agent is thinking..." : "Thinking...");
    setError("");
    setAnswer("");
    setSources([]);
    setSteps(agentMode ? [] : null); // [] = agent with no steps yet; null = normal mode
    setPendingAction(null); // a new question drops any old, unconfirmed proposal
    setActionResult("");
    setAnswerSaved(false); // the old answer leaves the answer card -> show it in the history

    // Local copies for THIS question. React state (answer) updates asynchronously,
    // so after the stream ends we read these instead of the `answer` state.
    let fullAnswer = "";
    let failed = false;

    // One handler for BOTH modes: they send the same events, the agent just adds "step"
    function handleEvent(event) {
      if (event.type === "token") fullAnswer += event.text;
      if (event.type === "error") failed = true;

      if (event.type === "step") {
        setSteps((prev) => [...prev, event]); // add this tool call to the list
        const { icon, label } = getToolInfo(event.tool);
        setLoadingMessage(`Round ${event.round}: ${icon} ${label}...`);
      } else if (event.type === "confirm") {
        setPendingAction(event); // show Confirm / Cancel; nothing is changed yet
      } else if (event.type === "sources") {
        setSources(event.sources);
      } else if (event.type === "token") {
        setAnswer((prev) => prev + event.text); // append the new piece
      } else if (event.type === "error") {
        setError(event.message);
      }
      // "done": nothing to do, the loop in api.js ends by itself
    }

    try {
      const ask = agentMode ? askAgentStream : askQuestionStream;
      await ask(question, handleEvent, history); // normal mode ignores the 3rd argument

      // Remember this turn (agent mode only, and only if it succeeded).
      // .slice(-MAX_HISTORY) keeps the LAST 20 messages: the oldest ones drop off.
      if (agentMode && !failed && fullAnswer) {
        setHistory((prev) =>
          [
            ...prev,
            { role: "user", content: question.slice(0, MAX_TURN_CHARS) },
            { role: "assistant", content: fullAnswer.slice(0, MAX_TURN_CHARS) },
          ].slice(-MAX_HISTORY)
        );
        setAnswerSaved(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>RAG Chat</h1>
      <BackendStatus />

      <UploadForm onUploaded={loadDocuments} />
      <DocumentList documents={documents} onDelete={handleDelete} />

      <ChatHistory
        turns={earlierTurns}
        rememberedCount={history.length / 2}
        onNewChat={handleNewChat}
        disabled={loading}
      />
      <AskForm onAsk={handleAsk} loading={loading} />
      {/* Loader until the first answer text (or an error) arrives */}
      {loading && !answer && !error && <Loader message={loadingMessage} />}
      <AnswerCard answer={answer} sources={sources} steps={steps} error={error} />
      <ConfirmAction
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        busy={actionBusy}
      />
      {actionResult && <p className="card muted">{actionResult}</p>}
    </div>
  );
}

export default App;
