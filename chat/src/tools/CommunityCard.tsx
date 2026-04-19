interface Member {
  id: string;
  label: string;
  sourceFile: string;
  sourceUrl?: string;
  sourceAnchor?: string;
  degree: number;
  fileType: string;
}

interface CommunityResult {
  seed?: { label: string; id: string };
  communityId?: number;
  members?: Member[];
  cohesion?: number;
  memberCount?: number;
  error?: string;
}

function slugFromSourceFile(sourceFile: string): string | null {
  if (!sourceFile.startsWith("content/blog/")) return null;
  return sourceFile.replace("content/blog/", "").replace(/\.md$/, "");
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Topic Community</div>
      <div className="chat-tool-skeleton" style={{ width: "55%" }} />
      <div className="chat-tool-skeleton" style={{ width: "80%", marginTop: "0.375rem" }} />
      <div className="chat-tool-skeleton" style={{ width: "45%", marginTop: "0.375rem" }} />
    </div>
  );
}

export function CommunityCard({ args: _args, result }: { args: any; result?: CommunityResult }) {
  if (!result) return <Skeleton />;

  if (result.error) {
    return (
      <div className="chat-tool-card">
        <div className="chat-tool-title">Topic Community</div>
        <div className="chat-tool-empty">{result.error}</div>
      </div>
    );
  }

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">
        Community of "{result.seed?.label}"
      </div>
      <div className="chat-tool-subtitle">
        {result.memberCount} members &middot; cohesion {Math.round((result.cohesion ?? 0) * 100)}%
      </div>
      <div className="chat-tool-badges" style={{ flexWrap: "wrap" }}>
        {result.members?.map((m) => {
          const isSeed = m.id === result.seed?.id;
          const cls = `chat-tool-badge chat-tool-badge-link${isSeed ? " chat-tool-badge-active" : ""}`;
          if (m.sourceUrl) {
            return (
              <a key={m.id} href={m.sourceUrl} target="_blank" rel="noopener" className={cls}>
                {m.label}
              </a>
            );
          }
          const slug = slugFromSourceFile(m.sourceFile);
          if (slug) {
            let url = `/blog/${slug}/`;
            if (m.sourceAnchor) url += `#${m.sourceAnchor}`;
            return (
              <a key={m.id} href={url} className={cls}>
                {m.label}
              </a>
            );
          }
          return (
            <span
              key={m.id}
              className={`chat-tool-badge${isSeed ? " chat-tool-badge-active" : ""}`}
            >
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
