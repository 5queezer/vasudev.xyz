# Worker GitHub Read-Only Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe read-only GitHub evidence retrieval to the Cloudflare Worker chat backend.

**Architecture:** Create a focused `worker/src/github.ts` module for deterministic planning, path building, read-only fetching, compaction, and message augmentation. Integrate it into `worker/src/index.ts` before final OpenRouter streaming so direct and subagent answers can use GitHub evidence.

**Tech Stack:** Cloudflare Workers, TypeScript, GitHub REST API, OpenRouter, Langfuse metadata.

---

### Task 1: GitHub helper module

**Files:**
- Create: `worker/src/github.ts`
- Create: `worker/tests/github.test.ts`

- [ ] Write failing tests for search paths, get paths, compaction, planning, and message augmentation.
- [ ] Run `node --experimental-strip-types --test worker/tests/github.test.ts` and confirm it fails because the module is missing.
- [ ] Implement the minimal helper module.
- [ ] Run the GitHub tests and confirm they pass.

### Task 2: Worker integration

**Files:**
- Modify: `worker/src/index.ts`

- [ ] Add `GITHUB_TOKEN` to `Env`.
- [ ] Run `collectGitHubEvidence` after routing and before final OpenRouter streaming.
- [ ] Append evidence to direct or subagent synthesis messages.
- [ ] Add Langfuse metadata for GitHub plan, status, latency, result count, and errors.
- [ ] Run `npm --prefix worker run typecheck`.

### Task 3: Verification and deployment prep

**Files:**
- Validate: `worker/src/index.ts`
- Validate: `worker/src/github.ts`

- [ ] Run GitHub and subagent tests.
- [ ] Run Worker typecheck.
- [ ] Prompt for the safe read-only token and set it with `wrangler secret put GITHUB_TOKEN`.
- [ ] Deploy with `npm --prefix worker run deploy`.
