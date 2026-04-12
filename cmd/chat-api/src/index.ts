import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

interface Env {
  OPENROUTER_API_KEY: string;
}

const ALLOWED_ORIGINS = [
  "https://vasudev.xyz",
  "http://localhost:1313",
];

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const MAX_MESSAGES = 10;

const rateLimitMap = new Map<string, number[]>();

function corsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return false;
}

interface GraphNode {
  id: string;
  label: string;
  source_file?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

interface GraphHyperedge {
  label: string;
  nodes: string[];
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hyperedges?: GraphHyperedge[];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) {
      return new Response("Rate limit exceeded", { status: 429, headers: cors });
    }

    let body: { messages?: unknown[]; postContent?: string; mode?: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: cors });
    }

    if (!Array.isArray(body.messages) || typeof body.postContent !== "string") {
      return new Response("Invalid request body", { status: 400, headers: cors });
    }

    if (body.messages.length > MAX_MESSAGES) {
      return new Response("Too many messages (max 10)", { status: 400, headers: cors });
    }

    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    });

    let cachedGraph: GraphData | null = null;

    async function fetchGraph(): Promise<GraphData> {
      if (cachedGraph) return cachedGraph;
      const res = await fetch("https://vasudev.xyz/data/graph.json");
      cachedGraph = (await res.json()) as GraphData;
      return cachedGraph;
    }

    const result = streamText({
      model: openrouter("nvidia/nemotron-3-super-120b-a12b:free"),
      system: `You are a knowledgeable assistant for the blog vasudev.xyz by Christian Pojoni. ${
        body.mode === "index"
          ? "The reader is browsing the blog index. You have an overview of all posts. Help them find posts by topic, suggest what to read, and answer questions about the blog's content. When recommending posts, use suggestReadingPath to render clickable links. CRITICAL: extract the exact slug from the URL in the blog overview (e.g. from '/blog/patanjali-harness-spec/index.txt' the slug is 'patanjali-harness-spec'). Do NOT invent slugs from post titles."
          : "You answer questions about the blog post the reader is currently viewing."
      } Be concise, direct, and technical. Do not use filler phrases. If the post bridges engineering with philosophy (Vedic, neuroscience, etc.), engage with both sides seriously.

About the author: Christian Pojoni builds backend systems and developer tools. 17 years of shipping software across fintech, consumer electronics, and AI tooling. Currently working with MCP and agent-to-agent protocols in Rust. Previous work includes testing infrastructure at FAANG scale (100k+ daily requests, 60 engineers across three continents) and an OAuth 2.1 contribution to Reactive Resume (35k+ stars). Open source: github.com/5queezer. Austrian, raised in Romania, based in Madrid. Writes in English, thinks in German. Cares about correctness, maintainability, and developer experience.

${body.mode === "index" ? "Blog overview" : "Post content"}:
${body.postContent}

You have tools available:
- showConnections: show knowledge graph connections for a concept
- analyzeMetaphor: render a structured metaphor analysis card
- suggestReadingPath: suggest an ordered reading path for a topic
- showCode: fetch and display code from GitHub repos (5queezer org)
- showChart: render a bar or line chart from data
- searchArxiv: search arXiv for academic papers to verify citations or find related research
IMPORTANT rules:
- Whenever you mention or recommend blog posts, ALWAYS use suggestReadingPath to render them as clickable links. Never write post titles as plain text.
- Always use searchArxiv when the reader asks about papers, citations, or research. Never list papers from memory.
- Only use showConnections when the user explicitly asks about knowledge graph connections or concept relationships. Do not use it for general post discovery.
- After a tool call, write only a brief 1-2 sentence comment. The tool renders a rich card with links and details. Do not re-list the information the tool already showed.
- For showCode, only fetch from repos under the 5queezer GitHub org.`,
      messages: body.messages as Parameters<typeof streamText>[0]["messages"],
      maxSteps: 3,
      tools: {
        showConnections: tool({
          description: "Query the knowledge graph to find connections between concepts or posts",
          parameters: z.object({
            query: z.string().describe("The concept or post to find connections for"),
          }),
          execute: async ({ query }) => {
            const graph = await fetchGraph();
            const lowerQuery = query.toLowerCase();

            const matches = graph.nodes
              .filter(
                (n) =>
                  n.label.toLowerCase().includes(lowerQuery) &&
                  n.source_file?.startsWith("content/blog/")
              )
              .slice(0, 5)
              .map((n) => ({ id: n.id, label: n.label, sourceFile: n.source_file ?? "" }));

            const matchIds = new Set(matches.map((m) => m.id));

            const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

            const connections = (graph.edges ?? [])
              .filter((e) => matchIds.has(e.from) || matchIds.has(e.to))
              .slice(0, 10)
              .map((e) => ({
                from: e.from,
                to: e.to,
                relation: e.relation,
                fromLabel: nodeById.get(e.from)?.label ?? e.from,
                toLabel: nodeById.get(e.to)?.label ?? e.to,
              }));

            const hyperedges = (graph.hyperedges ?? [])
              .filter((h) => h.nodes.some((nid) => matchIds.has(nid)))
              .map((h) => ({ label: h.label, nodes: h.nodes }));

            return { matches, connections, hyperedges };
          },
        }),

        analyzeMetaphor: tool({
          description: "Render a structured metaphor analysis card",
          parameters: z.object({
            metaphor: z.string().describe("The metaphor/analogy being analyzed"),
            domain1: z.string().describe("The engineering/technical domain"),
            domain2: z.string().describe("The philosophical/scientific domain"),
            holds: z.array(z.string()).describe("Where the metaphor holds"),
            breaks: z.array(z.string()).describe("Where the metaphor breaks"),
            killCondition: z.string().describe("Measurable condition that would invalidate the metaphor"),
          }),
          execute: async ({ metaphor, domain1, domain2, holds, breaks, killCondition }) => {
            return { metaphor, domain1, domain2, holds, breaks, killCondition };
          },
        }),

        suggestReadingPath: tool({
          description: "Suggest an ordered reading path for a topic",
          parameters: z.object({
            topic: z.string().describe("The topic the reader is interested in"),
            posts: z.array(
              z.object({
                title: z.string(),
                slug: z.string().describe("URL slug like 'why-ai-agents-need-sleep'"),
                hook: z.string().describe("One-line description of why to read this post"),
              })
            ).describe("Ordered list of posts to read, max 6"),
          }),
          execute: async ({ topic, posts }) => {
            return { topic, posts };
          },
        }),

        showCode: tool({
          description: "Fetch and display code from a GitHub repository",
          parameters: z.object({
            repo: z.string().describe("GitHub repo in owner/name format, e.g. '5queezer/hrafn'"),
            path: z.string().describe("File path in the repo"),
            startLine: z.number().optional().describe("Start line number"),
            endLine: z.number().optional().describe("End line number"),
          }),
          execute: async ({ repo, path, startLine, endLine }) => {
            try {
              const res = await fetch(
                `https://raw.githubusercontent.com/${repo}/HEAD/${path}`
              );
              if (!res.ok) {
                return { error: `Could not fetch ${repo}/${path}` };
              }
              const text = await res.text();
              const lines = text.split("\n");
              const start = startLine ?? 1;
              const end = Math.min(endLine ?? start + 49, start + 49, lines.length);
              const code = lines.slice(start - 1, end).join("\n");
              const url = `https://github.com/${repo}/blob/master/${path}#L${start}-L${end}`;
              return { repo, path, startLine: start, endLine: end, code, url };
            } catch {
              return { error: `Could not fetch ${repo}/${path}` };
            }
          },
        }),

        showChart: tool({
          description: "Structure data for a chart visualization",
          parameters: z.object({
            title: z.string().describe("Chart title"),
            type: z.enum(["bar", "line"]).describe("Chart type"),
            labels: z.array(z.string()).describe("X-axis labels"),
            datasets: z.array(
              z.object({
                label: z.string(),
                data: z.array(z.number()),
              })
            ).describe("Data series to plot"),
          }),
          execute: async ({ title, type, labels, datasets }) => {
            return { title, type, labels, datasets };
          },
        }),

        searchArxiv: tool({
          description: "Search arXiv for academic papers. Use this to verify paper citations, find related research, or answer questions about specific papers mentioned in the post.",
          parameters: z.object({
            query: z.string().describe("Search query for arXiv papers"),
          }),
          execute: async ({ query }) => {
            try {
              const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=5&sortBy=relevance`;
              const res = await fetch(url);
              if (!res.ok) return { papers: [], error: "arXiv API unavailable" };
              const xml = await res.text();

              const entries = xml.split("<entry>").slice(1);
              const papers = entries.map((entry) => {
                const get = (tag: string) => {
                  const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
                  return m ? m[1].trim() : "";
                };
                const authors = [...entry.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map(m => m[1]);
                const id = get("id");
                const arxivId = id.replace("http://arxiv.org/abs/", "");
                return {
                  id: arxivId,
                  title: get("title").replace(/\s+/g, " "),
                  authors: authors.slice(0, 4),
                  authorCount: authors.length,
                  summary: get("summary").replace(/\s+/g, " ").slice(0, 300),
                  published: get("published").slice(0, 10),
                  url: id.replace("http://", "https://"),
                  pdf: `https://arxiv.org/pdf/${arxivId}`,
                  categories: [...entry.matchAll(/category term="([^"]+)"/g)].map(m => m[1]).slice(0, 3),
                };
              });

              return { papers };
            } catch {
              return { papers: [], error: "Failed to search arXiv" };
            }
          },
        }),
      },
    });

    const response = result.toDataStreamResponse();

    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) {
      headers.set(k, v);
    }
    headers.set("x-vercel-ai-data-stream", "v1");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
