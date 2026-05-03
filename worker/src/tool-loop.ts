import { buildGitHubGetPath, buildGitHubSearchPath, compactGitHubItems, type GitHubGetInput, type GitHubSearchInput } from "./github.ts";
import type { ChatMessage, SubagentWorkerResult } from "./subagents.ts";

export type ToolLoopMessage = ChatMessage | { role: "tool"; tool_call_id: string; name: string; content: string };

export type ModelToolSchema = {
  type: "function";
  function: {
    name: "github_search" | "github_get" | "run_subagents";
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type RawToolCall = {
  id: string;
  name: string;
  argumentsJson: string;
};

export type ValidToolCall =
  | { ok: true; name: "github_search"; args: GitHubSearchInput }
  | { ok: true; name: "github_get"; args: GitHubGetInput }
  | { ok: true; name: "run_subagents"; args: RunSubagentsArgs }
  | { ok: false; error: string };

export type RunSubagentsArgs = {
  objective: string;
};

export type ToolExecutionResult = {
  status: "success" | "error";
  toolName: string;
  latencyMs?: number;
  resultCount?: number;
  data?: unknown;
  error?: string;
};

export type ToolExecutionOptions = {
  githubToken?: string;
  fetcher?: typeof fetch;
  runSubagents?: (objective: string) => Promise<{ action: string; workers: SubagentWorkerResult[] }>;
};

const githubSearchTypes = ["issues", "prs", "code", "files", "repos", "users"] as const;
const githubGetResources = [
  "issue",
  "issue_comments",
  "pr",
  "pr_files",
  "pr_commits",
  "pr_reviews",
  "pr_review_comments",
  "commit_status",
  "check_runs",
  "workflow_runs",
  "workflow_run",
  "workflow_run_jobs",
] as const;

export const modelToolSchemas: ModelToolSchema[] = [
  {
    type: "function",
    function: {
      name: "github_search",
      description: "Read-only GitHub search across issues, pull requests, code, repositories, or users. Use for broad discovery and follow-up GitHub questions.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          query: { type: "string", description: "GitHub search query without credentials or secrets." },
          type: { type: "string", enum: [...githubSearchTypes], description: "Search corpus." },
          repo: { type: "string", description: "Optional owner/repo scope. Omit for global public GitHub search." },
          limit: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "github_get",
      description: "Read-only retrieval of specific GitHub issue, PR, comments, files, commits, statuses, checks, workflow runs, or jobs.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          resource: { type: "string", enum: [...githubGetResources] },
          owner: { type: "string" },
          repo: { type: "string" },
          number: { type: "integer" },
          ref: { type: "string" },
          runId: { type: "integer" },
          limit: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["resource", "owner", "repo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_subagents",
      description: "Run bounded parallel read-only specialist subagents when the task needs independent context reading, technical review, or synthesis planning.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          objective: { type: "string", description: "The bounded objective specialists should investigate." },
        },
        required: ["objective"],
      },
    },
  },
];

export function extractToolCall(response: unknown): RawToolCall | undefined {
  const message = (response as any)?.choices?.[0]?.message;
  const toolCall = message?.tool_calls?.[0];
  const id = toolCall?.id;
  const name = toolCall?.function?.name;
  const argumentsJson = toolCall?.function?.arguments;
  if (typeof id === "string" && typeof name === "string" && typeof argumentsJson === "string") return { id, name, argumentsJson };

  if (typeof message?.content === "string") return extractContentToolCall(message.content);
  return undefined;
}

export function validateToolCall(call: RawToolCall): ValidToolCall {
  let args: unknown;
  try {
    args = JSON.parse(call.argumentsJson || "{}");
  } catch {
    return { ok: false, error: "Tool arguments were not valid JSON" };
  }

  if (call.name === "github_search") return validateGitHubSearch(args);
  if (call.name === "github_get") return validateGitHubGet(args);
  if (call.name === "run_subagents") return validateRunSubagents(args);
  return { ok: false, error: `Unknown tool requested: ${call.name}` };
}

export async function executeToolCall(call: RawToolCall, options: ToolExecutionOptions): Promise<ToolExecutionResult> {
  const started = Date.now();
  const valid = validateToolCall(call);
  if (!valid.ok) return { status: "error", toolName: call.name, latencyMs: Date.now() - started, error: valid.error };

  try {
    if (valid.name === "github_search") {
      const data = await githubJson(buildGitHubSearchPath(valid.args), options.githubToken, options.fetcher ?? fetch);
      const compacted = Array.isArray((data as any).items) ? { ...(data as any), items: compactGitHubItems((data as any).items) } : data;
      return { status: "success", toolName: valid.name, latencyMs: Date.now() - started, resultCount: Array.isArray((compacted as any).items) ? (compacted as any).items.length : 1, data: compacted };
    }

    if (valid.name === "github_get") {
      const data = await githubJson(buildGitHubGetPath(valid.args), options.githubToken, options.fetcher ?? fetch);
      const compacted = Array.isArray(data) ? compactGitHubItems(data) : data;
      return { status: "success", toolName: valid.name, latencyMs: Date.now() - started, resultCount: Array.isArray(compacted) ? compacted.length : 1, data: compacted };
    }

    if (!options.runSubagents) throw new Error("run_subagents executor is not configured");
    const data = await options.runSubagents(valid.args.objective);
    return { status: "success", toolName: valid.name, latencyMs: Date.now() - started, resultCount: data.workers.length, data };
  } catch (error) {
    return { status: "error", toolName: valid.ok ? valid.name : call.name, latencyMs: Date.now() - started, error: error instanceof Error ? error.message : "Unknown tool error" };
  }
}

export function appendToolObservation(messages: ToolLoopMessage[], result: ToolExecutionResult, toolCallId = "worker_tool_call"): ToolLoopMessage[] {
  return [...messages, {
    role: "tool",
    tool_call_id: toolCallId,
    name: result.toolName,
    content: JSON.stringify({
      tool: result.toolName,
      status: result.status,
      resultCount: result.resultCount ?? 0,
      data: result.data,
      error: result.error,
    }).slice(0, 14000),
  }];
}

function extractContentToolCall(content: string): RawToolCall | undefined {
  const functionMatch = content.match(/<function=([A-Za-z0-9_]+)>[\s\S]*?<\/function>/);
  if (!functionMatch) return undefined;

  const args: Record<string, string> = {};
  const parameterPattern = /<parameter=([A-Za-z0-9_]+)>\s*([\s\S]*?)\s*<\/parameter>/g;
  for (const match of content.matchAll(parameterPattern)) {
    args[match[1]] = normalizeToolArgument(match[1], match[2].trim());
  }

  return { id: "content_tool_call", name: functionMatch[1], argumentsJson: JSON.stringify(args) };
}

function normalizeToolArgument(key: string, value: string) {
  if (key === "type" && value === "repositories") return "repos";
  if (key === "type" && value === "pull_requests") return "prs";
  return value;
}

function validateGitHubSearch(args: unknown): ValidToolCall {
  if (!isRecord(args)) return { ok: false, error: "github_search arguments must be an object" };
  if (typeof args.query !== "string" || args.query.trim().length === 0) return { ok: false, error: "github_search.query is required" };
  const type = typeof args.type === "string" && githubSearchTypes.includes(args.type as any) ? args.type as GitHubSearchInput["type"] : undefined;
  const repo = typeof args.repo === "string" && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(args.repo) ? args.repo : undefined;
  const validated: GitHubSearchInput = { query: args.query.trim().slice(0, 500), limit: clampLimit(args.limit) };
  if (type) validated.type = type;
  if (repo) validated.repo = repo;
  return { ok: true, name: "github_search", args: validated };
}

function validateGitHubGet(args: unknown): ValidToolCall {
  if (!isRecord(args)) return { ok: false, error: "github_get arguments must be an object" };
  if (typeof args.resource !== "string" || !githubGetResources.includes(args.resource as any)) return { ok: false, error: "github_get.resource is invalid" };
  if (typeof args.owner !== "string" || !args.owner.trim()) return { ok: false, error: "github_get.owner is required" };
  if (typeof args.repo !== "string" || !args.repo.trim()) return { ok: false, error: "github_get.repo is required" };
  return {
    ok: true,
    name: "github_get",
    args: {
      resource: args.resource as GitHubGetInput["resource"],
      owner: args.owner.trim(),
      repo: args.repo.trim(),
      number: toOptionalInteger(args.number),
      ref: typeof args.ref === "string" ? args.ref.trim() : undefined,
      runId: toOptionalInteger(args.runId),
      limit: clampLimit(args.limit),
    },
  };
}

function validateRunSubagents(args: unknown): ValidToolCall {
  if (!isRecord(args)) return { ok: false, error: "run_subagents arguments must be an object" };
  if (typeof args.objective !== "string" || !args.objective.trim()) return { ok: false, error: "run_subagents.objective is required" };
  return { ok: true, name: "run_subagents", args: { objective: args.objective.trim().slice(0, 1000) } };
}

async function githubJson(path: string, token: string | undefined, fetcher: typeof fetch) {
  if (!token) throw new Error("GITHUB_TOKEN missing");
  const response = await fetcher(`https://api.github.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "vasudev-chat-worker",
    },
  });
  if (!response.ok) throw new Error(`GitHub failed: ${response.status}`);
  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clampLimit(value: unknown) {
  if (!Number.isInteger(value)) return 5;
  return Math.max(1, Math.min(value as number, 10));
}

function toOptionalInteger(value: unknown) {
  return Number.isInteger(value) ? value as number : undefined;
}
