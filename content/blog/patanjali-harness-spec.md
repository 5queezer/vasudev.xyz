---
title: "Patanjali Had the Harness Spec. We Just Wrote the Tests."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Three yogic principles that predict empirical results in agent harness research. 2000-year-old operating manual, modern benchmarks."
---

I spent last week reading two papers and a [Fowler article](https://martinfowler.com/articles/harness-engineering.html) about harness engineering -- the code wrapping an LLM that determines what gets stored, retrieved, and presented to the model. Halfway through Birgitta Böckeler's taxonomy of guides and sensors, I realized I'd seen this architecture before. Not in a codebase. In the Yoga Sutras.

**The contemplative traditions solved context engineering 2000 years ago. The agent community is rediscovering their answers, one ablation study at a time.**

That sounds like the kind of claim that gets you laughed off Hacker News. So let me back it up with three specific mappings where yogic principles predict -- not just rhyme with -- empirical results from [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, March 2026), [MemoryBench](https://arxiv.org/abs/2510.17281), and Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).

## 1. Vrtti Nirodha: Not all noise is equal

Yoga Sutras 1.2 defines yoga as *chitta vrtti nirodha* -- the cessation of fluctuations in the mind-field. Patanjali doesn't say "delete everything." He distinguishes *kleshas* (distortions: attachment, aversion, ego, ignorance, fear of death) from *pramanas* (valid cognition: direct perception, inference, testimony). The practice is surgical: reduce the distortions, preserve the signal.

OpenAI's harness engineering post calls the same operation "Entropy Management" -- periodic cleanup agents that fight codebase decay. Dream Engine's memory consolidation does it with split thresholds: 0.95 similarity for normal dedup, 0.85 during dream mode. But neither system asks *what kind* of redundancy it's removing.

Meta-Harness proved this matters. Their critical ablation (Table 3) showed that LLM-generated summaries of execution traces performed *worse* than raw scores alone -- 38.7% vs 41.3%. Full raw traces got 56.7%. The summaries were vrtti nirodha gone wrong: they collapsed *pramana* (diagnostic signal) alongside *klesha* (noise), destroying the information the optimizer needed.

The design implication for [MuninnDB](https://github.com/scrypster/muninndb): decay floors should reflect outcome, not just access frequency. A verified API pattern and a failed curl attempt might have identical retrieval rates but radically different retention value. The vault trust tiers already sort by content sensitivity (legal, work, personal). But there's a trap in the obvious next step.

You could try to classify entries upfront as pramana or klesha -- verified vs. distorted -- but that classification is itself the hard problem. For trivial cases (HTTP 200 vs. 401), it's mechanical. For most entries, it requires semantic judgment, which means an LLM in the decay path, which makes consolidation expensive and nondeterministic. Patanjali had a lifetime of practice to refine his discernment. Dream Engine runs on a cron trigger.

The simpler path: **outcome-tagged writes**. When an agent retrieves an entry and the subsequent action succeeds, the entry gets an `outcome: success` signal. When the action fails, `outcome: failure`. The decay floor couples to the success rate, not to an epistemic category. No ontology needed. No LLM in the loop. In yogic terms: you don't need to classify the vrtti in advance -- you observe its effect and let that observation shape retention.

---

## 2. Samskara and Vairagya: Reinforcement needs a counterweight

Samskaras are latent impressions that shape future perception. Every experience leaves a trace; repeated experiences deepen the groove. This is Hebbian learning -- "neurons that fire together wire together" -- and MuninnDB implements it directly: entries that co-activate strengthen their association weights.

The Yoga Sutras warn that samskaras compound. Without the counterweight of *vairagya* (non-attachment, the capacity to release strong associations), they calcify into *vasanas* -- automatic reaction patterns that bypass conscious evaluation. You stop seeing the situation and start running the script.

MemoryBench documents this exact failure mode in agent memory systems. Consolidation can degrade retrieval quality because frequently activated associations crowd out less-activated but more relevant alternatives. The agent retrieves what it has *always* retrieved, not what it *should* retrieve. That's a vasana.

Böckeler's taxonomy provides the structural insight. She distinguishes computational sensors (deterministic, cheap, run on every change) from inferential sensors (semantic, expensive, probabilistic). Hebbian reinforcement is a computational process -- it runs automatically on every co-activation. But vasana detection requires inferential judgment: "this association is strong, but is it *correct* for this query?" No frequency counter can answer that.

The missing mechanism in MuninnDB is explicit Hebbian *weakening* -- not just passive decay, but active correction when a strongly associated entry produces a false positive retrieval. When an agent acts on a Hebbian-retrieved entry and the action fails, the association weight should decrease, not just wait for Ebbinghaus to erode it over time. But: this is a new write path in Dream Engine, and the benchmark-first principle holds. No feature ships without evidence that the current behavior causes harm.

Testable hypothesis for [benchmark #311](https://github.com/scrypster/muninndb/issues/311): measure false positive retrieval rates for Hebbian-strengthened entries vs. non-strengthened entries. But don't stop at binary hit/miss. The sharper metric is *displacement rate* -- how often does a strongly associated but less relevant entry push a more relevant entry out of the top-k? That's the direct vasana measurement: not just "wrong thing retrieved" but "right thing crowded out by habitual retrieval." If strengthened entries produce measurable displacement, vairagya as a design primitive is empirically justified. If they don't, the current passive decay is sufficient and we skip the complexity.

---

## 3. Pratyahara: The power of deliberate exclusion

Pratyahara (Yoga Sutras 2.54) is often translated as "sense withdrawal," but that's misleading. It's not blindness -- it's *selective attention*. The senses still function; they just stop pulling the mind toward every stimulus. You decide what enters awareness instead of reacting to whatever arrives.

This is the central problem of context engineering, and Meta-Harness's most surprising result confirms it. The winning harnesses are not the ones that pack the context window with everything available. The text classification winner uses TF-IDF with contrastive pairs and label priming. The math retrieval winner is a four-route BM25 program with lexical predicates. Simple selection policies. No exotic architectures.

Böckeler frames it as "keep quality left" -- the earlier you filter, the cheaper and more reliable the downstream result. Her computational guides (linters, schemas, CLAUDE.md rules) are pratyahara mechanisms: they prevent entire categories of information from reaching the model at all.

The first version of this post argued that the Memory Trait interface should return rejection metadata alongside results -- "these 3 entries matched, and these 5 were excluded because of X." More diagnostic signal for the LLM. Better informed decisions. Sounds reasonable.

It's wrong, and the Pratyahara principle itself explains why.

Pratyahara means the senses *stop pulling the mind toward their objects*. If you tell the LLM "here are 5 things I'm deliberately withholding from you," you've shown it the objects and added a prohibition. That's not sense withdrawal -- that's sense stimulation with a warning label. Anyone who's meditated knows the result: "don't think about a white elephant" guarantees you'll think about the white elephant. Concretely: rejection explanations consume tokens (contradicting the Meta-Harness finding that simple harnesses win) and invite the model to second-guess the filter ("Why was X excluded? Maybe I need it after all"). RAG systems that include negative context empirically underperform those that simply deliver top-k.

The right separation: **the agent sees only the top-k results. The benchmark harness sees everything.** The Memory Trait interface stays slim -- `retrieve → Vec<Entry>`. But the retrieval implementation logs the full decision internally: what was returned, what was excluded, why, and what the agent did next. The benchmark consumes the logs. The agent consumes the entries.

In Böckeler's taxonomy: the Memory Trait is a computational guide (it determines what enters the context). The trace log is a computational sensor (it observes what happened). They don't merge. Pratyahara isn't conscious filtering in the sense of *the filtered system being aware of the exclusion*. It's conscious filtering in the sense of *the designer being aware*, through the trace logs, so the next iteration of the filter improves. The consciousness belongs to the harness engineer reading the traces, not to the agent executing the queries.

---

## Where the metaphor breaks

Two places.

First, the Koshas (Vedantic body layers -- physical, energetic, mental, discriminative, bliss) imply a hierarchy from gross to subtle, with the subtle being "higher." Harness engineering has no such value ordering. A deterministic linter is not "lower" than an LLM-as-judge. Böckeler explicitly notes that computational sensors are cheap enough to run on every change, while inferential controls are expensive and probabilistic. In practice, you want to *maximize* the "gross" layer, not transcend it. Importing the Kosha hierarchy into harness design would lead you to over-invest in inferential controls and under-invest in deterministic ones -- the opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response -- you want the agent to develop reliable patterns, not dissolve them. Vairagya in the yogic sense means letting go of *all* attachment; in harness engineering it means letting go of *incorrect* attachments. The goal is better conditioning, not no conditioning. Importing the full soteriological framework would lead to an agent that achieves enlightenment by refusing to retrieve anything at all. Unhelpful.

---

## What this isn't

This isn't "ancient wisdom validates my architecture." The causal arrow runs the other direction: the contemplative traditions developed sophisticated phenomenological models of attention, memory, and information filtering over millennia of systematic introspection. That some of those models predict results in agent memory research isn't mystical -- it's convergent engineering on the same problem: how does a bounded system manage unbounded information flow?

The useful question isn't "is yoga relevant to AI?" but "which specific yogic discriminations produce testable hypotheses that current memory systems don't make?"

Three candidates, all gated on the same prerequisite:

Outcome-tagged decay (vrtti nirodha) requires [benchmark #311](https://github.com/scrypster/muninndb/issues/311) to show that uniform decay costs retrieval quality on entries with different outcome histories. Hebbian displacement (vairagya) requires the same benchmark to measure whether strengthened entries crowd out more relevant alternatives. Both reduce to one engineering task: **the trace schema must capture retrieval precision broken down by entry properties** -- Hebbian weight, access frequency, outcome history. If the data shows a problem, the fixes are straightforward. If it doesn't, we skip the complexity.

Pratyahara is already implemented correctly: the Memory Trait returns top-k, period. The benchmark harness captures the full retrieval decision. The agent doesn't need to know what was excluded. The engineer does.

None of these require believing in chakras. They require taking the discriminations seriously as engineering heuristics and measuring whether they improve agent recall on realistic workloads.

---

If you build agent memory systems, the reading list is: [Böckeler's harness engineering framework](https://martinfowler.com/articles/harness-engineering.html) for the taxonomy, [Meta-Harness](https://arxiv.org/abs/2603.28052) for the empirical evidence on trace capture, and Yoga Sutras 1.2-1.16 for the attention management spec that predates all of it. [MuninnDB](https://github.com/scrypster/muninndb) is where we're testing the hypotheses. [Hrafn](https://github.com/5queezer/hrafn) is the runtime that runs on a $10 Raspberry Pi.

---

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), a lightweight agent runtime in Rust. Previous post: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*
