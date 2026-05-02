/**
 * agent.vasudev.workers.dev
 * ------------------------------------------------------------
 * A tiny Cloudflare Worker that fronts a free Nemotron endpoint.
 * Streams Server-Sent Events back to the static site and optionally
 * records server-side Langfuse traces for observability.
 * ------------------------------------------------------------
 */

export interface Env {
  /** OPENROUTER_API_KEY (or NIM_API_KEY etc.) — set with `wrangler secret put`. */
  OPENROUTER_API_KEY: string;
  /** Comma-separated list of allowed origins, e.g. "https://vasudev.xyz,http://localhost:1313" */
  ALLOWED_ORIGINS?: string;
  /** Langfuse public key. Tracing is disabled unless both keys are present. */
  LANGFUSE_PUBLIC_KEY?: string;
  /** Langfuse secret key. Set with `wrangler secret put`. */
  LANGFUSE_SECRET_KEY?: string;
  /** Langfuse host, e.g. https://cloud.langfuse.com or your self-hosted URL. */
  LANGFUSE_HOST?: string;
  /** Set to "false" to trace metadata only without message content. */
  LANGFUSE_CAPTURE_CONTENT?: string;
  /** 0..1 sample rate. Defaults to 1. */
  LANGFUSE_SAMPLE_RATE?: string;
}

const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/llama-3.1-nemotron-70b-instruct:free";

const SYSTEM_PROMPT = `You are the on-site agent for vasudev.xyz, the personal site of Christian Pojoni — a systems engineer working in Rust, Python, AI tooling, and privacy-first architecture.

Be concise, calm, and technically literate. When asked about projects, refer to: hrafn (Rust agent runtime, MCP/A2A, MuninnDB memory), axiom-vault (Rust encrypted vault, XChaCha20-Poly1305), distill (Python MCP server for team memory, FastMCP + SQLite FTS5), nexus-crm (Next.js + Prisma + TanStack). When asked about the site, mention: Hugo, GitHub Pages, Giscus comments, this Cloudflare Worker, and the free Nemotron model.

Never invent biographical facts. If unsure, say so.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

type AgentRequest = {
  messages?: Msg[];
  postContent?: string;
  mode?: string;
  lang?: string;
  pageUrl?: string;
  postUrl?: string;
  sessionId?: string;
};

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type TraceRun = {
  traceId: string;
  generationId: string;
  sessionId?: string;
  startTime: string;
  endTime?: string;
  status: "success" | "error";
  statusMessage?: string;
  messages: Msg[];
  output?: string;
  usage?: Usage;
  metadata: Record<string, unknown>;
};

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = req.headers.get("origin") ?? "";
    const cors = corsHeaders(origin, env);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

    let body: AgentRequest;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    const messages = (body.messages ?? []).filter(m =>
      (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    ).slice(-20);
    if (messages.length === 0) return json({ error: "Empty messages" }, 400, cors);

    const run = createTraceRun(req, body, messages);

    const upstreamStarted = Date.now();
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

    run.metadata.upstream_status = upstream.status;
    run.metadata.upstream_latency_ms = Date.now() - upstreamStarted;

    if (!upstream.ok || !upstream.body) {
      run.status = "error";
      run.statusMessage = `Upstream error: ${upstream.status}`;
      run.endTime = new Date().toISOString();
      ctx.waitUntil(sendLangfuse(env, run));
      return json({ error: `Upstream error: ${upstream.status}` }, 502, cors);
    }

    const stream = transformOpenAIStream(upstream.body, run, env, ctx);

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
function transformOpenAIStream(
  input: ReadableStream<Uint8Array>,
  run: TraceRun,
  env: Env,
  ctx: ExecutionContext,
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buf = "";
  let output = "";
  let usage: Usage | undefined;

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
              const obj = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: unknown } }>; usage?: Usage };
              if (obj.usage) usage = obj.usage;
              const delta = obj.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta.length > 0) {
                output += delta;
                // Encode as a single SSE data line. Escape newlines so the
                // multi-line "data:" rule of SSE does not fragment our chunk.
                const safe = delta.replace(/\r?\n/g, "\\n");
                controller.enqueue(encoder.encode(`data: ${safe}\n\n`));
              }
            } catch {
              // Ignore malformed upstream frames.
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        run.status = "success";
      } catch (err) {
        run.status = "error";
        run.statusMessage = err instanceof Error ? err.message : "Stream error";
        throw err;
      } finally {
        run.output = output;
        run.usage = usage;
        run.endTime = new Date().toISOString();
        ctx.waitUntil(sendLangfuse(env, run));
        controller.close();
      }
    },
  });
}

function createTraceRun(req: Request, body: AgentRequest, messages: Msg[]): TraceRun {
  const url = new URL(req.url);
  const sessionId = cleanString(body.sessionId, 128);
  const pageUrl = cleanString(body.pageUrl, 500);
  const postUrl = cleanString(body.postUrl, 500);
  const mode = cleanString(body.mode, 80) ?? "unknown";
  const lang = cleanString(body.lang, 16) ?? "unknown";
  const postContentLength = typeof body.postContent === "string" ? body.postContent.length : 0;

  return {
    traceId: crypto.randomUUID(),
    generationId: crypto.randomUUID(),
    sessionId,
    startTime: new Date().toISOString(),
    status: "success",
    messages,
    metadata: {
      route: url.pathname,
      page_url: pageUrl,
      post_url: postUrl,
      mode,
      lang,
      model: MODEL,
      provider: "openrouter",
      post_content_length: postContentLength,
    },
  };
}

async function sendLangfuse(env: Env, run: TraceRun): Promise<void> {
  if (!env.LANGFUSE_PUBLIC_KEY || !env.LANGFUSE_SECRET_KEY) return;
  if (!shouldSample(env.LANGFUSE_SAMPLE_RATE)) return;

  const host = (env.LANGFUSE_HOST || "https://cloud.langfuse.com").replace(/\/$/, "");
  const captureContent = env.LANGFUSE_CAPTURE_CONTENT !== "false";
  const traceBody: Record<string, unknown> = {
    id: run.traceId,
    timestamp: run.startTime,
    name: "onsite-agent-chat",
    sessionId: run.sessionId,
    userId: run.sessionId,
    metadata: run.metadata,
    tags: ["site-agent", String(run.metadata.lang), String(run.metadata.mode)],
  };
  if (captureContent) traceBody.input = lastUserMessage(run.messages);

  const generationBody: Record<string, unknown> = {
    id: run.generationId,
    traceId: run.traceId,
    name: "openrouter-chat-completion",
    model: MODEL,
    modelParameters: { temperature: 0.4, max_tokens: 600, stream: true },
    startTime: run.startTime,
    endTime: run.endTime,
    completionStartTime: run.startTime,
    level: run.status === "error" ? "ERROR" : "DEFAULT",
    statusMessage: run.statusMessage,
    metadata: run.metadata,
    usage: langfuseUsage(run.usage),
  };
  if (captureContent) {
    generationBody.input = run.messages;
    generationBody.output = run.output ?? "";
  }

  const body = {
    batch: [
      { id: crypto.randomUUID(), type: "trace-create", timestamp: run.startTime, body: traceBody },
      { id: crypto.randomUUID(), type: "generation-create", timestamp: run.startTime, body: generationBody },
    ],
  };

  try {
    await fetch(`${host}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Observability must never break chat.
  }
}

function langfuseUsage(usage?: Usage): Record<string, number> | undefined {
  if (!usage) return undefined;
  return {
    input: usage.prompt_tokens ?? 0,
    output: usage.completion_tokens ?? 0,
    total: usage.total_tokens ?? 0,
  };
}

function lastUserMessage(messages: Msg[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return undefined;
}

function shouldSample(raw?: string): boolean {
  if (!raw) return true;
  const rate = Number(raw);
  if (!Number.isFinite(rate)) return true;
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  return Math.random() < rate;
}

function cleanString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
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
