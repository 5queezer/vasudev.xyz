import test from "node:test";
import assert from "node:assert/strict";

import {
  appendGitHubEvidenceMessage,
  buildGitHubGetPath,
  buildGitHubSearchPath,
  compactGitHubItems,
  planGitHubEvidence,
} from "../src/github.ts";

test("builds read-only GitHub search paths", () => {
  assert.equal(
    buildGitHubSearchPath({ query: "subagents", type: "prs", repo: "5queezer/vasudev.xyz", limit: 3 }),
    "/search/issues?q=subagents+repo%3A5queezer%2Fvasudev.xyz+is%3Apr&per_page=3",
  );
  assert.equal(
    buildGitHubSearchPath({ query: "ChatWidget", type: "code", repo: "5queezer/vasudev.xyz" }),
    "/search/code?q=ChatWidget+repo%3A5queezer%2Fvasudev.xyz&per_page=5",
  );
});

test("builds fixed read-only GitHub get paths", () => {
  assert.equal(buildGitHubGetPath({ resource: "issue", owner: "o", repo: "r", number: 7 }), "/repos/o/r/issues/7");
  assert.equal(buildGitHubGetPath({ resource: "pr_files", owner: "o", repo: "r", number: 8, limit: 2 }), "/repos/o/r/pulls/8/files?per_page=2");
  assert.equal(buildGitHubGetPath({ resource: "check_runs", owner: "o", repo: "r", ref: "abc" }), "/repos/o/r/commits/abc/check-runs?per_page=5");
  assert.equal(buildGitHubGetPath({ resource: "workflow_run_jobs", owner: "o", repo: "r", runId: 9 }), "/repos/o/r/actions/runs/9/jobs?per_page=5");
});

test("compacts GitHub items into safe evidence", () => {
  const result = compactGitHubItems([
    { title: "Fix bug", html_url: "https://github.com/o/r/issues/1", state: "open", user: { login: "c" }, body: "Long body" },
    { name: "file.ts", html_url: "https://github.com/o/r/blob/main/file.ts", path: "src/file.ts", repository: { full_name: "o/r" } },
  ]);

  assert.deepEqual(result, [
    { title: "Fix bug", url: "https://github.com/o/r/issues/1", state: "open", repository: undefined, user: "c", body: "Long body" },
    { title: "file.ts", url: "https://github.com/o/r/blob/main/file.ts", state: undefined, repository: "o/r", user: undefined, body: "src/file.ts" },
  ]);
});

test("plans GitHub evidence only for GitHub-related prompts", () => {
  assert.equal(planGitHubEvidence("What is this post about?", "5queezer/vasudev.xyz").action, "none");

  const prPlan = planGitHubEvidence("Review PR 12 in this repo", "5queezer/vasudev.xyz");
  assert.equal(prPlan.action, "get");
  assert.equal(prPlan.get?.resource, "pr");
  assert.equal(prPlan.get?.number, 12);

  const codePlan = planGitHubEvidence("Search GitHub code for ChatWidget", "5queezer/vasudev.xyz");
  assert.equal(codePlan.action, "search");
  assert.equal(codePlan.search?.type, "code");
});

test("plans broad repository searches globally instead of forcing the site repo", () => {
  const plan = planGitHubEvidence("check the github repos for sablier", "5queezer/vasudev.xyz");

  assert.equal(plan.action, "search");
  assert.equal(plan.search?.type, "repos");
  assert.equal(plan.search?.repo, undefined);
  assert.equal(buildGitHubSearchPath(plan.search!), "/search/repositories?q=sablier&per_page=5");
});

test("plans contribution follow-ups from conversation context", () => {
  const plan = planGitHubEvidence(
    "which are the contribs from 5queezer",
    "5queezer/vasudev.xyz",
    "Here are the GitHub repositories that match sablier: sablierapp/sablier",
  );

  assert.equal(plan.action, "search");
  assert.equal(plan.search?.type, "prs");
  assert.equal(plan.search?.repo, "sablierapp/sablier");
  assert.equal(buildGitHubSearchPath(plan.search!), "/search/issues?q=author%3A5queezer+sablier+repo%3Asablierapp%2Fsablier+is%3Apr&per_page=5");
});

test("appends GitHub evidence as a final user message", () => {
  const messages = appendGitHubEvidenceMessage([{ role: "user", content: "Review PR 12" }], {
    planned: true,
    used: true,
    status: "success",
    action: "get",
    resultCount: 1,
    data: { title: "PR title", html_url: "https://github.com/o/r/pull/12" },
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /Read-only GitHub evidence/);
  assert.match(messages[1].content, /PR title/);
});
