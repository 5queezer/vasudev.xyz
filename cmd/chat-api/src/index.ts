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
  source_url?: string;
  source_anchor?: string;
  file_type?: string;
  community?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  confidence?: string;
  confidence_score?: number;
  weight?: number;
  source_file?: string;
}

interface GraphHyperedge {
  id: string;
  label: string;
  nodes: string[];
  relation?: string;
  confidence_score?: number;
}

interface RawGraphJSON {
  nodes: GraphNode[];
  links: GraphEdge[];
  graph?: { hyperedges?: GraphHyperedge[] };
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hyperedges: GraphHyperedge[];
  nodeById: Map<string, GraphNode>;
  adj: Map<string, { edge: GraphEdge; neighbor: string; reversed: boolean }[]>;
  degree: Map<string, number>;
}

function scoreMatch(node: GraphNode, terms: string[]): number {
  const label = node.label.toLowerCase();
  const normalizedLabel = label.replace(/[_\-]+/g, " ").trim();
  const fullQuery = terms.join(" ");
  const file = (node.source_file ?? "").toLowerCase();
  let score = 0;
  if (normalizedLabel === fullQuery) score += 3;
  for (const t of terms) {
    if (label === t) score += 3;
    else if (label.includes(t)) score += 1;
    if (file.includes(t)) score += 0.5;
  }
  return score;
}

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[\s_\-]+/).filter((t) => t.length > 1);
}

function buildGraphIndex(raw: RawGraphJSON): GraphData {
  const edges = raw.links ?? [];
  const hyperedges = raw.graph?.hyperedges ?? [];
  const nodeById = new Map(raw.nodes.map((n) => [n.id, n]));
  const adj = new Map<string, { edge: GraphEdge; neighbor: string; reversed: boolean }[]>();
  const degree = new Map<string, number>();

  for (const node of raw.nodes) {
    adj.set(node.id, []);
    degree.set(node.id, 0);
  }

  for (const e of edges) {
    const s = e.source;
    const t = e.target;
    if (adj.has(s)) {
      adj.get(s)!.push({ edge: e, neighbor: t, reversed: false });
      degree.set(s, (degree.get(s) ?? 0) + 1);
    }
    if (adj.has(t)) {
      adj.get(t)!.push({ edge: e, neighbor: s, reversed: true });
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
  }

  return { nodes: raw.nodes, edges, hyperedges, nodeById, adj, degree };
}

function bfsTraverse(
  graph: GraphData,
  seedIds: string[],
  maxDepth: number,
  maxNodes: number,
): { visitedNodes: string[]; traversedEdges: GraphEdge[] } {
  const visited = new Set<string>();
  const traversedEdges: GraphEdge[] = [];
  const queue: { id: string; depth: number }[] = [];

  for (const id of seedIds) {
    if (graph.adj.has(id)) {
      visited.add(id);
      queue.push({ id, depth: 0 });
    }
  }

  let head = 0;
  while (head < queue.length && visited.size < maxNodes) {
    const { id, depth } = queue[head++];
    if (depth >= maxDepth) continue;
    const neighbors = graph.adj.get(id) ?? [];
    const sorted = neighbors.slice().sort(
      (a, b) => (b.edge.confidence_score ?? 0.5) - (a.edge.confidence_score ?? 0.5),
    );
    for (const { edge, neighbor } of sorted) {
      if (visited.size >= maxNodes) break;
      traversedEdges.push(edge);
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  return { visitedNodes: [...visited], traversedEdges };
}

interface PathEdge {
  from: string;
  to: string;
  relation: string;
  confidence_score?: number;
}

function shortestPath(
  graph: GraphData,
  startId: string,
  endId: string,
  maxHops: number,
): { path: string[]; edges: PathEdge[] } | null {
  if (startId === endId) return { path: [startId], edges: [] };
  const prev = new Map<string, { from: string; edge: GraphEdge; reversed: boolean }>();
  const visited = new Set<string>([startId]);
  const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];

  let head = 0;
  while (head < queue.length) {
    const { id, depth } = queue[head++];
    if (depth >= maxHops) continue;
    for (const { edge, neighbor, reversed } of graph.adj.get(id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, { from: id, edge, reversed });
        if (neighbor === endId) {
          const path: string[] = [endId];
          const edges: PathEdge[] = [];
          let cur = endId;
          while (prev.has(cur)) {
            const p = prev.get(cur)!;
            edges.unshift({
              from: p.reversed ? p.edge.target : p.edge.source,
              to: p.reversed ? p.edge.source : p.edge.target,
              relation: p.edge.relation,
              confidence_score: p.edge.confidence_score,
            });
            path.unshift(p.from);
            cur = p.from;
          }
          return { path, edges };
        }
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (isRateLimited(ip)) {
      return new Response("Rate limit exceeded", { status: 429, headers: cors });
    }

    let body: { messages?: unknown[]; postContent?: string; mode?: string; lang?: string };
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

    if (body.postContent.length > 50_000) {
      return new Response("Content too large", { status: 413, headers: cors });
    }

    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    });

    let cachedGraph: GraphData | null = null;

    async function fetchGraph(): Promise<GraphData> {
      if (cachedGraph) return cachedGraph;
      const res = await fetch("https://vasudev.xyz/data/graph.json");
      const raw = (await res.json()) as RawGraphJSON;
      cachedGraph = buildGraphIndex(raw);
      return cachedGraph;
    }

    const MessageSchema = z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    );
    const parseResult = MessageSchema.safeParse(body.messages);
    if (!parseResult.success) {
      return new Response("Invalid message format", { status: 400, headers: cors });
    }

    const result = streamText({
      model: openrouter("nvidia/nemotron-3-super-120b-a12b:free"),
      system: `You are a knowledgeable assistant for the blog vasudev.xyz by Christian Pojoni. ${
        body.mode === "index"
          ? "The reader is browsing the blog index. You have an overview of all posts. Help them find posts by topic, suggest what to read, and answer questions about the blog's content. When recommending posts, use suggestReadingPath to render clickable links. CRITICAL: extract the exact slug from the URL in the blog overview (e.g. from '/blog/patanjali-harness-spec/index.txt' the slug is 'patanjali-harness-spec'). Do NOT invent slugs from post titles."
          : "You answer questions about the blog post the reader is currently viewing."
      } Be concise, direct, and technical. Do not use filler phrases. If the post bridges engineering with philosophy (Vedic, neuroscience, etc.), engage with both sides seriously.${
        body.lang && body.lang !== "en"
          ? `\n\nIMPORTANT: The reader is viewing the ${body.lang === "de" ? "German" : "Spanish"} version of the blog. Always respond in ${body.lang === "de" ? "German" : "Spanish"}.`
          : ""
      }

About the author: Christian Pojoni. Senior Software Engineer based in Madrid. 17+ years shipping software, from PLC controls at Koenig & Bauer (2008) and embedded C++ for gaming at TechnoConsult, through full-stack Bitcoin infrastructure at Coinfinity, to cloud and frontend work at agencies. Since 2023 at M47 Labs as Senior Engineer for a Tier-1 consumer electronics client (product used by hundreds of millions), after two years there as QA Automation Engineer scaling CI/CD test pipelines. Open source: OAuth 2.1 merged into Reactive Resume (35k+ stars), a Rust XChaCha20-Poly1305 and Argon2id encryption library with iOS, Android, and desktop FFI bindings, MCP servers bridging agents to real workflows, agent runtime work in Rust, and memory-system research with measured ablations. GitHub: github.com/5queezer. Austrian, raised in Romania, based in Madrid. German native, English professional, Romanian native, Spanish elementary. Education: FH JOANNEUM (Elektronik und Technologiemanagement). Looking for senior or staff roles in developer tools, infrastructure, or privacy or security-adjacent products. Async-first, remote, flat hierarchies, shipping over process. Cares about correctness, maintainability, and developer experience, in that order.

${body.mode === "index" ? "Blog overview" : "Post content"}:
${body.postContent}

You have tools available:
- showConnections: query the knowledge graph with BFS traversal to find connections for a concept. Supports depth parameter (1-3).
- findPath: find the shortest path between two concepts in the knowledge graph. Use when asked "how does X relate to Y?" or "what connects X and Y?"
- hubNodes: show the most connected hub nodes. Use when asked about key concepts, entry points, or "what's central?"
- exploreCommunity: find all nodes in the same topic cluster as a concept. Use for "more like this" or "related topics" questions.
- analyzeMetaphor: render a structured metaphor analysis card
- suggestReadingPath: suggest an ordered reading path for a topic
- showCode: fetch and display code from GitHub repos (5queezer org)
- showChart: render a bar or line chart from data
- searchArxiv: search arXiv for academic papers to verify citations or find related research
IMPORTANT rules:
- Whenever you mention or recommend blog posts, ALWAYS use suggestReadingPath to render them as clickable links. Never write post titles as plain text.
- Always use searchArxiv when the reader asks about papers, citations, or research. Never list papers from memory.
- Use showConnections when the user asks about knowledge graph connections or concept relationships.
- Use findPath when the user asks how two concepts relate or what connects them.
- Use hubNodes when the user asks about key concepts or central topics.
- Use exploreCommunity when the user asks for related content or "more like this".
- After a tool call, write only a brief 1-2 sentence comment. The tool renders a rich card with links and details. Do not re-list the information the tool already showed.
- For showCode, only fetch from repos under the 5queezer GitHub org.`,
      messages: parseResult.data,
      maxSteps: 3,
      tools: {
        showConnections: tool({
          description: "Query the knowledge graph to find connections between concepts or posts. Uses BFS traversal from best-matching nodes, ranked by confidence.",
          parameters: z.object({
            query: z.string().describe("The concept or post to find connections for"),
            depth: z.number().optional().describe("Traversal depth, 1-3 (default 2)"),
          }),
          execute: async ({ query, depth }) => {
            const graph = await fetchGraph();
            const terms = tokenize(query);
            const bfsDepth = Math.min(Math.max(depth ?? 2, 1), 3);

            const scored = graph.nodes
              .map((n) => ({ node: n, score: scoreMatch(n, terms) }))
              .filter((s) => s.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);

            const seedIds = scored.map((s) => s.node.id);
            const { visitedNodes, traversedEdges } = bfsTraverse(graph, seedIds, bfsDepth, 20);

            const matches = scored.map((s) => ({
              id: s.node.id,
              label: s.node.label,
              sourceFile: s.node.source_file ?? "",
              sourceUrl: s.node.source_url ?? "",
              sourceAnchor: s.node.source_anchor ?? "",
              score: s.score,
              community: s.node.community,
            }));

            const seenEdges = new Set<string>();
            const connections = traversedEdges
              .filter((e) => {
                const key = `${e.source}-${e.target}-${e.relation}`;
                if (seenEdges.has(key)) return false;
                seenEdges.add(key);
                return true;
              })
              .slice(0, 15)
              .map((e) => ({
                from: e.source,
                to: e.target,
                relation: e.relation,
                confidence: e.confidence_score ?? 1.0,
                fromLabel: graph.nodeById.get(e.source)?.label ?? e.source,
                toLabel: graph.nodeById.get(e.target)?.label ?? e.target,
              }));

            const visitedSet = new Set(visitedNodes);
            const hyperedges = graph.hyperedges
              .filter((h) => h.nodes.some((nid) => visitedSet.has(nid)))
              .map((h) => ({
                label: h.label,
                nodes: h.nodes.map((id) => graph.nodeById.get(id)?.label ?? id),
                confidence: h.confidence_score ?? 1.0,
              }));

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
            if (!repo.startsWith("5queezer/")) {
              return { error: "Only 5queezer repos are allowed" };
            }
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

        findPath: tool({
          description: "Find the shortest path between two concepts in the knowledge graph. Reveals how seemingly unrelated ideas connect through intermediate nodes.",
          parameters: z.object({
            from: z.string().describe("Starting concept or post name"),
            to: z.string().describe("Target concept or post name"),
          }),
          execute: async ({ from, to }) => {
            const graph = await fetchGraph();
            const fromTerms = tokenize(from);
            const toTerms = tokenize(to);

            const findBest = (terms: string[]) =>
              graph.nodes
                .map((n) => ({ node: n, score: scoreMatch(n, terms) }))
                .filter((s) => s.score > 0)
                .sort((a, b) => b.score - a.score)[0] ?? null;

            const startMatch = findBest(fromTerms);
            const endMatch = findBest(toTerms);

            if (!startMatch || !endMatch) {
              return { error: "Could not find matching nodes for the given concepts." };
            }

            const result = shortestPath(graph, startMatch.node.id, endMatch.node.id, 8);
            if (!result) {
              return {
                from: { label: startMatch.node.label, id: startMatch.node.id },
                to: { label: endMatch.node.label, id: endMatch.node.id },
                error: "No path found between these concepts (max 8 hops).",
              };
            }

            const steps = result.edges.map((e) => ({
              from: graph.nodeById.get(e.from)?.label ?? e.from,
              to: graph.nodeById.get(e.to)?.label ?? e.to,
              relation: e.relation,
              confidence: e.confidence_score ?? 1.0,
            }));

            const pathNodes = result.path.map((id) => {
              const n = graph.nodeById.get(id);
              return {
                id,
                label: n?.label ?? id,
                sourceFile: n?.source_file ?? "",
                sourceUrl: n?.source_url ?? "",
                sourceAnchor: n?.source_anchor ?? "",
              };
            });

            return { pathNodes, steps, hops: result.edges.length };
          },
        }),

        hubNodes: tool({
          description: "Show the most connected hub nodes in the knowledge graph. These are central concepts or posts that link many topics together.",
          parameters: z.object({
            count: z.number().optional().describe("Number of hub nodes to return (default 8, max 15)"),
            filter: z.enum(["all", "posts", "concepts"]).optional().describe("Filter by node type: 'posts' for blog posts only, 'concepts' for non-code concepts, 'all' for everything (default 'all')"),
          }),
          execute: async ({ count, filter }) => {
            const graph = await fetchGraph();
            const limit = Math.min(Math.max(count ?? 8, 1), 15);
            const filterType = filter ?? "all";

            let candidates = graph.nodes.filter((n) => {
              const deg = graph.degree.get(n.id) ?? 0;
              if (deg < 2) return false;
              if (filterType === "posts") return n.source_file?.startsWith("content/blog/");
              if (filterType === "concepts") {
                const isPost = n.source_file?.startsWith("content/blog/");
                return !isPost && n.file_type !== "code";
              }
              return true;
            });

            candidates.sort(
              (a, b) => (graph.degree.get(b.id) ?? 0) - (graph.degree.get(a.id) ?? 0),
            );

            const hubs = candidates.slice(0, limit).map((n) => ({
              id: n.id,
              label: n.label,
              sourceFile: n.source_file ?? "",
              sourceUrl: n.source_url ?? "",
              sourceAnchor: n.source_anchor ?? "",
              degree: graph.degree.get(n.id) ?? 0,
              community: n.community,
            }));

            return { hubs, total: graph.nodes.length, edgeCount: graph.edges.length };
          },
        }),

        exploreCommunity: tool({
          description: "Find all nodes in the same topic community as a given concept or post. Uses Leiden-detected clusters to surface related content.",
          parameters: z.object({
            query: z.string().describe("A concept or post to find the community for"),
          }),
          execute: async ({ query }) => {
            const graph = await fetchGraph();
            const terms = tokenize(query);

            const best = graph.nodes
              .map((n) => ({ node: n, score: scoreMatch(n, terms) }))
              .filter((s) => s.score > 0)
              .sort((a, b) => b.score - a.score)[0];

            if (!best || best.node.community === undefined) {
              return { error: "No matching node with a community found." };
            }

            const communityId = best.node.community;
            const members = graph.nodes
              .filter((n) => n.community === communityId)
              .map((n) => ({
                id: n.id,
                label: n.label,
                sourceFile: n.source_file ?? "",
                sourceUrl: n.source_url ?? "",
                sourceAnchor: n.source_anchor ?? "",
                degree: graph.degree.get(n.id) ?? 0,
                fileType: n.file_type ?? "",
              }))
              .sort((a, b) => b.degree - a.degree);

            const intraEdges = graph.edges.filter((e) => {
              const sComm = graph.nodeById.get(e.source)?.community;
              const tComm = graph.nodeById.get(e.target)?.community;
              return sComm === communityId && tComm === communityId;
            });

            const maxEdges = (members.length * (members.length - 1)) / 2;
            const cohesion = maxEdges > 0 ? intraEdges.length / maxEdges : 0;

            return {
              seed: { label: best.node.label, id: best.node.id },
              communityId,
              members,
              cohesion: Math.round(cohesion * 100) / 100,
              memberCount: members.length,
            };
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
