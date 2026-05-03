# LLM Tool Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace deterministic GitHub and subagent routing with a model-directed, Worker-enforced OpenRouter tool loop.

**Architecture:** Add `worker/src/tool-loop.ts` for OpenAI-compatible tool schemas, tool-call parsing, argument validation, local tool dispatch, and final message construction. Modify `worker/src/index.ts` to call the controller non-streaming, execute at most one safe tool call, then stream the final answer.

**Tech Stack:** Cloudflare Workers, TypeScript, OpenRouter OpenAI-compatible chat completions, GitHub REST API, Langfuse metadata, node:test.

---

### Task 1: Tool loop helper module

**Files:**
- Create: `worker/src/tool-loop.ts`
- Create: `worker/tests/tool-loop.test.ts`

- [ ] Write tests for schemas, extracting one tool call, validating GitHub search args, rejecting unknown tools, and appending observations.
- [ ] Run `node --experimental-strip-types --test worker/tests/tool-loop.test.ts` and confirm it fails because the module is missing.
- [ ] Implement the minimal helper module.
- [ ] Run the tool loop tests and confirm they pass.

### Task 2: Runtime dispatch

**Files:**
- Modify: `worker/src/tool-loop.ts`
- Modify: `worker/src/github.ts`
- Modify: `worker/tests/tool-loop.test.ts`

- [ ] Add dispatch tests for `github_search`, `github_get`, and `run_subagents` using injected fetcher and subagent runner.
- [ ] Run the tests and confirm they fail because dispatch is missing.
- [ ] Export safe GitHub execution helpers from `worker/src/github.ts`.
- [ ] Implement dispatch in `worker/src/tool-loop.ts`.
- [ ] Run the tests and confirm they pass.

### Task 3: Worker integration

**Files:**
- Modify: `worker/src/index.ts`
- Modify: `worker/tests/subagents.test.ts` if old deterministic expectations no longer apply.

- [ ] Replace deterministic `planSubagents` and `collectGitHubEvidence` pre-routing with `runModelToolStep`.
- [ ] Keep final streaming behavior unchanged.
- [ ] Add Langfuse metadata for controller and tool calls.
- [ ] Run Worker typecheck and all Worker tests.

### Task 4: Deploy and follow-up package

**Files:**
- Validate: `worker/src/index.ts`
- Later inspect: `/home/christian/Projects/tanstack-subagents`

- [ ] Deploy Worker after verification.
- [ ] Commit and push Worker changes.
- [ ] Inspect `tanstack-subagents` for the same deterministic-router assumption and update it after this Worker change is stable.
