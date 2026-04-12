interface Post {
  title: string;
  slug: string;
  hook: string;
}

interface ReadingPathResult {
  topic: string;
  posts: Post[];
}

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-skeleton" style={{ width: "55%" }} />
      <div className="chat-tool-timeline" style={{ marginTop: "0.5rem" }}>
        <div className="chat-tool-timeline-item">
          <div className="chat-tool-skeleton" style={{ width: "70%" }} />
          <div className="chat-tool-skeleton" style={{ width: "90%", marginTop: "0.25rem" }} />
        </div>
        <div className="chat-tool-timeline-item">
          <div className="chat-tool-skeleton" style={{ width: "60%" }} />
          <div className="chat-tool-skeleton" style={{ width: "80%", marginTop: "0.25rem" }} />
        </div>
      </div>
    </div>
  );
}

export function ReadingPathCard({ args: _args, result }: { args: any; result?: ReadingPathResult }) {
  if (!result) return <Skeleton />;

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">Reading path: {result.topic}</div>
      <div className="chat-tool-timeline">
        {result.posts.map((post, i) => (
          <div key={i} className="chat-tool-timeline-item">
            {i < result.posts.length - 1 && <div className="chat-tool-timeline-line" />}
            <div className="chat-tool-timeline-dot" />
            <div className="chat-tool-timeline-step">{i + 1}</div>
            <div>
              <a href={`/blog/${post.slug}/`} className="chat-tool-post-title">
                {post.title}
              </a>
              <div className="chat-tool-post-hook">{post.hook}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
