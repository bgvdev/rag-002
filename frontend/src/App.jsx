import { useEffect, useState } from "react";
import { askAgentStream, askQuestionStream, deleteDocument, listDocuments } from "./api";
import AnswerCard from "./components/AnswerCard";
import AskForm from "./components/AskForm";
import BackendStatus from "./components/BackendStatus";
import DocumentList from "./components/DocumentList";
import Loader from "./components/Loader";
import UploadForm from "./components/UploadForm";
import "./App.css";

// Friendly loader text for each agent tool (unknown tools fall back to their raw name)
const STEP_LABELS = {
  search_documents: "🔍 Searching the documents",
  list_documents: "📂 Listing your documents",
  read_document: "📖 Reading a document",
  get_neighbouring_chunks: "🧩 Reading the text around a match",
};

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

  async function handleAsk(question, agentMode) {
    setLoading(true);
    setLoadingMessage(agentMode ? "Agent is thinking..." : "Thinking...");
    setError("");
    setAnswer("");
    setSources([]);
    setSteps(agentMode ? [] : null); // [] = agent with no steps yet; null = normal mode

    // One handler for BOTH modes: they send the same events, the agent just adds "step"
    function handleEvent(event) {
      if (event.type === "step") {
        setSteps((prev) => [...prev, event]); // add this tool call to the list
        setLoadingMessage(`Round ${event.round}: ${STEP_LABELS[event.tool] || event.tool}...`);
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
      await ask(question, handleEvent);
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

      <AskForm onAsk={handleAsk} loading={loading} />
      {/* Loader until the first answer text (or an error) arrives */}
      {loading && !answer && !error && <Loader message={loadingMessage} />}
      <AnswerCard answer={answer} sources={sources} steps={steps} error={error} />
    </div>
  );
}

export default App;
