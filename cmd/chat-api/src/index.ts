import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

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

    let body: { messages?: unknown[]; postContent?: string };
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

    const result = streamText({
      model: openrouter("nvidia/nemotron-3-super-120b-a12b:free"),
      system: `You are a knowledgeable assistant for the blog vasudev.xyz by Christian Pojoni. You answer questions about the blog post the reader is currently viewing. Be concise, direct, and technical. Do not use filler phrases. If the post bridges engineering with philosophy (Vedic, neuroscience, etc.), engage with both sides seriously.

Post content:
${body.postContent}`,
      messages: body.messages as Parameters<typeof streamText>[0]["messages"],
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
