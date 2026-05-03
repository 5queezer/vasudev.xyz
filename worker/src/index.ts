import { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes, setLangfuseTracerProvider, startObservation } from "@langfuse/tracing";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { buildControllerMessages, buildFinalMessages, type Msg } from "./context";
import { getControllerModel, getFinalModel } from "./model-config";
import { appendToolObservation, executeToolCall, extractToolCall, modelToolSchemas, type ToolLoopMessage } from "./tool-loop";
import { buildWorkerMessages, type SubagentPlan, type SubagentWorkerResult } from "./subagents";

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
  /** Final answer model. Defaults to nvidia/nemotron-3-nano-30b-a3b:free. */
  OPENROUTER_MODEL?: string;
  /** Tool-routing controller model. Defaults to OPENROUTER_MODEL, then nano. */
  OPENROUTER_CONTROLLER_MODEL?: string;
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
  /** Read-only GitHub token stored with `wrangler secret put GITHUB_TOKEN`. */
  GITHUB_TOKEN?: string;
}

const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";

let langfuseProvider: BasicTracerProvider | undefined;
let langfuseProviderSignature = "";

type OpenRouterMessage = Msg | ToolLoopMessage | Record<string, unknown>;

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

    const run = createTraceRun(req, env, body, messages);
    let finalMessages: OpenRouterMessage[] = buildFinalMessages(messages, body);

    const controllerStarted = Date.now();
    const controller = await openRouterChat(env, {
      model: getControllerModel(env),
      stream: false,
      messages: buildControllerMessages(messages, body),
      temperature: 0.1,
      maxTokens: 500,
      tools: modelToolSchemas,
      toolChoice: "auto",
    });
    run.metadata.controller_latency_ms = Date.now() - controllerStarted;
    run.metadata.controller_status = controller.status;

    if (controller.ok) {
      const controllerPayload = await controller.json();
      const toolCall = extractToolCall(controllerPayload);
      run.metadata.controller_requested_tool = toolCall?.name ?? "none";

      if (toolCall) {
        const toolResult = await executeToolCall(toolCall, {
          githubToken: env.GITHUB_TOKEN,
          runSubagents: async (objective) => runSubagentsForTool(objective, messages, body, env),
        });
        run.metadata.tool_name = toolResult.toolName;
        run.metadata.tool_status = toolResult.status;
        run.metadata.tool_latency_ms = toolResult.latencyMs ?? 0;
        run.metadata.tool_result_count = toolResult.resultCount ?? 0;
        if (toolResult.error) run.metadata.tool_error = toolResult.error;

        const controllerMessage = (controllerPayload as any)?.choices?.[0]?.message;
        finalMessages = appendToolObservation([
          ...buildFinalMessages(messages, body),
          controllerMessage,
        ], toolResult, toolCall.id);
      }
    } else {
      run.metadata.controller_error = `Controller error: ${controller.status}`;
    }

    const upstreamStarted = Date.now();
    const upstream = await openRouterChat(env, {
      model: getFinalModel(env),
      stream: true,
      messages: finalMessages,
      temperature: 0.4,
      maxTokens: 700,
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

type OpenRouterChatOptions = {
  model: string;
  stream: boolean;
  messages: OpenRouterMessage[];
  temperature: number;
  maxTokens: number;
  tools?: unknown[];
  toolChoice?: "auto" | "none";
};

async function openRouterChat(env: Env, options: OpenRouterChatOptions): Promise<Response> {
  return fetch(UPSTREAM, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://vasudev.xyz",
      "X-Title": "vasudev.xyz on-site agent",
    },
    body: JSON.stringify({
      model: options.model,
      stream: options.stream,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.toolChoice ? { tool_choice: options.toolChoice } : {}),
    }),
  });
}

async function runSubagentsForTool(
  objective: string,
  messages: Msg[],
  body: AgentRequest,
  env: Env,
): Promise<{ action: string; workers: SubagentWorkerResult[] }> {
  const plan = createToolSubagentPlan(objective);
  const workers = await runSubagentWorkers(plan, {
    originalPrompt: objective,
    messages,
    postContent: body.postContent,
    mode: body.mode,
    lang: body.lang,
  }, env);
  return { action: plan.action, workers };
}

function createToolSubagentPlan(objective: string): SubagentPlan {
  return {
    action: "subagents",
    reason: "The controller model requested bounded specialist subagents.",
    score: 0,
    workers: [
      {
        name: "context_reader",
        objective,
        focus: "Ground the answer in supplied page, post, conversation, and tool context.",
        expectedOutput: "Concise evidence with caveats and uncertainty.",
      },
      {
        name: "technical_reviewer",
        objective,
        focus: "Check technical claims, edge cases, implementation details, and risks.",
        expectedOutput: "Concise technical review with validation points.",
      },
      {
        name: "synthesis_planner",
        objective,
        focus: "Plan the clearest final response for the user request.",
        expectedOutput: "Compact answer outline with confidence notes.",
      },
    ],
  };
}

async function runSubagentWorkers(
  plan: SubagentPlan,
  input: {
    originalPrompt: string;
    messages: Msg[];
    postContent?: string;
    mode?: string;
    lang?: string;
  },
  env: Env,
): Promise<SubagentWorkerResult[]> {
  return Promise.all(plan.workers.map(async (worker) => {
    const started = Date.now();
    try {
      const response = await openRouterChat(env, {
        model: getFinalModel(env),
        stream: false,
        messages: buildWorkerMessages(worker, input),
        temperature: 0.2,
        maxTokens: 350,
      });

      if (!response.ok) {
        return {
          name: worker.name,
          status: "failed" as const,
          output: "",
          error: `OpenRouter worker error: ${response.status}`,
          latencyMs: Date.now() - started,
        };
      }

      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const output = payload.choices?.[0]?.message?.content;
      if (typeof output !== "string" || output.trim().length === 0) {
        return {
          name: worker.name,
          status: "failed" as const,
          output: "",
          error: "OpenRouter worker returned empty output",
          latencyMs: Date.now() - started,
        };
      }

      return {
        name: worker.name,
        status: "completed" as const,
        output,
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      return {
        name: worker.name,
        status: "failed" as const,
        output: "",
        error: error instanceof Error ? error.message : "Unknown worker error",
        latencyMs: Date.now() - started,
      };
    }
  }));
}

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

function createTraceRun(req: Request, env: Env, body: AgentRequest, messages: Msg[]): TraceRun {
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
      model: getFinalModel(env),
      controller_model: getControllerModel(env),
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
  const provider = configureLangfuseProvider(env, host);

  try {
    const startTime = new Date(run.startTime);
    const endTime = run.endTime ? new Date(run.endTime) : undefined;
    const tags = ["site-agent", String(run.metadata.lang), String(run.metadata.mode)];

    propagateAttributes(
      {
        traceName: "onsite-agent-chat",
        sessionId: run.sessionId,
        userId: run.sessionId,
        tags,
      },
      () => {
        const trace = startObservation(
          "onsite-agent-chat",
          {
            input: captureContent ? lastUserMessage(run.messages) : undefined,
            output: captureContent ? run.output ?? "" : undefined,
            metadata: run.metadata,
            level: run.status === "error" ? "ERROR" : "DEFAULT",
            statusMessage: run.statusMessage,
          },
          { startTime },
        );

        trace.setTraceIO({
          input: captureContent ? lastUserMessage(run.messages) : undefined,
          output: captureContent ? run.output ?? "" : undefined,
        });

        const generation = trace.startObservation(
          "openrouter-chat-completion",
          {
            model: getFinalModel(env),
            modelParameters: { temperature: 0.4, max_tokens: 700, stream: "true" },
            completionStartTime: startTime,
            level: run.status === "error" ? "ERROR" : "DEFAULT",
            statusMessage: run.statusMessage,
            input: captureContent ? run.messages : undefined,
            output: captureContent ? run.output ?? "" : undefined,
            metadata: run.metadata,
            usageDetails: langfuseUsageDetails(run.usage),
          },
          { asType: "generation" },
        );

        generation.end(endTime);
        trace.end(endTime);
      },
    );

    await provider.forceFlush();
  } catch {
    // Observability must never break chat.
  }
}

function configureLangfuseProvider(env: Env, host: string): BasicTracerProvider {
  const signature = `${host}|${env.LANGFUSE_PUBLIC_KEY}|${env.LANGFUSE_SECRET_KEY}`;
  if (langfuseProvider && langfuseProviderSignature === signature) return langfuseProvider;

  langfuseProvider = new BasicTracerProvider({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        baseUrl: host,
        flushAt: 1,
        flushInterval: 1,
        timeout: 5,
        exportMode: "immediate",
      }),
    ],
  });
  langfuseProviderSignature = signature;
  setLangfuseTracerProvider(langfuseProvider);
  return langfuseProvider;
}

function langfuseUsageDetails(usage?: Usage): Record<string, number> | undefined {
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

function recentConversationContext(messages: Msg[]): string {
  return messages
    .slice(0, -1)
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-4)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n")
    .slice(-4000);
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
