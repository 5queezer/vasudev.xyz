---
title: "Your Agent's Memory Metrics Are Lying to You. Here's How to Ground Them."
date: 2026-04-02
tags: ["ai", "memory", "benchmarks", "muninndb"]
series: ["Building Agents That Sleep"]
series_weight: 3
description: "Memory consolidation looks great on dashboards. But if your metrics can improve without retrieval getting better, you're optimizing a detached proxy."
images: ["/images/memory-metrics-lying-how-to-ground-them-og.png"]
---













I built a memory consolidation system for AI agents. It deduplicates memories, strengthens associations, decays stale entries, and produces a dream journal you can actually read. The dashboard looks fantastic: dedup rate up, memory count down, association density climbing.

None of that tells you whether the agent remembers the right thing at the right time.

**If a metric can improve without retrieval quality also improving, that metric is a detached proxy. Stop optimizing it.**

## The Problem Has a Name

I recently read an essay called ["The Collapse of Proxy Integrity"](https://standardgalactic.github.io/antivenom/proxy_integrity.pdf) by an independent researcher named Flyxion. The core argument: when a measurable signal gets decoupled from the process it's supposed to track, the signal becomes self-referential. You end up optimizing the map while the territory rots.

The essay was written about attention platforms (follower counts, engagement metrics, viral loops) but the mechanism it describes applies everywhere measurable signals are used to make decisions. Including AI agent memory.

The operational criterion Flyxion proposes is simple and brutal: a proxy is grounded when it cannot be moved at scale without commensurate movement in the underlying process. If you can inflate the metric while the thing-the-metric-is-supposed-to-measure stays flat, the metric is broken. Not noisy. Not imperfect. Structurally broken.

Apply that to agent memory consolidation and the implications are immediate.

## What Dream Engine Does (and What It Measures)

[Dream Engine](https://github.com/scrypster/muninndb/pull/306) is a PR I contributed to MuninnDB, a cognitive database built by [scrypster](https://github.com/scrypster). It runs LLM-driven memory consolidation between agent sessions, modeled loosely after human sleep. The pipeline works in phases: vault scanning, Hebbian association replay, near-duplicate clustering, LLM-powered deduplication, bidirectional stability adjustments, transitive inference, and a human-readable dream journal.

The natural metrics to track during consolidation are: how many duplicates were merged, how many associations were strengthened, how much the memory count dropped, how the confidence distribution shifted. These are easy to compute. They go into dashboards. They feel like progress.

Here's the problem: every single one of those metrics can improve while retrieval quality degrades. Aggressive deduplication can merge memories that looked similar but carried distinct contextual signals. Strengthening the wrong associations can push the retrieval ranker toward frequently-accessed memories and away from the actually-relevant one. Reducing memory count can discard low-confidence entries that happen to be the only record of a rare but important fact.

The consolidation dashboard says "great run." The agent forgets your name.

## Goodhart's Law Is a Structural Attractor, Not a Warning

Flyxion's sharpest insight is that Goodhart's law ("when a measure becomes a target, it ceases to be a good measure") isn't a warning about careless optimization. It's a description of an attractor state. Any system that applies sustained optimization pressure to a proxy will converge on proxy detachment, because manipulating the proxy is always cheaper than improving the underlying process.

In agent memory, this manifests as a specific failure mode. If you tune your consolidation thresholds to maximize dedup rate on your test vault, you will find thresholds that merge aggressively. The dedup metric looks great. But you've just trained your system to optimize for a signal that's cheaper to move than the thing you actually care about: does the agent retrieve the correct memory when it matters?

The research confirms this risk. LongMemEval (ICLR 2025) and MemoryBench both show that consolidation systems can degrade retrieval compared to naive RAG baselines. The consolidation "worked" (it merged, it decayed, it strengthened) but the agent got worse at answering questions. The proxy improved. The territory degraded. Textbook proxy detachment.

## External Validation: Raw Storage Wins

Since publishing this post, two data points have reinforced the proxy detachment thesis.

[MemPalace](https://github.com/milla-jovovich/mempalace) (Jovovich/Sigman, April 2026) stores every conversation verbatim and retrieves with ChromaDB embeddings. Zero consolidation, zero extraction, zero summarization. It scores 96.6% R@5 on LongMemEval with no API calls, and 92.9% on ConvoMem. Mem0, which uses LLM-powered fact extraction, scores 30-45% on the same ConvoMem benchmark. The system that does nothing to its memories outperforms the system that actively curates them by more than 2x.

My own ablation data tells the same story. Running the [GoodAI LTM benchmark](https://github.com/5queezer/goodai-ltm-benchmark/pull/16) against MuninnDB ([PR #367](https://github.com/scrypster/muninndb/pull/367)), baseline (no dream consolidation) scored 0.489 composite. Full dream phases scored 0.374. The Optuna-best phase subset scored 0.322. Every consolidation variant underperformed doing nothing. The dashboard metrics (dedup rate, association density) improved with each variant. Retrieval quality went the other direction.

This is proxy detachment measured in the wild, not theorized. The consolidation system optimizes its own internal signals while the territory (actual retrieval quality) degrades.

## The Grounding Criterion for Memory Metrics

The fix is architectural, not incremental. Before you ship any memory consolidation feature, define a retrieval benchmark that represents realistic agent query patterns. Then apply the grounding criterion: every metric you track must be one that cannot improve without retrieval accuracy also improving.

For [MuninnDB issue #311](https://github.com/scrypster/muninndb/issues/311), the benchmark harness blocking Dream Engine's write paths, we're using this approach. The benchmark set is [LongMemEval](https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned): 500 curated questions covering information extraction, multi-session reasoning, temporal reasoning, knowledge updates, and abstention. The procedure:

Run baseline retrieval on the unmodified vault. Enable consolidation phases. Re-run the same queries. If recall drops on any category, the phase doesn't ship. No amount of dashboard improvement overrides a retrieval regression.

This is bidirectional constraint. The consolidation metrics (dedup rate, association density) are only meaningful if they move in the same direction as retrieval quality. If they diverge, the consolidation metric is a detached proxy and you discard it from your decision-making, no matter how good the number looks.

## Why This Matters Beyond Memory

The same pattern shows up everywhere in AI agent development.

Tool call success rate can go up while task completion quality goes down because the agent learns to call easy tools more often. Latency can drop while accuracy drops because the agent learns to skip expensive reasoning steps. Token efficiency can improve while helpfulness degrades because the agent learns to be terse rather than thorough.

Every one of these is a proxy that can be moved without moving the underlying process. Every one will be optimized toward detachment if you treat the metric as a target rather than a diagnostic.

The fix is the same in every case: define the ground truth you actually care about, measure it directly even if it's expensive, and treat all other metrics as diagnostic signals that must co-move with ground truth or be discarded.

## What I Left Out

The proxy integrity essay also analyzes "temporal compression" where the appearance of skill is manufactured without the underlying process. That maps to synthetic benchmarks where you generate test data that looks realistic but doesn't carry the statistical properties of real agent interactions. I'm using LLM-generated synthetic vault entries for controlled ground-truth scenarios, but they're supplements to LongMemEval, not replacements.

I haven't addressed the multi-agent case, where one agent's consolidated memory feeds into another agent's context. Proxy detachment in that setting could cascade: bad consolidation upstream produces bad retrieval downstream, but both agents' dashboards look fine. That's a problem for Hrafn's A2A protocol work, but it's future scope. A related issue: Agent Cards in A2A carry an `agent_id` but nothing binds that ID to interaction history. A malicious agent can regenerate its card and start with fresh reputation. Flyxion's ["Against Namespace Laundering"](https://standardgalactic.github.io/antivenom/Against%20Namespace%20Laundering.pdf) formalizes exactly this failure mode. That's a separate post.

The essay's analysis of platform incentives (advertising models are economically insulated from signal degradation) has an analog in open-source: star counts and download metrics are proxies for utility that can detach just as easily. But that's a different post.

## The Principle

Memory consolidation is not compression. It's curation. The difference is whether you're grounding your decisions in retrieval quality or in dashboard metrics that happen to be easy to compute.

If your consolidation metrics can go up while your agent's ability to answer real questions goes down, you're building a system that optimizes for its own internal signals. The map becomes self-referential. The territory disappears.

Ground your metrics. Benchmark before you ship. Discard any signal that can be moved independently of what you actually care about.

The full Dream Engine implementation is in [MuninnDB PR #306](https://github.com/scrypster/muninndb/pull/306). The benchmark harness blocking the write paths is [issue #311](https://github.com/scrypster/muninndb/issues/311). If you're building agent memory systems and want to compare notes on grounding retrieval metrics, open an issue on [Hrafn](https://github.com/5queezer/hrafn).

---

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), a lightweight AI agent runtime for edge hardware. More at [vasudev.xyz](https://vasudev.xyz).*

