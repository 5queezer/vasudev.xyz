# Worker Subagents Design

## Goal

Add automatic deterministic subagent routing inside the Cloudflare Worker that backs the site chat. The React chat widget and Vercel AI SDK client stay unchanged.

## Architecture

The Worker keeps the existing direct streaming path for simple prompts. For complex prompts, it creates a bounded set of worker briefs, runs non-streaming OpenRouter calls in parallel, then streams one final synthesis call to the client.

The router is deterministic. It scores the latest user prompt for complexity, multi-angle language, comparison, debugging, review, optimization, and broad context needs. There is no LLM router in this version.

## Components

`worker/src/subagents.ts` contains pure routing and prompt-building helpers. `worker/src/index.ts` owns OpenRouter calls, tracing metadata, graceful degradation, and the final SSE stream.

## Data flow

A POST request arrives with Vercel-style messages. The Worker extracts the latest user message and asks `planSubagents` whether to use subagents. Direct routing preserves current behavior. Subagent routing runs two or three bounded worker calls with focused system prompts. Their outputs are inserted into the final model request as evidence for synthesis.

## Error handling

Worker failures do not fail the chat. The final synthesis receives successful outputs plus failure notes. If all workers fail, the Worker falls back to a direct streaming completion.

## Observability

Langfuse metadata records `routing_action`, `routing_reason`, `subagent_count`, `subagent_names`, `subagent_statuses`, `subagent_latencies_ms`, and `subagent_total_latency_ms` so routing thresholds can be optimized later from real traffic.

## Testing

Pure router tests cover direct routing, automatic subagent routing, bounded worker count, worker brief names, and synthesis message construction. Worker type checking validates integration.
