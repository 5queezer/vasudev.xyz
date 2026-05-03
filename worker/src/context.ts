export type Msg = { role: "system" | "user" | "assistant"; content: string };

export type AgentContext = {
  postContent?: string;
  mode?: string;
  lang?: string;
};

export const SYSTEM_PROMPT = `You are the on-site agent for vasudev.xyz, the personal site of Christian Pojoni — a systems engineer working in Rust, Python, AI tooling, and privacy-first architecture.

Be concise, calm, and technically literate. When asked about projects, refer to: hrafn (Rust agent runtime, MCP/A2A, MuninnDB memory), axiom-vault (Rust encrypted vault, XChaCha20-Poly1305), distill (Python MCP server for team memory, FastMCP + SQLite FTS5), nexus-crm (Next.js + Prisma + TanStack). When asked about the site, mention: Hugo, GitHub Pages, Giscus comments, this Cloudflare Worker, and the free Nemotron model.

Never invent biographical facts. If unsure, say so.`;

export function buildSystemPrompt(body: AgentContext): string {
  const context = postContentExcerpt(body);
  return context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;
}

export function buildFinalMessages(messages: Msg[], body: AgentContext): Msg[] {
  return [{ role: "system", content: buildSystemPrompt(body) }, ...messages];
}

export function buildControllerMessages(messages: Msg[], body: AgentContext): Msg[] {
  return [
    {
      role: "system",
      content: [
        buildSystemPrompt(body),
        "You are deciding whether to answer directly or call exactly one safe server-side tool before answering.",
        "Call github_search for broad GitHub discovery, github_get for a known GitHub resource, and run_subagents for complex multi-angle analysis.",
        "If no tool is useful, do not call a tool. The next model call will stream the final answer.",
        "Never request write access or mutating actions.",
      ].join("\n\n"),
    },
    ...messages,
  ];
}

function postContentExcerpt(body: AgentContext): string {
  if (typeof body.postContent !== "string" || !body.postContent.trim()) return "";
  return `Current page or post content excerpt:\n${body.postContent.slice(0, 8000)}`;
}
