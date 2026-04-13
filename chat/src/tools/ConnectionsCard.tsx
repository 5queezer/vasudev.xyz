import { MiniGraph } from "./MiniGraph";

interface Match {
  id: string;
  label: string;
  sourceFile: string;
  community?: number;
}

interface Connection {
  from: string;
  to: string;
  relation: string;
  confidence?: number;
  fromLabel: string;
  toLabel: string;
}

interface Hyperedge {
  label: string;
  nodes: string[];
}

interface ConnectionsResult {
  matches: Match[];
  connections: Connection[];
  hyperedges: Hyperedge[];
}

function slugFromSourceFile(sourceFile: string): string | null {
  if (!sourceFile.startsWith("content/blog/")) return null;
  return sourceFile.replace("content/blog/", "").replace(/\.md$/, "");
}

function NodeBadge({ match }: { match: Match }) {
  const slug = slugFromSourceFile(match.sourceFile);
  if (slug) {
    return (
      <a href={`/blog/${slug}/`} className="chat-tool-badge chat-tool-badge-link">
        {match.label}
      </a>
    );
  }
  return <span className="chat-tool-badge">{match.label}</span>;
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Knowledge Graph</div>
      <div className="chat-tool-skeleton" style={{ width: "60%" }} />
      <div className="chat-tool-skeleton" style={{ width: "80%", marginTop: "0.375rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "45%", marginTop: "0.375rem" }} />
    </div>
  );
}

export function ConnectionsCard({ args: _args, result }: { args: any; result?: ConnectionsResult }) {
  if (!result) return <Skeleton />;

  const graphNodes = result.matches.map((m) => ({
    id: m.id,
    label: m.label,
    sourceFile: m.sourceFile,
    community: m.community,
  }));

  const nodeSet = new Set(graphNodes.map((n) => n.id));

  for (const c of result.connections) {
    if (!nodeSet.has(c.from)) {
      nodeSet.add(c.from);
      graphNodes.push({ id: c.from, label: c.fromLabel, sourceFile: "", community: undefined });
    }
    if (!nodeSet.has(c.to)) {
      nodeSet.add(c.to);
      graphNodes.push({ id: c.to, label: c.toLabel, sourceFile: "", community: undefined });
    }
  }

  const graphLinks = result.connections.map((c) => ({
    source: c.from,
    target: c.to,
    relation: c.relation,
    confidence: c.confidence ?? 1.0,
  }));

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Knowledge Graph</div>

      {graphNodes.length > 1 && graphLinks.length > 0 && (
        <MiniGraph nodes={graphNodes} links={graphLinks} />
      )}

      {result.matches.length > 0 && (
        <div className="chat-tool-badges">
          {result.matches.map((m) => (
            <NodeBadge key={m.id} match={m} />
          ))}
        </div>
      )}

      {result.connections.length > 0 && (
        <div className="chat-tool-connections">
          {result.connections.map((c, i) => (
            <div key={i} className="chat-tool-connection">
              <span>{c.fromLabel}</span>
              <span className="chat-tool-connection-arrow">&rarr;</span>
              <span>{c.toLabel}</span>
              <span className="chat-tool-connection-relation">{c.relation}</span>
              {c.confidence != null && (
                <span className="chat-tool-confidence">{Math.round(c.confidence * 100)}%</span>
              )}
            </div>
          ))}
        </div>
      )}

      {result.hyperedges.length > 0 && (
        <div className="chat-tool-hyperedges">
          {result.hyperedges.map((h, i) => (
            <div key={i} className="chat-tool-hyperedge">
              <div className="chat-tool-subtitle">{h.label}</div>
              <div className="chat-tool-badges">
                {h.nodes.map((n, j) => (
                  <span key={j} className="chat-tool-badge">{n}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
