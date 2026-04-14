interface Hub {
  id: string;
  label: string;
  sourceFile: string;
  sourceUrl?: string;
  sourceAnchor?: string;
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
          let badge;
          if (hub.sourceUrl) {
            badge = (
              <a href={hub.sourceUrl} target="_blank" rel="noopener" className="chat-tool-badge chat-tool-badge-link">
                {hub.label}
              </a>
            );
          } else {
            const slug = slugFromSourceFile(hub.sourceFile);
            if (slug) {
              let url = `/blog/${slug}/`;
              if (hub.sourceAnchor) url += `#${hub.sourceAnchor}`;
              badge = (
                <a href={url} className="chat-tool-badge chat-tool-badge-link">
                  {hub.label}
                </a>
              );
            } else {
              badge = <span className="chat-tool-badge">{hub.label}</span>;
            }
          }
          return (
            <div key={hub.id} className="chat-tool-hub-item">
              {badge}
              <span className="chat-tool-hub-degree">{hub.degree} connections</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
