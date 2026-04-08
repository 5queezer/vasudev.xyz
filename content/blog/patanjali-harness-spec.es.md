---
title: "Patanjalitenía la especificación de filtrado. Solo escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Laconsolidación de la memoria empeoró la recuperación. Tres principios de diseño de las pruebas de referencia de memoria de agentes, y sus inesperadas paralelas en la teoría de la atención yóguica."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "9bcb9a8379e4ca1b3320a77ddf64bc31"
---
## 1. Not all noise is equal (Vrtti Nirodha)

- Issue #[311](https://github.com/scrypster/muninndb/issues/311) showed **score saturation**: fresh engrams clamped to `raw=1.0`, making all scores identical at `0.9000`, which destroyed retrieval quality.  
- Fix in [PR #337](https://github.com/scrypster/muninndb/pull/337) improved the score range to `0.18‑0.90` and raised correct top‑1 retrieval to `5/5`.  
- [Meta‑Harness](https://arxiv.org/abs/2603.28052) (Table 3) found LLM **summaries performed worse** than raw traces (best `38.7 %` vs `41.3 %` for scores only; raw traces `56.7 %`).  
- **Design principle:** uniform treatment of entries (dedup, summarization) mixes signal and noise; use **outcome‑tagged writes** to tie decay to actual success/failure rather than fixed rules.

## 2. Reinforcement needs a counterweight (Samskara and Vairagya)

- [MemoryBench](https://arxiv.org/abs/2510.17281) showed advanced memory systems ignored procedural feedback, treating all input as declarative.  
- Phase 2 dedup merged duplicates but altered the normalization anchor, pushing relevant results down in a 13‑engram vault.  
- Harness engineering separates **computational sensors** (deterministic, cheap) from **inferential sensors** (expensive, probabilistic); dedup is computational, but judging its safety is inferential.  
- Samskaras compound; without **vairagya** they become vasanas that crowd out better memories – measured as *displacement rate* in a synthetic vault generator.  
- Dream Engine Phase 2 ablation ([PR #367](https://github.com/scrypster/muninndb/pull/367)) shows phases 0, 2, 5 help (`+0.007` to `+0.022` avg delta) while phase 4 harms (`‑0.014`), confirming that unchecked reinforcement damages retrieval; a simpler fix is to skip reinforcement rather than add weakening.

## 3. The power of deliberate exclusion (Pratyahara)

- Meta‑Harness shows best harnesses use simple selection (e.g., TF‑IDF with contrastive pairs) and keep fewer tokens (4× fewer) while outperforming richer context.  
- Böckeler’s “keep quality left” principle: filter early, before data enters the model.  
- Memory Trait returns only top‑k; full decision is logged (retrieved, excluded, outcome) for the benchmark harness, embodying pratyahara: the agent sees only selected entries, while engineers inspect logs.  
- Example trace JSON:

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

- Exclusion metadata should not be shown to the agent to avoid token waste and the “white‑elephant” effect.

**Where the metaphor breaks** – The Kosha hierarchy implies a value ordering that does not exist in harness engineering; likewise, yogic liberation seeks to discard all attachment, whereas agents need better *conditioning*, not its removal.

**What this isn’t** – Not “ancient wisdom validates AI”; the convergence is on engineering heuristics. Prior work like [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) is conceptual only.

**Further reading**

- [Böckeler's harness engineering framework](https://martinfowler.com/articles/harness-engineering.html)  - [Meta‑Harness](https://arxiv.org/abs/2603.28052)  
- [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820)  
- [Yoga Sutras](https://en.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali)  
- [MuninnDB](https://github.com/scrypster/muninndb)  
- [Benchmark #311](https://github.com/scrypster/muninndb/issues/311)  
- [PR #337](https://github.com/scrypster/muninndb/pull/337)  
- [PR #359](https://github.com/scrypster/muninndb/pull/359)  
- [PR #367](https://github.com/scrypster/muninndb/pull/367)  
- [Hrafn](https://github.com/5queezer/hrafn)