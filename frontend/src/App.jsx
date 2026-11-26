import { useEffect, useState } from "react";
import { askAgent, askQuestionStream, deleteDocument, listDocuments } from "./api";
import AnswerCard from "./components/AnswerCard";
import AskForm from "./components/AskForm";
import BackendStatus from "./components/BackendStatus";
import DocumentList from "./components/DocumentList";
import Loader from "./components/Loader";
import UploadForm from "./components/UploadForm";
import "./App.css";

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
    setLoadingMessage(
      agentMode
        ? "Agent is working: searching and reading your documents..."
        : "Thinking..."
    );
    setError("");
    setAnswer("");
    setSources([]);
    setSteps(null);

    try {
      if (agentMode) {
        // Agent: one request, the backend runs the tool loop, everything comes back at once
        const result = await askAgent(question);
        setSteps(result.steps);
        setSources(result.sources);
        setAnswer(result.answer);
        return; // "finally" below still runs
      }

      // Normal: streaming RAG (unchanged)
      await askQuestionStream(question, (event) => {
        if (event.type === "sources") {
          setSources(event.sources);
        } else if (event.type === "token") {
          setAnswer((prev) => prev + event.text); // append the new piece
        } else if (event.type === "error") {
          setError(event.message);
        }
        // "done": nothing to do, the loop in api.js ends by itself
      });
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
