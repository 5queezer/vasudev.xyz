---
title: "Patanjali Had the Filtering Spec. We Just Wrote the Tests."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Memory consolidation made retrieval worse. Three design principles from agent memory benchmarks, and their unexpected parallels in yogic attention theory."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
---








[MuninnDB](https://github.com/scrypster/muninndb)'s consolidation system merged three color-variant duplicate engrams exactly as designed (cosine similarity >= 0.95). Retrieval got worse. In a 13-engram vault, removing duplicates shifted the normalization anchor, pushing relevant results down the ranking. The fix was a guard clause: `MinDedupVaultSize` (default 20), skipping Phase 2 dedup in small vaults. [PR #359](https://github.com/scrypster/muninndb/pull/359) closed the issue.

The failure wasn't a bug in the dedup algorithm. It was a failure of *discernment*: a valid consolidation operation applied in a context where it caused harm. When to consolidate, when to leave alone, what counts as noise vs. signal. That problem has a long history outside computer science. I found three specific design principles in the [Yoga Sutras](https://en.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) that map to empirical results from [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, March 2026), [MemoryBench](https://arxiv.org/abs/2510.17281), and Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).

**The contemplative traditions built sophisticated models of attention filtering. Some of those models generate testable hypotheses that the current agent memory literature doesn't make.**

## 1. Not all noise is equal (Vrtti Nirodha)

Before the dedup failure, [benchmark #311](https://github.com/scrypster/muninndb/issues/311) hit a more basic problem. MuninnDB's ACT-R scoring ([issue #331](https://github.com/scrypster/muninndb/issues/331)) clamped fresh engrams to raw=1.0, making all retrieval scores identical at 0.9000. The system could not distinguish signal from noise. Every entry looked equally relevant. After the fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)), score range improved to 0.18-0.90 and correct top-1 retrieval went to 5/5 queries. Uniform treatment of entries had been destroying retrieval quality.

Meta-Harness confirmed the same pattern at a different scale. Their [critical ablation (Table 3)](https://arxiv.org/abs/2603.28052) compared three levels of information access for the harness optimizer:

| Condition | Median Accuracy | Best Accuracy |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM-generated summaries performed *worse* than raw scores alone (best accuracy 38.7% vs 41.3%). Full raw traces got 56.7%. The summaries collapsed diagnostic signal alongside noise, destroying the information the optimizer needed. On text classification, Meta-Harness achieved 48.6% vs ACE's 40.9% while using 4x fewer context tokens. The winning move was not more information. It was better *selection* of information.

The design principle: indiscriminate treatment of entries destroys retrieval quality, whether that treatment is uniform scoring, lossy summarization, or undifferentiated dedup.

Yoga Sutras 1.2 defines yoga as *chitta vrtti nirodha*, the cessation of fluctuations in the mind-field. Patanjali doesn't say "delete everything." He distinguishes [*kleshas*](https://en.wikipedia.org/wiki/Klesha_(Hinduism)) (distortions: attachment, aversion, ego, ignorance, fear of death) from [*pramanas*](https://en.wikipedia.org/wiki/Pramana) (valid cognition: direct perception, inference, testimony). The practice is surgical: reduce the distortions, preserve the signal. The score saturation bug was the system failing to make that distinction. Every vrtti looked the same.

The design implication for MuninnDB: decay floors should reflect outcome, not just access frequency. A verified API pattern and a failed curl attempt might have identical retrieval rates but radically different retention value. You could try to classify entries upfront as pramana or klesha (verified vs. distorted), but that classification is itself the hard problem. For most entries, it requires semantic judgment, which means an LLM in the decay path, which makes consolidation expensive and nondeterministic.

The simpler path: **outcome-tagged writes**. When an agent retrieves an entry and the subsequent action succeeds, the entry gets an `outcome: success` signal. When the action fails, `outcome: failure`. The decay floor couples to the success rate, not to an epistemic category. This is essentially bandit feedback on retrieval, an idea well-established in information retrieval, applied here to persistent agent memory. No ontology needed. No LLM in the loop. You don't need to classify the vrtti in advance. You observe its effect and let that observation shape retention.

---

## 2. Reinforcement needs a counterweight (Samskara and Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) tested three state-of-the-art memory systems (A-Mem, Mem0, MemoryOS) against naive RAG baselines that simply retrieve from raw context. None of the advanced systems consistently outperformed the baselines. The specific failure mode: these systems could not utilize procedural memory (feedback logs indicating system performance history). They treated all inputs as declarative knowledge, ignoring the signals that would have told them which memories were actually useful.

MuninnDB's benchmark #311 produced a local version of the same problem. Phase 2 dedup correctly identified and merged three color-variant duplicates (cosine >= 0.95). But in the 13-engram vault, removing those entries changed the normalization anchor. An unrelated engram became the reference point, pushing relevant results down the ranking. A valid consolidation operation, applied uniformly, crowded out the right answer.

Böckeler's [harness engineering taxonomy](https://martinfowler.com/articles/harness-engineering.html) explains the structural mismatch. She distinguishes computational sensors (deterministic, cheap, run on every change) from inferential sensors (semantic, expensive, probabilistic). Dedup at cosine >= 0.95 is a computational process. Detecting when dedup harms retrieval requires inferential judgment: "these entries are similar, but is removing them *safe* in this vault?" No similarity threshold can answer that.

The [Yoga Sutras](https://en.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) name the same dynamic. [Samskaras](https://en.wikipedia.org/wiki/Samskara_(Indian_philosophy)) are latent impressions that shape future perception. Every experience leaves a trace, and repeated experiences deepen the groove. MuninnDB implements this directly: entries that co-activate strengthen their association weights. The Sutras warn that samskaras compound. Without the counterweight of [*vairagya*](https://en.wikipedia.org/wiki/Vairagya) (non-attachment, the capacity to release strong associations), they calcify into [*vasanas*](https://en.wikipedia.org/wiki/Vasana), automatic reaction patterns that bypass conscious evaluation. You stop seeing the situation and start running the script.

The missing mechanism is explicit Hebbian *weakening*: not just passive decay, but active correction when a strongly associated entry produces a false positive retrieval. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) is now completed ([PR #359](https://github.com/scrypster/muninndb/pull/359)), and the initial results already forced one correction (the `MinDedupVaultSize` guard). The next measurement requires the synthetic vault generator with labeled engram classes: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped, and Legal-adjacent. The sharper metric is *displacement rate*: how often does a strongly associated but less relevant entry push a more relevant entry out of the top-k? That's the direct vasana measurement: not just "wrong thing retrieved" but "right thing crowded out by habitual retrieval." If strengthened entries produce measurable displacement, vairagya as a design primitive is empirically justified. If they don't, the current passive decay is sufficient and we skip the complexity.

**Update (2026-04-08):** The Dream Engine Phase 2 ablation study ([PR #367](https://github.com/scrypster/muninndb/pull/367)) now provides concrete numbers. 50 Optuna trials across 255 phase combinations, validated on 6 GoodAI LTM datasets with Gemini 3.1 Flash Lite:

| Phase | Avg Delta | Verdict |
|---|---|---|
| 5 Transitive Inference | +0.022 | Helpful |
| 0 Orient | +0.007 | Helpful |
| 2 Semantic Dedup | +0.006 | Helpful |
| 4 Bidirectional Stability | -0.014 | Detrimental |
| 2b LLM Adjudication | -0.011 | Detrimental |
| 1 Relevance Decay | -0.011 | Detrimental |

Phase 4 (stability adjustments, the samskara strengthening mechanism) is the most destructive phase. The empirical case for vairagya as a design primitive is confirmed: unchecked reinforcement damages retrieval. But the data also suggests that the simpler fix is to not reinforce at all, rather than to build a sophisticated weakening counterweight. scrypster's [review](https://github.com/scrypster/muninndb/pull/367#issuecomment) reached the same conclusion: ship only the positive-delta phases (0, 2, 5), hold the write paths until LocOMo and LongMemEval validation is complete.

---

## 3. The power of deliberate exclusion (Pratyahara)

Meta-Harness's most surprising result: the winning harnesses are not the ones that pack the context window with everything available. The text classification winner uses TF-IDF with contrastive pairs and label priming (48.6% accuracy, 4x fewer tokens than the runner-up). The math retrieval winner is a four-route BM25 program with lexical predicates. Simple selection policies. No exotic architectures. Changing the harness around a fixed LLM produces a 6x performance gap on the same benchmark.

Böckeler frames it as "keep quality left": the earlier you filter, the cheaper and more reliable the downstream result. Her computational guides (linters, schemas, CLAUDE.md rules) prevent entire categories of information from reaching the model at all. The `MinDedupVaultSize` guard from PR #359 is the same principle applied to consolidation: instead of running dedup on every vault and hoping the model handles the degraded results, the system learned to *not apply* dedup in small vaults. Exclusion of a process, not just exclusion of data.

The first version of this post argued that the Memory Trait interface should return rejection metadata alongside results. "These 3 entries matched, and these 5 were excluded because of X." More diagnostic signal for the LLM. Better informed decisions. Sounds reasonable.

It's wrong, and the yogic principle of [pratyahara](https://en.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explains why. Pratyahara is often translated as "sense withdrawal," but that's misleading. It's not blindness. It's *selective attention*. The senses still function. They just stop pulling the mind toward every stimulus. You decide what enters awareness instead of reacting to whatever arrives.

If you tell the LLM "here are 5 things I'm deliberately withholding from you," you've shown it the objects and added a prohibition. That's not sense withdrawal. That's sense stimulation with a warning label. Anyone who's meditated knows the result: "don't think about a white elephant" guarantees you'll think about the white elephant. Concretely: rejection explanations consume tokens (contradicting the Meta-Harness finding that simple harnesses win) and invite the model to second-guess the filter ("Why was X excluded? Maybe I need it after all"). Non-essential context degrades model performance even when it's technically accurate, and exclusion metadata is by definition non-essential to the task at hand.

The right separation: **the agent sees only the top-k results. The benchmark harness sees everything.** The Memory Trait interface stays slim: `retrieve → Vec<Entry>`. But the retrieval implementation logs the full decision internally: what was returned, what was excluded, why, and what the agent did next. The benchmark consumes the logs. The agent consumes the entries.

A trace entry looks like this:

```json
{
  "query": "OAuth token refresh pattern for MCP server",
  "retrieved": ["entry_041", "entry_187", "entry_203"],
  "excluded": [
    {"id": "entry_089", "reason": "hebbian_weight_below_threshold", "score": 0.42},
    {"id": "entry_312", "reason": "ebbinghaus_decayed", "score": 0.31}
  ],
  "agent_action": "implemented_refresh_flow",
  "outcome": "success"
}
```

The agent never sees `excluded`. The benchmark harness sees all of it. If `entry_089` was the right answer and got filtered because its Hebbian weight was low, that shows up in the trace, and the next iteration of the retrieval policy can adjust.

In Böckeler's taxonomy: the Memory Trait is a computational guide (it determines what enters the context). The trace log is a computational sensor (it observes what happened). They don't merge. Pratyahara isn't conscious filtering in the sense of *the filtered system being aware of the exclusion*. It's conscious filtering in the sense of *the designer being aware*, through the trace logs, so the next iteration of the filter improves. The consciousness belongs to the harness engineer reading the traces, not to the agent executing the queries.

---

## Where the metaphor breaks

Two places.

First, the [Koshas](https://en.wikipedia.org/wiki/Kosha) (Vedantic body layers: physical, energetic, mental, discriminative, bliss) imply a hierarchy from gross to subtle, with the subtle being "higher." Harness engineering has no such value ordering. A deterministic linter is not "lower" than an LLM-as-judge. Böckeler explicitly notes that computational sensors are cheap enough to run on every change, while inferential controls are expensive and probabilistic. In practice, you want to *maximize* the "gross" layer, not transcend it. Importing the Kosha hierarchy into harness design would lead you to over-invest in inferential controls and under-invest in deterministic ones. The opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response. You want the agent to develop reliable patterns, not dissolve them. Vairagya in the yogic sense means letting go of *all* attachment. In harness engineering it means letting go of *incorrect* attachments. The goal is better conditioning, not no conditioning. Importing the full soteriological framework would lead to an agent that achieves enlightenment by refusing to retrieve anything at all. Unhelpful.

---

## What this isn't

This isn't "ancient wisdom validates my architecture." The causal arrow runs the other direction: the contemplative traditions developed sophisticated phenomenological models of attention, memory, and information filtering over millennia of systematic introspection. That some of those models predict results in agent memory research isn't mystical. It's convergent engineering on the same problem: how does a bounded system manage unbounded information flow?

This also isn't the first attempt at the intersection. Ghosh and Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) and its successor Maṇḍūkya-APO map Vedantic states of consciousness (the four states of the Māṇḍūkya Upaniṣad: waking, dreaming, deep sleep, transcendent) to a wake-sleep consolidation cycle for RL agents, formalized with category theory. The architectural intuition is sound and the mapping is serious. But both papers are explicitly conceptual frameworks without empirical validation. The benchmarks they propose (FurnitureBench, Atari-57, Intel Loihi) have not been run. The gap between "proposed framework" and "measured result" is where most cross-disciplinary work dies. The three hypotheses below are designed to not die there.

The useful question isn't "is yoga relevant to AI?" but "which specific yogic discriminations produce testable hypotheses that current memory systems don't make?"

The initial benchmark has answered one question. Uniform dedup in small vaults is harmful, and the `MinDedupVaultSize` guard ([PR #359](https://github.com/scrypster/muninndb/pull/359)) corrected it. Two hypotheses remain open. Outcome-tagged decay (vrtti nirodha) requires the synthetic vault generator to show that uniform decay costs retrieval quality on entries with different outcome histories. Hebbian displacement (vairagya) requires the same generator to measure whether strengthened entries crowd out more relevant alternatives. Both reduce to one engineering task: **the trace schema must capture retrieval precision broken down by entry properties**: Hebbian weight, access frequency, outcome history. If the data shows a problem, the fixes are straightforward. If it doesn't, we skip the complexity.

Pratyahara is already implemented correctly: the Memory Trait returns top-k, period. The benchmark harness captures the full retrieval decision. The agent doesn't need to know what was excluded. The engineer does.

None of these require believing in chakras. They require taking the discriminations seriously as engineering heuristics and measuring whether they improve agent recall on realistic workloads. The initial benchmark forced one design change. The synthetic vault generator decides the rest.

## Further reading

[Böckeler's harness engineering framework](https://martinfowler.com/articles/harness-engineering.html), the taxonomy (guides, sensors, computational, inferential). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirical evidence that harness changes produce 6x performance gaps. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), the closest prior art mapping Vedanta to agent architecture (conceptual, no benchmarks yet). Yoga Sutras 1.2-1.16, the attention filtering model that predates all of it. [MuninnDB](https://github.com/scrypster/muninndb), where the hypotheses get tested. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), the initial results. [PR #337](https://github.com/scrypster/muninndb/pull/337), the score saturation fix. [PR #359](https://github.com/scrypster/muninndb/pull/359), the dedup guard. [Hrafn](https://github.com/5queezer/hrafn), the runtime that runs on a $10 Raspberry Pi.

---

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), a lightweight agent runtime in Rust. Previous post: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*The cover image for this post was generated by AI.*
