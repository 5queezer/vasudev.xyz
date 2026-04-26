/**
 * agent.vasudev.workers.dev
 * ------------------------------------------------------------
 * A tiny Cloudflare Worker that fronts a free Nemotron endpoint.
 * Streams Server-Sent Events back to the static site.
 *
 * Wire format (matches assets/js/agent.js):
 *   data: <text-chunk>\n\n
 *   data: [DONE]\n\n
 *
 * Defaults to OpenRouter's free Nemotron model (OpenAI-compatible
 * Chat Completions). Swap UPSTREAM and MODEL below to point at
 * NVIDIA's NIM endpoint, HuggingFace inference, or any other
 * OpenAI-compatible streaming chat provider.
 * ------------------------------------------------------------
 */

export interface Env {
  /** OPENROUTER_API_KEY (or NIM_API_KEY etc.) — set with `wrangler secret put`. */
  OPENROUTER_API_KEY: string;
  /** Comma-separated list of allowed origins, e.g. "https://vasudev.xyz,http://localhost:1313" */
  ALLOWED_ORIGINS?: string;
}

const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";
const MODEL    = "nvidia/llama-3.1-nemotron-70b-instruct:free";

const SYSTEM_PROMPT = `You are the on-site agent for vasudev.xyz, the personal site of Christian Pojoni — a systems engineer working in Rust, Python, AI tooling, and privacy-first architecture.

Be concise, calm, and technically literate. When asked about projects, refer to: hrafn (Rust agent runtime, MCP/A2A, MuninnDB memory), axiom-vault (Rust encrypted vault, XChaCha20-Poly1305), distill (Python MCP server for team memory, FastMCP + SQLite FTS5), nexus-crm (Next.js + Prisma + TanStack). When asked about the site, mention: Hugo, GitHub Pages, Giscus comments, this Cloudflare Worker, and the free Nemotron model.

Never invent biographical facts. If unsure, say so.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin") ?? "";
    const cors = corsHeaders(origin, env);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST")    return new Response("Method Not Allowed", { status: 405, headers: cors });

    let body: { messages?: Msg[] };
    try { body = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400, cors); }

    const messages = (body.messages ?? []).filter(m =>
      (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    ).slice(-20); // cap history
    if (messages.length === 0) return json({ error: "Empty messages" }, 400, cors);

    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://vasudev.xyz",
        "X-Title": "vasudev.xyz on-site agent",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.4,
        max_tokens: 600,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return json({ error: `Upstream error: ${upstream.status}` }, 502, cors);
    }

    const stream = transformOpenAIStream(upstream.body);

    return new Response(stream, {
      status: 200,
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store, no-transform",
        "x-accel-buffering": "no",
      },
    });
  },
};

/**
 * Transform an OpenAI-style SSE chat stream into the simpler "data: <chunk>"
 * frames that assets/js/agent.js expects.
 */
function transformOpenAIStream(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx;
          while ((idx = buf.indexOf("\n")) !== -1) {
            const line = buf.slice(0, idx).trim();
            buf = buf.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const obj = JSON.parse(payload);
              const delta = obj.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                // Encode as a single SSE data line — escape newlines so the
                // multi-line "data:" rule of SSE doesn't fragment our chunk.
                const safe = delta.replace(/\r?\n/g, "\\n");
                controller.enqueue(encoder.encode(`data: ${safe}\n\n`));
              }
            } catch { /* ignore malformed frame */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } finally {
        controller.close();
      }
    },
  });
}

function corsHeaders(origin: string, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? "https://vasudev.xyz,http://localhost:1313")
    .split(",").map(s => s.trim()).filter(Boolean);
  const allow = allowed.includes(origin) ? origin : allowed[0];
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
  };
}

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}
