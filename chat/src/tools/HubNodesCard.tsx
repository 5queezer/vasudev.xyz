interface Hub {
  id: string;
  label: string;
  sourceFile: string;
  degree: number;
  community?: number;
}

interface HubNodesResult {
  hubs: Hub[];
  total: number;
  edgeCount: number;
}

function slugFromSourceFile(sourceFile: string): string | null {
  if (!sourceFile.startsWith("content/blog/")) return null;
  return sourceFile.replace("content/blog/", "").replace(/\.md$/, "");
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Hub Nodes</div>
      <div className="chat-tool-skeleton" style={{ width: "70%" }} />
      <div className="chat-tool-skeleton" style={{ width: "50%", marginTop: "0.375rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "65%", marginTop: "0.375rem" }} />
    </div>
  );
}

export function HubNodesCard({ args: _args, result }: { args: any; result?: HubNodesResult }) {
  if (!result) return <Skeleton />;

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Hub Nodes</div>
      <div className="chat-tool-subtitle">
        {result.total} nodes, {result.edgeCount} edges in graph
      </div>
      <div className="chat-tool-hub-list">
        {result.hubs.map((hub) => {
          const slug = slugFromSourceFile(hub.sourceFile);
          return (
            <div key={hub.id} className="chat-tool-hub-item">
              {slug ? (
                <a href={`/blog/${slug}/`} className="chat-tool-badge chat-tool-badge-link">
                  {hub.label}
                </a>
              ) : (
                <span className="chat-tool-badge">{hub.label}</span>
              )}
              <span className="chat-tool-hub-degree">{hub.degree} connections</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
