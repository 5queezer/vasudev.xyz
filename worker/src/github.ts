import type { ChatMessage } from "./subagents";

export type GitHubSearchInput = {
  query: string;
  type?: "issues" | "prs" | "code" | "files" | "repos" | "users";
  repo?: string;
  limit?: number;
};

export type GitHubGetInput = {
  resource:
    | "issue"
    | "issue_comments"
    | "pr"
    | "pr_files"
    | "pr_commits"
    | "pr_reviews"
    | "pr_review_comments"
    | "commit_status"
    | "check_runs"
    | "workflow_runs"
    | "workflow_run"
    | "workflow_run_jobs";
  owner: string;
  repo: string;
  number?: number;
  ref?: string;
  runId?: number;
  limit?: number;
};

export type GitHubEvidencePlan =
  | { action: "none"; reason: string }
  | { action: "search"; reason: string; search: GitHubSearchInput }
  | { action: "get"; reason: string; get: GitHubGetInput };

export type GitHubEvidenceResult = {
  planned: boolean;
  used: boolean;
  status: "skipped" | "success" | "error";
  action?: "search" | "get";
  resource?: string;
  latencyMs?: number;
  resultCount?: number;
  data?: unknown;
  error?: string;
};

const GITHUB_TERMS = /\b(github|repo|repository|issue|issues|pr|pull request|pull requests|code|file|files|ci|check|checks|status|workflow|workflows|actions?)\b/i;

export function buildGitHubSearchPath(input: GitHubSearchInput) {
  const type = input.type ?? "issues";
  const query = [input.query, input.repo ? `repo:${input.repo}` : "", type === "prs" ? "is:pr" : ""]
    .filter(Boolean)
    .join(" ");
  const endpoint = type === "code" || type === "files" ? "code" : type === "repos" ? "repositories" : type === "users" ? "users" : "issues";
  const params = new URLSearchParams({ q: query, per_page: String(clampLimit(input.limit)) });
  return `/search/${endpoint}?${params}`;
}

export function buildGitHubGetPath(input: GitHubGetInput) {
  const base = `/repos/${encodePath(input.owner)}/${encodePath(input.repo)}`;
  const perPage = `?per_page=${clampLimit(input.limit)}`;

  switch (input.resource) {
    case "issue":
      return `${base}/issues/${requireNumber(input.number, "number")}`;
    case "issue_comments":
      return `${base}/issues/${requireNumber(input.number, "number")}/comments${perPage}`;
    case "pr":
      return `${base}/pulls/${requireNumber(input.number, "number")}`;
    case "pr_files":
      return `${base}/pulls/${requireNumber(input.number, "number")}/files${perPage}`;
    case "pr_commits":
      return `${base}/pulls/${requireNumber(input.number, "number")}/commits${perPage}`;
    case "pr_reviews":
      return `${base}/pulls/${requireNumber(input.number, "number")}/reviews${perPage}`;
    case "pr_review_comments":
      return `${base}/pulls/${requireNumber(input.number, "number")}/comments${perPage}`;
    case "commit_status":
      return `${base}/commits/${encodePath(requireText(input.ref, "ref"))}/status`;
    case "check_runs":
      return `${base}/commits/${encodePath(requireText(input.ref, "ref"))}/check-runs${perPage}`;
    case "workflow_runs":
      return `${base}/actions/runs${perPage}`;
    case "workflow_run":
      return `${base}/actions/runs/${requireNumber(input.runId, "runId")}`;
    case "workflow_run_jobs":
      return `${base}/actions/runs/${requireNumber(input.runId, "runId")}/jobs${perPage}`;
  }
}

export function compactGitHubItems(items: Array<any>) {
  return items.map((item) => ({
    title: item.title ?? item.name,
    url: item.html_url,
    state: item.state ?? item.status ?? item.conclusion,
    repository: item.repository?.full_name ?? item.repository_url?.split("/repos/")[1],
    user: item.user?.login ?? item.actor?.login,
    body: trimText(item.body ?? item.description ?? item.path, 1200),
  }));
}

export function planGitHubEvidence(prompt: string, defaultRepo?: string): GitHubEvidencePlan {
  if (!GITHUB_TERMS.test(prompt)) return { action: "none", reason: "Prompt is not GitHub-related." };

  const repo = extractRepo(prompt) ?? defaultRepo;
  const issueNumber = extractNumber(prompt, /(?:issue|issues)\s+#?(\d+)/i);
  const prNumber = extractNumber(prompt, /(?:pr|pull request|pull requests)\s+#?(\d+)/i);
  const runId = extractNumber(prompt, /(?:run|workflow run)\s+#?(\d+)/i);
  const ref = extractRef(prompt);

  if (repo && prNumber) {
    const [owner, name] = splitRepo(repo);
    return { action: "get", reason: "Prompt asks for a specific pull request.", get: { resource: "pr", owner, repo: name, number: prNumber, limit: 5 } };
  }

  if (repo && issueNumber) {
    const [owner, name] = splitRepo(repo);
    return { action: "get", reason: "Prompt asks for a specific issue.", get: { resource: "issue", owner, repo: name, number: issueNumber, limit: 5 } };
  }

  if (repo && runId) {
    const [owner, name] = splitRepo(repo);
    return { action: "get", reason: "Prompt asks for a specific workflow run.", get: { resource: "workflow_run", owner, repo: name, runId, limit: 5 } };
  }

  if (repo && ref && /\b(ci|check|checks|status)\b/i.test(prompt)) {
    const [owner, name] = splitRepo(repo);
    return { action: "get", reason: "Prompt asks for commit check or status details.", get: { resource: "check_runs", owner, repo: name, ref, limit: 5 } };
  }

  const type = /\b(code|file|files)\b/i.test(prompt)
    ? "code"
    : /\b(pr|pull request|pull requests)\b/i.test(prompt)
      ? "prs"
      : /\b(repo|repository)\b/i.test(prompt) && !repo
        ? "repos"
        : "issues";

  return {
    action: "search",
    reason: "Prompt asks for GitHub research.",
    search: { query: cleanSearchQuery(prompt), type, repo, limit: 5 },
  };
}

export async function collectGitHubEvidence(input: {
  prompt: string;
  token?: string;
  defaultRepo?: string;
  fetcher?: typeof fetch;
}): Promise<GitHubEvidenceResult> {
  const plan = planGitHubEvidence(input.prompt, input.defaultRepo);
  if (plan.action === "none") return { planned: false, used: false, status: "skipped" };
  if (!input.token) return { planned: true, used: false, status: "error", action: plan.action, error: "GITHUB_TOKEN missing" };

  const started = Date.now();
  try {
    const data = await githubJson(plan.action === "search" ? buildGitHubSearchPath(plan.search) : buildGitHubGetPath(plan.get), input.token, input.fetcher ?? fetch);
    const compacted = Array.isArray(data) ? compactGitHubItems(data) : Array.isArray((data as any).items) ? { ...(data as any), items: compactGitHubItems((data as any).items) } : data;
    return {
      planned: true,
      used: true,
      status: "success",
      action: plan.action,
      resource: plan.action === "search" ? plan.search.type ?? "issues" : plan.get.resource,
      latencyMs: Date.now() - started,
      resultCount: Array.isArray(compacted) ? compacted.length : Array.isArray((compacted as any).items) ? (compacted as any).items.length : 1,
      data: compacted,
    };
  } catch (error) {
    return {
      planned: true,
      used: true,
      status: "error",
      action: plan.action,
      resource: plan.action === "search" ? plan.search.type ?? "issues" : plan.get.resource,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown GitHub error",
    };
  }
}

export function appendGitHubEvidenceMessage(messages: ChatMessage[], evidence: GitHubEvidenceResult): ChatMessage[] {
  if (!evidence.planned || evidence.status === "skipped") return messages;

  const content = evidence.status === "success"
    ? [
        "Read-only GitHub evidence was retrieved before answering.",
        `Action: ${evidence.action ?? "unknown"}`,
        `Resource: ${evidence.resource ?? "unknown"}`,
        `Result count: ${evidence.resultCount ?? 0}`,
        `Evidence JSON:\n${JSON.stringify(evidence.data, null, 2).slice(0, 12000)}`,
        "Use this evidence when relevant. Cite GitHub URLs from it. Do not claim write access.",
      ].join("\n")
    : [
        "A read-only GitHub lookup was planned but did not provide evidence.",
        `Action: ${evidence.action ?? "unknown"}`,
        `Error: ${evidence.error ?? "unknown error"}`,
        "Answer from available context and mention uncertainty if GitHub evidence is required.",
      ].join("\n");

  return [...messages, { role: "user", content }];
}

async function githubJson(path: string, token: string, fetcher: typeof fetch) {
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

function clampLimit(limit?: number) {
  if (!Number.isInteger(limit)) return 5;
  return Math.max(1, Math.min(limit as number, 10));
}

function requireNumber(value: number | undefined, field: string): number {
  if (!Number.isInteger(value)) throw new Error(`${field} is required`);
  return value as number;
}

function requireText(value: string | undefined, field: string) {
  if (!value?.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function encodePath(value: string) {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

function trimText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function extractRepo(prompt: string) {
  return prompt.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/)?.[1];
}

function splitRepo(repo: string): [string, string] {
  const [owner, name] = repo.split("/");
  if (!owner || !name) throw new Error("repo must be owner/name");
  return [owner, name];
}

function extractNumber(prompt: string, pattern: RegExp) {
  const raw = prompt.match(pattern)?.[1];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) ? value : undefined;
}

function extractRef(prompt: string) {
  return prompt.match(/\b(?:sha|commit|ref)\s+([a-f0-9]{7,40}|[A-Za-z0-9_.\/-]+)\b/i)?.[1];
}

function cleanSearchQuery(prompt: string) {
  return prompt
    .replace(/\b(search|find|github|repo|repository|issues?|prs?|pull requests?|code|files?|ci|checks?|status|workflow|actions?)\b/gi, " ")
    .replace(/\b[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "repo activity";
}
