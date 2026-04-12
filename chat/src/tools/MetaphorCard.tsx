interface MetaphorResult {
  metaphor: string;
  domain1: string;
  domain2: string;
  holds: string[];
  breaks: string[];
  killCondition: string;
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-skeleton" style={{ width: "50%" }} />
      <div className="chat-tool-skeleton" style={{ width: "35%", marginTop: "0.375rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "70%", marginTop: "0.5rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "65%", marginTop: "0.375rem" }} />
    </div>
  );
}

export function MetaphorCard({ args: _args, result }: { args: any; result?: MetaphorResult }) {
  if (!result) return <Skeleton />;

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">{result.metaphor}</div>
      <div className="chat-tool-subtitle">{result.domain1} &#8596; {result.domain2}</div>

      {result.holds.length > 0 && (
        <div className="chat-tool-section">
          {result.holds.map((item, i) => (
            <div key={i} className="chat-tool-holds">
              <span className="chat-tool-check">&#10003;</span>
              {item}
            </div>
          ))}
        </div>
      )}

      {result.breaks.length > 0 && (
        <div className="chat-tool-section">
          {result.breaks.map((item, i) => (
            <div key={i} className="chat-tool-breaks">
              <span className="chat-tool-check">&#10007;</span>
              {item}
            </div>
          ))}
        </div>
      )}

      {result.killCondition && (
        <div className="chat-tool-section">
          <div className="chat-tool-kill">
            <span className="chat-tool-check">&#9888;</span>
            {result.killCondition}
          </div>
        </div>
      )}
    </div>
  );
}
