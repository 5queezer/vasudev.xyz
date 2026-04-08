---
title: "Why AI Agents Need Sleep"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
series: ["Building Agents That Sleep"]
series_weight: 1
description: "AI agents capture memories but never consolidate them. Here's how MuninnDB's Dream Engine borrows from neuroscience to fix that."
images: ["/images/dream-engine.png"]
---

I contribute to a cognitive database for AI agents called [MuninnDB](https://github.com/scrypster/muninndb). It stores everything: session notes, project context, work observations, legal documentation. After a few weeks of daily use, entries pile up. Finding things still works. Semantic search is good at retrieval. But the store itself was rotting. Near-duplicate entries from sessions that covered the same ground. Stale facts superseded by newer ones. No system for distinguishing "critical legal note" from "offhand remark about Docker networking."

The problem is not capture. Every memory system nails capture. The problem is what happens between sessions, which is usually nothing.

**AI agents accumulate memories the way hoarders accumulate newspapers. The fix is not better search. It is sleep.**

## What sleep actually does

Human memory consolidation during sleep is not backup. It is an active, destructive process. The hippocampus replays recent experiences, the neocortex integrates them into existing knowledge structures, and the brain actively weakens memories that did not get reinforced. You wake up with fewer memories than you went to sleep with, and that is the point.

Three properties matter for AI system design. First, consolidation is selective. Important memories get strengthened, noise gets weakened. Second, it discovers connections. The brain links concepts across domains during REM sleep. Third, it resolves conflicts. Contradictory memories get adjudicated, with more recent or more reinforced versions winning.

No mainstream AI memory system does any of this. Most do deduplication at best.

## Prior art

The idea is not new. Researchers have been circling it from multiple directions.

Zhong et al. introduced [MemoryBank](https://arxiv.org/abs/2305.10250) (2023), an LLM memory system with Ebbinghaus forgetting curves that decay memories over time unless reinforced. MuninnDB's existing ACT-R model builds on this foundation.

The "Language Models Need Sleep" paper on [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) proposed an explicit "Dreaming" process to transfer fragile short-term memories into stable long-term knowledge. This is the closest theoretical framing to what we are building.

Xie's [SleepGate](https://arxiv.org/abs/2603.14517) framework (2026) added conflict-aware temporal tagging and a forgetting gate, reducing proactive interference from O(n) to O(log n). The key insight: you need to know *when* something was learned to resolve contradictions, not just *what* was learned.

And Anthropic has been testing [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) for Claude Code, a background process that consolidates memory files between sessions. It works on flat text files. Reasonable for a coding assistant. Not sufficient for a cognitive database.

## The gap

MuninnDB already had the capture side covered: vector embeddings, Ebbinghaus decay, Hebbian association learning, and a background consolidation worker doing algorithmic dedup every 6 hours. What it could not do: reason about *why* two entries are similar, resolve contradictions, or discover cross-domain connections. It had a memory. It did not have sleep.

## The Dream Engine

The Dream Engine extends the existing consolidation pipeline with LLM intelligence. It runs between sessions, triggered automatically on server start (the "waking up" metaphor) or manually via CLI.

### Trigger gates

Two conditions must both pass before a dream runs: at least 12 hours since the last dream, and at least 3 new entries written since the last dream. This prevents churning on an inactive store. The gates can be bypassed with `--force` for manual runs.

### The pipeline

The Dream Engine reuses four existing consolidation phases, adds three new ones, and modifies one. Phase 0 and the configurable dedup threshold shipped in [PR #306](https://github.com/scrypster/muninndb/pull/306). The LLM phases (2b, 4, 6) are designed and specced for a follow-up PR.

**Phase 0 (new, shipped): Orient.** Read-only scan of each vault. Count entries, check embedding coverage, compute average relevance and stability scores, detect legal vaults. This builds the map before touching anything.

**Phase 1 (existing): Replay.** Activation replay for Hebbian association weight updates. Unchanged.

**Phase 2 (existing, modified, shipped): Dedup.** The algorithmic dedup phase, but with a split threshold. In normal consolidation mode, entries with cosine similarity >= 0.95 are auto-merged as before. In dream mode, the threshold drops to 0.85. Entries in the 0.85-0.95 range are *not* auto-merged. Instead, they are flagged as near-duplicate clusters and passed to the next phase for LLM review. This is the key architectural decision: let the algorithm handle the obvious cases, let the LLM handle the ambiguous ones.

**Phase 2b (new, a follow-up PR): LLM Consolidation.** The near-duplicate clusters and any detected contradictions get sent to a configured LLM. The LLM returns structured JSON: merge operations, contradiction resolutions, cross-vault connection suggestions, stability recommendations, and a narrative journal entry. The LLM does not auto-link anything across vaults. It only suggests. A human reviews the suggestions in the dream journal.

**Phase 3 (existing): Schema Promotion.** Unchanged.

**Phase 4 (new, a follow-up PR): Bidirectional Stability.** This is where the forgetting happens. High-signal entries (accessed frequently, recently reinforced via Hebbian co-activation, or recommended by the LLM) get a stability boost of 1.2x. Low-signal entries (rarely accessed, old, low relevance, not promoted by the LLM) get weakened to 0.8x with a floor at 14 days, meaning they never drop below the default stability. LLM recommendations override the rules-based adjustments. This models the spacing effect: entries that get retrieved stay strong, entries that don't fade gradually.

**Phase 5 (existing): Transitive Inference.** Unchanged.

**Phase 6 (new, a follow-up PR): Dream Journal.** The LLM narrative plus the consolidation report get formatted into a human-readable entry and appended to `~/.muninn/dream.journal.md`. This is the output you actually read. It tells you what connections were discovered, what was strengthened, what was cleaned up, and what was skipped.

### Vault trust tiers

Not all vaults are equal and not all LLM providers are equal. MuninnDB enforces trust tiers per vault:

Legal vaults skip Phase 2b entirely. They are never sent to any LLM, not even a local one. Legal entries are preserved verbatim and are never touched by consolidation.

Work and personal vaults are restricted to local Ollama or Anthropic's API. They are never sent to OpenAI or other providers.

Global and project vaults can use any configured provider.

This is configured, not hardcoded. The resolution order checks for Ollama first (local, no data leaves the machine), then Anthropic, then OpenAI where the vault policy allows.

### Runtime model

The sleep/wake metaphor maps directly to the server lifecycle. When MuninnDB stops (`muninn stop`), it writes a `dream.due` sidecar file in the data directory. When it starts again (`muninn start`), it checks the file and the trigger gates. If both pass, it runs a dream before opening ports. If the dream exceeds a configurable timeout (default 60 seconds), it aborts and starts normally. The server never blocks on a dream indefinitely.

For manual use: `muninn dream --dry-run` shows what would happen without writing anything. The dry-run still generates the full journal narrative and prints it to stdout with a `[DRY RUN]` header. This is essential for trust. You can see exactly what the engine would do before letting it write.

## What I left out

**Auto-linking cross-vault suggestions.** The Dream Engine suggests connections but never creates them automatically. A human reads the journal and decides. Trust before automation.

**Multi-agent memory sharing.** MuninnDB is one user, one instance. Shared memory across agents is a different threat model entirely.

**Temporal alerts.** The LLM could notice "this API key expires in 4 days" but tracking expiration dates is a feature, not consolidation. Out of scope for v1.

**Emotion modeling.** Salience scoring is a proxy. Real emotional weighting needs signal that a text-based system does not have. Deferred.

## The dream journal

Here is what a dream run will produce once the LLM phases ship in a follow-up PR:

```
---
## 2026-03-28T06:00:00Z -- Dream

**Connections discovered:**
- Your note about DNS timeout in the k8s cluster shares the same
  root cause as the prod incident from March 21. (suggested link)

**Strengthened:**
- 3 memories about auth patterns reinforced (accessed 8+ times)

**Cleaned up:**
- Merged 2 near-duplicate notes about Docker networking
- Resolved 1 contradiction: old API endpoint superseded by new one

*Scanned 47 entries across 3 vaults (legal: 8 skipped) in 4.2s*
```

Every morning, you read what your memory system dreamed about. The connections it noticed. The noise it cleaned up. The contradictions it resolved. It is a changelog for your knowledge, written in prose. MuninnDB is the cognitive memory backend for [Hrafn](https://github.com/5queezer/hrafn), a lightweight, modular AI agent runtime.

## Try it

The read-only foundation (Phase 0 + configurable dedup + dry-run CLI) shipped in [PR #306](https://github.com/scrypster/muninndb/pull/306) and is merged. Write phases (bidirectional stability, LLM consolidation, journal) follow in a separate PR. The full design spec lives in the repo at `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni builds AI agent infrastructure. [Hrafn](https://github.com/5queezer/hrafn) is the runtime. [MuninnDB](https://github.com/scrypster/muninndb) is the memory.*

*The cover image for this post was generated by AI.*

