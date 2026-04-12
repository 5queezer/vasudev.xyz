import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { ConnectionsCard } from "./tools/ConnectionsCard";
import { MetaphorCard } from "./tools/MetaphorCard";
import { ReadingPathCard } from "./tools/ReadingPathCard";
import { CodeBlock } from "./tools/CodeBlock";
import { ChartCard } from "./tools/ChartCard";
import { ArxivCard } from "./tools/ArxivCard";

const toolComponents: Record<string, React.ComponentType<{ args: any; result?: any }>> = {
  showConnections: ConnectionsCard,
  analyzeMetaphor: MetaphorCard,
  suggestReadingPath: ReadingPathCard,
  showCode: CodeBlock,
  showChart: ChartCard,
  searchArxiv: ArxivCard,
};

function renderMarkdown(text: string): JSX.Element {
  const html = text
    // code blocks (```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="chat-md-pre"><code>$2</code></pre>')
    // inline code
    .replace(/`([^`]+)`/g, '<code class="chat-md-code">$1</code>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
      const safeUrl = /^https?:\/\//.test(url) ? url : '#';
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    })
    // numbered lists
    .replace(/^(\d+)\.\s+(.+)$/gm, '<li value="$1">$2</li>')
    // bullet lists
    .replace(/^[-•]\s+(.+)$/gm, "<li>$1</li>")
    // wrap consecutive <li> in <ol> or <ul>
    .replace(/((?:<li value="\d+">[^]*?<\/li>\s*)+)/g, "<ol>$1</ol>")
    .replace(/((?:<li>(?!.*value=)[^]*?<\/li>\s*)+)/g, "<ul>$1</ul>")
    // paragraphs (double newline)
    .replace(/\n\n/g, "</p><p>")
    // single newlines (not inside pre)
    .replace(/\n/g, "<br/>");

  return <div className="chat-md" dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}

function ToolResult({ invocation }: { invocation: any }) {
  const Component = toolComponents[invocation.toolName as keyof typeof toolComponents];
  if (!Component) return null;
  const isLoading = invocation.state !== "result";
  return <Component args={invocation.args} result={isLoading ? undefined : invocation.result} />;
}

interface ChatWidgetProps {
  apiUrl: string;
  postUrl: string;
  mode: "post" | "index";
  lang: string;
}

const i18n: Record<string, Record<string, string>> = {
  en: {
    title: "Ask this post",
    titleIndex: "Ask this blog",
    welcome: "Ask me anything about this post.",
    welcomeIndex: "Ask me about any topic covered on this blog.",
    placeholder: "Type a question...",
  },
  de: {
    title: "Frag diesen Post",
    titleIndex: "Frag diesen Blog",
    welcome: "Frag mich etwas zu diesem Post.",
    welcomeIndex: "Frag mich zu einem Thema dieses Blogs.",
    placeholder: "Frage eingeben...",
  },
  es: {
    title: "Pregunta sobre este post",
    titleIndex: "Pregunta sobre este blog",
    welcome: "Pregúntame lo que quieras sobre este post.",
    welcomeIndex: "Pregúntame sobre cualquier tema de este blog.",
    placeholder: "Escribe una pregunta...",
  },
};

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

export function ChatWidget({ apiUrl, postUrl, mode, lang }: ChatWidgetProps) {
  const t = i18n[lang] || i18n.en;
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
      body: { postContent, mode, lang },
      initialMessages: [
        {
          id: "welcome",
          role: "assistant",
          content: mode === "index" ? t.welcomeIndex : t.welcome,
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
          <span className="chat-title">{mode === "index" ? t.titleIndex : t.title}</span>
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
              {msg.content && (msg.role === "user" ? <div>{msg.content}</div> : renderMarkdown(msg.content))}
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
            placeholder={t.placeholder}
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
