# LLM Tool Loop Design

## Goal

Replace brittle deterministic GitHub and subagent routing with a model-directed tool loop inside the Cloudflare Worker. The Worker keeps the final chat response streamed to the existing frontend while the model decides whether to answer directly or call safe server-side tools.

## Architecture

The Worker makes a non-streaming OpenRouter controller call with OpenAI-compatible tool schemas. The model can either return normal answer content or request one safe tool call. The Worker validates the requested tool name and arguments, executes only local read-only helpers, appends the tool result as an observation, and makes one final streaming OpenRouter call.

## Tools

The first version exposes three tools:

`github_search` searches GitHub issues, PRs, code, repositories, and users with fixed read-only REST endpoints.

`github_get` retrieves specific issue, PR, review, file, commit status, check, workflow run, or workflow job details through fixed read-only REST endpoints.

`run_subagents` runs the existing bounded parallel specialist workers and returns their findings.

## Safety

The model never receives credentials and never executes arbitrary URLs or arbitrary HTTP methods. The Worker validates arguments, clamps limits, maps resources to fixed endpoint templates, and allows only `GET` requests to GitHub. If the controller output is invalid, asks for an unknown tool, or the tool fails, the Worker falls back to a final streamed answer with the available context and error observation.

## Observability

Langfuse metadata records controller latency, whether a tool was requested, requested tool name, validation status, tool latency, tool result status, and whether final streaming used an observation.

## Testing

Tests cover tool schema shape, tool-call extraction, argument validation, GitHub tool execution, subagent tool execution with an injected runner, direct-answer fallback, and final message construction.
