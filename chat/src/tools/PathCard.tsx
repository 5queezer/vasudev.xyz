interface PathNode {
  id: string;
  label: string;
  sourceFile: string;
  sourceUrl?: string;
  sourceAnchor?: string;
}

interface Step {
  from: string;
  to: string;
  relation: string;
  confidence: number;
}

interface PathResult {
  pathNodes?: PathNode[];
  steps?: Step[];
  hops?: number;
  from?: { label: string };
  to?: { label: string };
  error?: string;
}

function slugFromSourceFile(sourceFile: string): string | null {
  if (!sourceFile.startsWith("content/blog/")) return null;
  return sourceFile.replace("content/blog/", "").replace(/\.md$/, "");
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Shortest Path</div>
      <div className="chat-tool-skeleton" style={{ width: "80%" }} />
      <div className="chat-tool-skeleton" style={{ width: "60%", marginTop: "0.375rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "70%", marginTop: "0.375rem" }} />
    </div>
  );
}

export function PathCard({ args: _args, result }: { args: any; result?: PathResult }) {
  if (!result) return <Skeleton />;

  if (result.error && !result.pathNodes) {
    return (
      <div className="chat-tool-card">
        <div className="chat-tool-title">Shortest Path</div>
        <div className="chat-tool-empty">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">
        Shortest Path ({result.hops} {result.hops === 1 ? "hop" : "hops"})
      </div>
      {result.pathNodes && (
        <div className="chat-tool-path">
          {result.pathNodes.map((node, i) => {
            let label;
            if (node.sourceUrl) {
              label = (
                <a href={node.sourceUrl} target="_blank" rel="noopener" className="chat-tool-badge chat-tool-badge-link">
                  {node.label}
                </a>
              );
            } else {
              const slug = slugFromSourceFile(node.sourceFile);
              if (slug) {
                let url = `/blog/${slug}/`;
                if (node.sourceAnchor) url += `#${node.sourceAnchor}`;
                label = (
                  <a href={url} className="chat-tool-badge chat-tool-badge-link">
                    {node.label}
                  </a>
                );
              } else {
                label = <span className="chat-tool-badge">{node.label}</span>;
              }
            }
            const step = result.steps?.[i];
            return (
              <div key={node.id} className="chat-tool-path-node">
                {label}
                {step && (
                  <span className="chat-tool-path-edge">
                    <span className="chat-tool-connection-arrow">&darr;</span>
                    <span className="chat-tool-connection-relation">{step.relation}</span>
                    <span className="chat-tool-confidence">{Math.round(step.confidence * 100)}%</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
