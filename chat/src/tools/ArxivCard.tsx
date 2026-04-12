interface Paper {
  id: string;
  title: string;
  authors: string[];
  authorCount: number;
  summary: string;
  published: string;
  url: string;
  pdf: string;
  categories: string[];
}

interface ArxivCardProps {
  args: { query: string };
  result?: { papers: Paper[]; error?: string };
}

export function ArxivCard({ args, result }: ArxivCardProps) {
  if (!result) {
    return (
      <div className="chat-tool-card">
        <div className="chat-tool-title">Searching arXiv...</div>
        <div className="chat-tool-skeleton" style={{ width: "90%" }} />
        <div className="chat-tool-skeleton" style={{ width: "70%", marginTop: 6 }} />
        <div className="chat-tool-skeleton" style={{ width: "80%", marginTop: 6 }} />
      </div>
    );
  }

  if (result.error || result.papers.length === 0) {
    return (
      <div className="chat-tool-card">
        <div className="chat-tool-title">arXiv Search</div>
        <div style={{ color: "var(--dim)", fontSize: "0.8rem" }}>
          {result.error || `No papers found for "${args.query}"`}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">arXiv Papers</div>
      <div className="chat-tool-arxiv-list">
        {result.papers.map((paper) => (
          <div key={paper.id} className="chat-tool-arxiv-paper">
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-tool-arxiv-title"
            >
              {paper.title}
            </a>
            <div className="chat-tool-arxiv-meta">
              {paper.authors.join(", ")}
              {paper.authorCount > 4 ? ` +${paper.authorCount - 4}` : ""}
              {" · "}
              {paper.published}
            </div>
            <div className="chat-tool-arxiv-summary">{paper.summary}...</div>
            <div className="chat-tool-arxiv-tags">
              {paper.categories.map((cat) => (
                <span key={cat} className="chat-tool-badge">{cat}</span>
              ))}
              <a
                href={paper.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="chat-tool-arxiv-pdf"
              >
                PDF
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
