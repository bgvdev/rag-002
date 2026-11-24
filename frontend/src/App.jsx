import { useEffect, useState } from "react";
import { askQuestion, deleteDocument, listDocuments } from "./api";
import AnswerCard from "./components/AnswerCard";
import AskForm from "./components/AskForm";
import BackendStatus from "./components/BackendStatus";
import DocumentList from "./components/DocumentList";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAsk(question) {
    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const data = await askQuestion(question);
      setAnswer(data.answer);
      setSources(data.sources);
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
      <AnswerCard answer={answer} sources={sources} error={error} />
    </div>
  );
}

export default App;
