import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { ConnectionsCard } from "./tools/ConnectionsCard";
import { MetaphorCard } from "./tools/MetaphorCard";
import { ReadingPathCard } from "./tools/ReadingPathCard";
import { CodeBlock } from "./tools/CodeBlock";
import { ChartCard } from "./tools/ChartCard";

const toolComponents: Record<string, React.ComponentType<{ args: any; result?: any }>> = {
  showConnections: ConnectionsCard,
  analyzeMetaphor: MetaphorCard,
  suggestReadingPath: ReadingPathCard,
  showCode: CodeBlock,
  showChart: ChartCard,
};

function ToolResult({ invocation }: { invocation: any }) {
  const Component = toolComponents[invocation.toolName as keyof typeof toolComponents];
  if (!Component) return null;
  const isLoading = invocation.state !== "result";
  return <Component args={invocation.args} result={isLoading ? undefined : invocation.result} />;
}

interface ChatWidgetProps {
  apiUrl: string;
  postUrl: string;
}

const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 500;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 350;

function clampWidth(w: number) {
  return Math.max(MIN_WIDTH, Math.min(w, window.innerWidth * 0.9));
}
function clampHeight(h: number) {
  return Math.max(MIN_HEIGHT, Math.min(h, window.innerHeight * 0.85));
}

function loadPanelSize(): { width: number; height: number } {
  try {
    const raw = localStorage.getItem("chat-panel-size");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        width: clampWidth(parsed.width ?? DEFAULT_WIDTH),
        height: clampHeight(parsed.height ?? DEFAULT_HEIGHT),
      };
    }
  } catch {}
  return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

export function ChatWidget({ apiUrl, postUrl }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const resizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const saved = loadPanelSize();
    setPanelWidth(saved.width);
    setPanelHeight(saved.height);
  }, []);

  const handleResizeMove = useCallback((clientX: number, clientY: number) => {
    if (!resizing.current) return;
    const newWidth = clampWidth(startPos.current.w + (startPos.current.x - clientX));
    const newHeight = clampHeight(startPos.current.h + (startPos.current.y - clientY));
    setPanelWidth(newWidth);
    setPanelHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    if (!resizing.current) return;
    resizing.current = false;
    setPanelWidth((w) => {
      setPanelHeight((h) => {
        try {
          localStorage.setItem("chat-panel-size", JSON.stringify({ width: w, height: h }));
        } catch {}
        return h;
      });
      return w;
    });
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleResizeMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleResizeMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => handleResizeEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      resizing.current = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      startPos.current = { x: clientX, y: clientY, w: panelWidth, h: panelHeight };
    },
    [panelWidth, panelHeight],
  );

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

      <div
        className={`chat-panel ${isOpen ? "chat-panel-open" : ""}`}
        style={isOpen ? { width: panelWidth, height: panelHeight } : undefined}
      >
        <div
          className="chat-resize-handle"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        />
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
              {msg.content && <div>{msg.content}</div>}
              {msg.toolInvocations?.map((inv: any, i: number) => (
                <ToolResult key={`${msg.id}-tool-${i}`} invocation={inv} />
              ))}
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
