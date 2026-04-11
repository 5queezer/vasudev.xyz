---
title: "Turiya as Observability: Completing the Four-State Mandukya Mapping"
date: 2026-04-11
tags: ["ai", "agents", "memory", "muninndb", "hrafn"]
series: ["Building Agents That Sleep"]
series_weight: 7
description: "The evaluator that scored 255 Dream Engine mutations touches all three operational states without being part of any. The Mandukya named this role Turiya."
---

The Dream Engine ablation study ([PR #367](https://github.com/scrypster/muninndb/pull/367)) tested 255 phase combinations across 50 Optuna trials. Six GoodAI LTM datasets. Gemini 3.1 Flash Lite as the evaluation model. The evaluator scored every mutation: waking inference accuracy, dream-phase recombination quality, deep-sleep pruning effectiveness. It found that Phase 4 (bidirectional stability) was the most destructive component in the pipeline, at -0.014 average delta. Phase 5 (transitive inference) was the strongest positive contributor, at +0.022.

No individual operational phase could have discovered this. The waking runtime does not know whether dream-phase recombination helped or hurt. The Dream Engine cannot measure whether its consolidation improved downstream retrieval. The decay system has no view into inference quality. Each phase operates inside its own state. The evaluator sits outside all of them.

**The component that sees the whole system must not be optimized by any part of it.**

---

## Two Missing Nodes

The [previous post](/blog/svapna-sushupti/) mapped three of the four states from the [Mandukya Upanishad](https://en.wikipedia.org/wiki/Mandukya_Upanishad) to the Dream Engine architecture. [Svapna](https://en.wikipedia.org/wiki/Svapna) (dreaming) mapped to LLM consolidation. [Sushupti](https://en.wikipedia.org/wiki/Turiya) (deep sleep) mapped to decay and pruning. Two states remained unmapped: [Jagrat](https://en.wikipedia.org/wiki/Jagrat) (waking) and [Turiya](https://en.wikipedia.org/wiki/Turiya) (pure awareness).

A graph analysis of the blog's knowledge structure confirmed the gap. Both Jagrat and Turiya sat at degree zero, completely disconnected from every other concept node. The system that mapped dreaming and deep sleep to concrete engineering had no explicit connection to waking or to observation itself.

This post fills both gaps.

---

## Jagrat: The Waking Runtime

Jagrat is the simplest mapping and the one most easily overlooked because it is obvious.

The Mandukya describes Jagrat as consciousness directed outward through nineteen channels: seven limbs, eleven sense organs, the gross body as vehicle. The mind engages the external world through active perception and response.

[Hrafn](https://github.com/5queezer/hrafn) implements this directly. During waking operation, the agent runtime processes incoming requests, retrieves context from [MuninnDB](https://github.com/scrypster/muninndb), calls tools, and generates responses. Perception flows inward through user queries, API responses, and tool outputs. Action flows outward through generated text, tool invocations, and memory writes. The Mandukya's nineteen channels map to the agent's I/O surface: retrieval endpoints, tool APIs, memory write paths, and response channels.

The reason Jagrat was disconnected in the knowledge graph is that it describes normal operation. Nobody writes about the system working as designed. Every other post in this series describes what happens when the system is *not* doing normal inference: sleeping, dreaming, consolidating, filtering. Jagrat is the background against which all the interesting failures occur.

That makes the mapping structurally important. Without Jagrat explicitly named, the three-state architecture looks like three distinct offline processes. With Jagrat named, the architecture reveals its actual shape: one operational state (waking) supported by three maintenance states (dreaming, deep sleep, observation). Three of four states exist to service the one state that faces the world.

---

## Turiya: The Evaluator That Is Not a Loss Function

The Mandukya's fourth state is the hardest to translate because it is defined by negation. Turiya is not waking, not dreaming, not deep sleep. The text describes it as "neither inward-turned nor outward-turned consciousness, nor the two together" (Mandukya 7). It is pure awareness, the witness of the other three states, continuous through all of them, not modified by any.

The [previous post](/blog/svapna-sushupti/) identified the benchmark harness as the closest correlate. The [environment design post](/blog/ai-environment-design/) established the principle that the evaluator is not a loss function. Now there is data to test whether this mapping holds.

The Dream Engine evaluator scores all three operational states:

| State | What It Observes | What It Cannot Do |
|---|---|---|
| Jagrat (waking) | Retrieval accuracy, tool success rate | Participate in inference |
| Svapna (dreaming) | Consolidation quality, engram delta | Generate consolidation candidates |
| Sushupti (deep sleep) | Decay effectiveness, interference reduction | Choose what to prune |

The evaluator's defining property is that it observes without participating. It does not retrieve memory entries. It does not consolidate them. It does not prune them. It measures the outcomes of all three processes and reports whether the system improved or degraded.

This is the structural parallel to Turiya. The Mandukya describes Turiya as the witness. Not a higher state that supersedes the other three. A continuous presence that observes them. Turiya does not replace waking awareness. It is what makes waking awareness observable.

The [Meta-Harness](https://arxiv.org/abs/2603.28052) results make the case empirically. Changing the harness (the observer) around a fixed LLM produces a 6x performance gap on the same benchmark. The harness does not modify the model. It modifies what gets measured and how. The harness is not inside the model's optimization loop. It is outside, and that outside position is the source of its leverage.

Compare this to a loss function. A loss function is inside the optimization loop. The model is trained to minimize it. The model learns to satisfy the loss function, not necessarily to solve the underlying problem. Goodhart's Law is the formal statement of this failure. A fixed evaluator eventually gets gamed.

The Mandukya makes the same distinction in different vocabulary. States that are "inside" experience (waking, dreaming, deep sleep) are conditioned by their content. The mind in waking mode is shaped by what it perceives. The mind in dreaming mode is shaped by what it recombines. Turiya is not shaped by any content because it does not participate in content generation. It witnesses.

The ablation data illustrates the consequence. The evaluator revealed that Phase 4 (bidirectional stability adjustments) was the most destructive phase, at -0.014 average delta. Phase 2b (LLM adjudication) was also detrimental, at -0.011. Phase 5 (transitive inference) was the strongest positive contributor, at +0.022. None of the three operational phases could have produced this ranking. The evaluator could, because it sat outside all of them.

---

## The Completed Map

| Mandukya State | Sanskrit Role | Engineering Correlate | Key Property |
|---|---|---|---|
| Jagrat (waking) | Outward perception, active engagement | Hrafn runtime: inference, tool use, retrieval | Faces the world, accumulates experience |
| Svapna (dreaming) | Inward recombination, samskara processing | Dream Engine: LLM consolidation, cluster synthesis | Reorganizes without external input |
| Sushupti (deep sleep) | Formless absorption, vritti dissolution | Decay, pruning, interference resolution | Subtracts without adding |
| Turiya (pure awareness) | Witness of all three, unmodified by any | Evaluator/Meta-Harness: scores all mutations | Observes without participating |

---

## Where the Metaphor Breaks

Two places.

First, Turiya in the Mandukya is not a separate component. It is described as the substrate of the other three states, present within all of them simultaneously. The engineering evaluator is a distinct component with its own execution context, its own compute budget, and its own failure modes. A crashed evaluator produces no scores. The Mandukya would not say Turiya can crash. Importing the substrate metaphor would lead to designing the evaluator as something distributed through all components rather than external to them. That architectural choice would destroy the separation that makes it useful.

Second, the Mandukya describes Turiya as peaceful, non-dual. It does not judge. It witnesses. The engineering evaluator emphatically judges. It scores mutations, ranks them, and gates survival. The selection pressure it applies is the opposite of non-dual witnessing. The useful part of the mapping is the structural position (external observer), not the phenomenological quality (peaceful non-judgment). An evaluator that does not judge is not an evaluator.

---

## What I Left Out

**Co-evolutionary evaluator dynamics.** The [environment design post](/blog/ai-environment-design/) argued that the evaluator should co-evolve with the system it measures. In the Mandukya framework, Turiya does not change. It is the unchanging ground. This tension between "the evaluator must adapt" and "the witness is unchanging" is real and unresolved. The practical answer is that the evaluator's position (external) is fixed, but its content (the task battery) changes. Whether that distinction maps to Turiya is an open question.

**AUM as information architecture.** The Mandukya maps A-U-M to waking, dreaming, and deep sleep, with the silence after M as Turiya. The silence is not a fourth sound. It is the space that makes the three sounds audible. This has a suggestive parallel to observability infrastructure: the metrics pipeline is not a fourth operational mode, but the space that makes the three modes measurable. I have not found a way to make this testable, so it stays here.

**Ghosh and Ghosh.** [Maṇḍūkya-APO](https://www.researchgate.net/publication/389264820) maps the same four states to a reinforcement learning consolidation cycle with category-theoretic formalism. Their Turiya mapping is to a "transcendent policy" that integrates across states. The difference: their framework is conceptual (no benchmarks run), while this mapping is grounded in the measured ablation results from PR #367. The two approaches are complementary, not competing.

---

The four-state map is now complete. Three maintenance states service one operational state. An external observer measures all four. Whether you call that observer Turiya or the evaluator harness, the structural requirement is the same: it must not participate in what it observes.

The next test is whether the evaluator's position, not just its content, affects system outcomes. If moving evaluation inline (making the evaluator a loss function rather than an external observer) degrades performance on the Dream Engine benchmarks, the Turiya mapping has empirical support. If inline evaluation performs equally well, the external position is architectural preference, not structural necessity, and the mapping is decorative.

Read [PR #367](https://github.com/scrypster/muninndb/pull/367) for the ablation data. The [GoodAI LTM benchmark adapter](https://github.com/5queezer/goodai-ltm-benchmark/tree/feature/muninn-adapter) is where the next experiment runs.

---

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), a lightweight Rust agent runtime, and contributes to [MuninnDB](https://github.com/scrypster/muninndb). More at [vasudev.xyz](https://vasudev.xyz).*

*The cover image for this post was generated by AI.*
