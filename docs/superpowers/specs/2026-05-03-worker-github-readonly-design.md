# Worker GitHub Read-Only Tool Design

## Goal

Add read-only GitHub research capability to the Cloudflare Worker chat backend using a `GITHUB_TOKEN` Worker secret. The frontend remains unchanged.

## Architecture

`worker/src/github.ts` owns all GitHub REST path building, read-only fetches, result compaction, and deterministic evidence planning. It exposes pure helpers for tests and one runtime helper that takes a token and `fetch` implementation. `worker/src/index.ts` calls the runtime helper before the final OpenRouter call when the latest prompt clearly asks about GitHub issues, pull requests, code, CI, checks, statuses, or workflows.

## Safety

The integration only uses GitHub REST `GET` endpoints. It does not expose or log the token. It does not call mutation endpoints or accept arbitrary URLs. Repository names, owners, refs, and run ids are inserted only into fixed endpoint templates.

## Data flow

The Worker extracts the latest user prompt. `planGitHubEvidence` decides whether a GitHub lookup is useful and chooses either search or get. The Worker runs the lookup with `env.GITHUB_TOKEN` if available. Successful evidence is appended to direct or synthesis messages before the final streaming OpenRouter request. Missing token or lookup failures degrade gracefully.

## Observability

Langfuse metadata records whether GitHub was planned, whether a request ran, the action, resource or search type, status, latency, result count, and safe error summary.

## Testing

Tests cover search path construction, get path construction, result compaction, deterministic evidence planning, and prompt augmentation with successful or failed GitHub evidence.
