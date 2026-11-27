import ChatThread from "./components/chat/ChatThread";
import Composer from "./components/chat/Composer";
import Sidebar from "./components/sidebar/Sidebar";
import useChat from "./hooks/useChat";
import useDocuments from "./hooks/useDocuments";
import "./App.css";

// App only CONNECTS things: two hooks hold the data and logic,
// components show it. No fetching, streaming or business rules in here.
function App() {
  // Called ONCE here, then passed down, so the sidebar and the chat share one list
  // (a delete confirmed in the chat refreshes the sidebar too).
  const documents = useDocuments();
  const chat = useChat({ removeDocument: documents.remove });

  return (
    <div className="layout">
      <Sidebar
        documents={documents.documents}
        documentsError={documents.error}
        onUploaded={documents.reload}
        onDeleteDocument={documents.remove}
        onNewChat={chat.newChat}
        newChatDisabled={chat.loading || chat.messages.length === 0}
      />

      <main className="chat-main">
        <ChatThread
          messages={chat.messages}
          loading={chat.loading}
          documentCount={documents.documents.length}
          onAsk={chat.ask}
          onConfirm={chat.confirmAction}
          onCancel={chat.cancelAction}
        />
        <Composer onAsk={chat.ask} loading={chat.loading} />
      </main>
    </div>
  );
}

export default App;
