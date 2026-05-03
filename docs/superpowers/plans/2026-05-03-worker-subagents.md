# Worker Subagents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic deterministic subagent execution inside the Cloudflare Worker chat endpoint.

**Architecture:** Pure routing and prompt-building helpers live in `worker/src/subagents.ts`. The Worker runs parallel non-streaming OpenRouter worker calls only when the router selects subagents, then streams a final synthesis response through the existing SSE path.

**Tech Stack:** Cloudflare Workers, TypeScript, OpenRouter OpenAI-compatible chat completions, Langfuse metadata.

---

### Task 1: Router and prompt helpers

**Files:**
- Create: `worker/src/subagents.ts`
- Create: `worker/tests/subagents.test.ts`

- [ ] Write failing node:test coverage for direct prompts, complex prompts, worker count bounds, and synthesis messages.
- [ ] Run `node --experimental-strip-types --test worker/tests/subagents.test.ts` and confirm it fails because `worker/src/subagents.ts` is missing.
- [ ] Implement `planSubagents`, `buildWorkerMessages`, and `buildSynthesisMessages`.
- [ ] Run the router test and confirm it passes.

### Task 2: Worker integration

**Files:**
- Modify: `worker/src/index.ts`

- [ ] Import subagent helpers.
- [ ] Add non-streaming OpenRouter worker calls with latency and status capture.
- [ ] Route direct requests through the existing stream path.
- [ ] Route subagent requests through parallel workers, then stream final synthesis.
- [ ] Fall back to direct streaming when all workers fail.
- [ ] Add Langfuse routing and subagent metadata.
- [ ] Run `npm --prefix worker run typecheck`.

### Task 3: Verification

**Files:**
- Test: `worker/tests/subagents.test.ts`
- Validate: `worker/src/index.ts`

- [ ] Run `node --experimental-strip-types --test worker/tests/subagents.test.ts`.
- [ ] Run `npm --prefix worker run typecheck`.
- [ ] Confirm existing frontend remains untouched.
