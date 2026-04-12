interface CodeResult {
  repo: string;
  path: string;
  startLine: number;
  endLine: number;
  code: string;
  url: string;
  error?: string;
}

function Skeleton() {
  return (
    <div className="chat-tool-card" style={{ padding: 0 }}>
      <div className="chat-tool-code-header">
        <div className="chat-tool-skeleton" style={{ width: "60%" }} />
      </div>
      <div style={{ padding: "0.625rem" }}>
        <div className="chat-tool-skeleton" style={{ width: "80%" }} />
        <div className="chat-tool-skeleton" style={{ width: "65%", marginTop: "0.375rem" }} />
        <div className="chat-tool-skeleton" style={{ width: "75%", marginTop: "0.375rem" }} />
      </div>
    </div>
  );
}

export function CodeBlock({ args: _args, result }: { args: any; result?: CodeResult }) {
  if (!result) return <Skeleton />;

  if (result.error) {
    return (
      <div className="chat-tool-card">
        <div className="chat-tool-breaks">{result.error}</div>
      </div>
    );
  }

  const lines = result.code.split("\n");

  return (
    <div className="chat-tool-card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="chat-tool-code-header">
        <span>{result.repo} / {result.path}</span>
        <a href={result.url} target="_blank" rel="noopener noreferrer" className="chat-tool-code-link">
          &#8599;
        </a>
      </div>
      <pre className="chat-tool-code-pre">
        <code>
          {lines.map((line, i) => (
            <div key={i}>
              <span className="chat-tool-code-line-num">{result.startLine + i}</span>
              {line}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
