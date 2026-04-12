import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";

interface ChatWidgetProps {
  apiUrl: string;
  postUrl: string;
}

export function ChatWidget({ apiUrl, postUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postUrl) return;
    fetch(postUrl)
      .then((res) => (res.ok ? res.text() : ""))
      .then(setPostContent)
      .catch(() => setPostContent(""));
  }, [postUrl]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: apiUrl,
      body: { postContent },
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: "Ask me anything about this post.",
        },
      ],
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <button
        className="chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      <div className={`chat-panel ${isOpen ? "chat-panel-open" : ""}`}>
        <div className="chat-header">
          <span className="chat-title">Ask this post</span>
          <button
            className="chat-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.role === "user" ? "chat-msg chat-msg-user" : "chat-msg chat-msg-assistant"
              }
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="chat-msg chat-msg-assistant">
              <span className="chat-dots">
                <span /><span /><span />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            className="chat-input"
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a question..."
            autoComplete="off"
          />
          <button className="chat-send" type="submit" disabled={isLoading || !input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
