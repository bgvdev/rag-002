import { useEffect, useRef } from "react";
import AssistantMessage from "./AssistantMessage";
import EmptyState from "./EmptyState";

// The scrolling list of messages (or the welcome screen when there are none).
// Keeps itself scrolled to the newest message, unless the user scrolled up to read.
// Props:
//   messages        - from useChat
//   loading         - true while an answer is streaming
//   documentCount   - for the empty state
//   onAsk(text, mode)             - a suggestion was clicked
//   onConfirm(id), onCancel(id)   - choice on an agent-proposed action
function ChatThread({ messages, loading, documentCount, onAsk, onConfirm, onCancel }) {
  const threadRef = useRef(null); // the scrolling <div>
  const stickToBottom = useRef(true); // was the user at the bottom before this update?

  // Remember whether the user is (near) the bottom. Scrolling up to read sets it to false,
  // so new tokens don't yank them back down; scrolling to the bottom again sets it to true.
  function handleScroll() {
    const el = threadRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // After every change to the messages (new message, each streamed token):
  // scroll to the bottom, but only if the user was already there.
  useEffect(() => {
    if (messages.length === 0) {
      stickToBottom.current = true; // a new chat always starts following the newest message
      return;
    }
    const el = threadRef.current;
    if (el && stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="thread" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <EmptyState documentCount={documentCount} onPick={onAsk} disabled={loading} />
      </div>
    );
  }

  // The newest assistant message: its steps start opened
  const latestAssistantId = messages.findLast((m) => m.role === "assistant")?.id;

  return (
    // role="log": screen readers treat this as a chat log and read new messages politely
    <div className="thread" ref={threadRef} onScroll={handleScroll} role="log" aria-live="polite">
      <div className="thread-inner">
        {messages.map((message) =>
          message.role === "user" ? (
            <div key={message.id} className="msg-user">
              {message.content}
            </div>
          ) : (
            <AssistantMessage
              key={message.id}
              message={message}
              isLatest={message.id === latestAssistantId}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          )
        )}
      </div>
    </div>
  );
}

export default ChatThread;
