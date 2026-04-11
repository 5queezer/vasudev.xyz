# Graph Report - .  (2026-04-11)

## Corpus Check
- Large corpus: 140 files · ~1,081,891 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 241 nodes · 323 edges · 18 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `main()` - 19 edges
2. `Patanjali Harness Spec` - 11 edges
3. `Memory Metrics Are Lying` - 10 edges
4. `Dream Engine (LLM Memory Consolidation)` - 9 edges
5. `Dream Engine Pipeline` - 8 edges
6. `Svapna or Sushupti` - 8 edges
7. `projectRoot()` - 7 edges
8. `readAllowedTags()` - 7 edges
9. `OAuth MCP Server Gotchas` - 7 edges
10. `AI Environment Design` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Goodhart's Law` --semantically_similar_to--> `Intermediary Self-Optimization Pattern`  [INFERRED] [semantically similar]
  content/blog/ai-environment-design.md → content/blog/direct-divine-access.md
- `Baldwin Effect` --semantically_similar_to--> `Samskara and Vairagya`  [INFERRED] [semantically similar]
  content/blog/automated-circuit-discovery.md → content/blog/patanjali-harness-spec.md
- `Auto-translation Pipeline` --implements--> `GitHub Actions CI/CD`  [INFERRED]
  CLAUDE.md → README.md
- `Sleep-inspired Memory Consolidation` --conceptually_related_to--> `Neuroscience Framework`  [INFERRED]
  content/series/building-agents-that-sleep/_index.md → CLAUDE.md
- `Intermediary Self-Optimization Pattern` --semantically_similar_to--> `AI as Orchestrator Architecture`  [INFERRED] [semantically similar]
  content/blog/direct-divine-access.md → content/blog/stop-putting-ai-in-your-apps.md

## Hyperedges (group relationships)
- **MCP Ecosystem** — stop_putting_ai_in_apps__mcp, mcp_context_window_fix, adding_oauth_mcp_server_gotchas, stop_putting_ai_in_apps__nocodb [EXTRACTED 0.90]
- **Hrafn Agent Architecture** — why_ai_agents_need_sleep__hrafn, why_ai_agents_need_sleep__muninndb, why_ai_agents_need_sleep__dream_engine, ai_environment_design__persistence_tier, ai_environment_design__mutation_selection_cycle [EXTRACTED 0.85]
- **Intermediary Degradation Pattern** — direct_divine_access__intermediary_pattern, stop_putting_ai_in_apps__ai_orchestration_pattern, mcp_context_window_fix__token_overhead, ai_environment_design__goodharts_law [INFERRED 0.75]
- **Building Agents That Sleep Series** — llm_sleep_memory_post, memory_metrics_post, patanjali_post, svapna_post, llm_sleep_memory_dream_engine, llm_sleep_memory_muninndb [EXTRACTED 1.00]
- **Vedic Concepts to Agent Memory** — patanjali_vrtti_nirodha, patanjali_samskara_vairagya, patanjali_pratyahara, svapna_svapna, svapna_sushupti, patanjali_min_dedup_vault_size, patanjali_outcome_tagged_writes [EXTRACTED 0.90]
- **Evolutionary Probe Discovery** — circuit_discovery_mutation_loop, circuit_discovery_linear_probe, circuit_discovery_tokenizer_bottleneck, circuit_discovery_feedback_loop, circuit_discovery_baldwin_effect, circuit_discovery_author_nationality [EXTRACTED 0.95]

## Communities

### Community 0 - "Go Test Infrastructure"
Cohesion: 0.06
Nodes (24): roundTripFunc, assertStringSlicesEqual(), jsonResponse(), parseTagList(), projectRoot(), readAllowedTags(), TestAllowedTagsContainsNewTags(), TestAllowedTagsFormat() (+16 more)

### Community 1 - "Go Data Structures"
Cohesion: 0.08
Nodes (47): arxivEntry, arxivFeed, checkResult, crossrefResponse, linkLocation, chatMessage, chatRequest, chatResponse (+39 more)

### Community 2 - "Agent Memory & Protocols"
Cohesion: 0.06
Nodes (43): Agent Cards, Constant-Time Token Comparison, Shipping A2A Protocol in Rust, Hrafn PR #4166, A2A Protocol (Google), SSRF Protection, TaskStore Cap (DoS Prevention), Dream Engine Pipeline (+35 more)

### Community 3 - "OAuth & MCP Auth"
Cohesion: 0.14
Nodes (19): OAuth MCP Server Gotchas, Multi-Layer Auth Chain, better-auth Deprecation, Dual Auth Path, Reactive Resume PR #2829, Two .well-known Endpoints, Direct Divine Access, Intermediary Self-Optimization Pattern (+11 more)

### Community 4 - "AI Environment Design"
Cohesion: 0.13
Nodes (18): AI Environment Design, Evaluator Is Not a Loss Function, Genotype/Phenotype Separation, Goodhart's Law, Mutation/Selection Cycle, Persistence Tier, SAE Steering Operator, Why AI Agents Need Sleep (+10 more)

### Community 5 - "Blog Infrastructure"
Cohesion: 0.14
Nodes (17): Auto-translation Pipeline, Cross-disciplinary Bridging, Evolutionary Biology Framework, Iron Rule: empirical to tradition, Neuroscience Framework, CLAUDE.md Config, Translation Script (Go), Vale Prose Linter (+9 more)

### Community 6 - "Circuit Discovery"
Cohesion: 0.24
Nodes (10): Author-Nationality Circuit, Baldwin Effect, Capital-of Is Distributed, Feedback Loop Fix, Gemma-2-2B, Linear Probe, Mutation-Selection Loop, Automated Circuit Discovery (+2 more)

### Community 7 - "SAE Measurement"
Cohesion: 0.29
Nodes (8): Direct Inner Experience, Dimensional Overfitting, Encoding vs Generation Time, Hallucination Taxonomy, Generation-Time Hypothesis Falsified, Pratyahara Bridge, Sycophancy Detection (d=9.9), SAE Measurement Timing

### Community 8 - "Dream Engine Phases"
Cohesion: 0.25
Nodes (8): Phase 0: Orient, Phase 1: Replay, Phase 2: Dedup, Phase 2b: LLM Consolidate, Phase 3: Schema Promotion, Phase 4: Bidirectional Stability, Phase 5: Transitive Inference, Phase 6: Dream Journal

### Community 9 - "MCP Architecture"
Cohesion: 0.5
Nodes (5): Central AI Hub, MCP Protocol (Diagram), AI Orchestrating Apps (MCP Way), defer_loading Optimization, MCP Architecture Diagram

### Community 10 - "Mutation Loop"
Cohesion: 0.67
Nodes (3): LLM Proposer, Probe Pipeline, Tokenizer Gate

### Community 11 - "Dream Pipeline"
Cohesion: 1.0
Nodes (2): Dream Engine Pipeline (Diagram), Dream Pipeline Vault Trust Tiers

### Community 12 - "Evolution Loop"
Cohesion: 1.0
Nodes (2): Evolution Loop Cycle, Mutation Loop Pipeline

### Community 13 - "MCP Toolset"
Cohesion: 1.0
Nodes (1): MCP Toolset Deferral

### Community 14 - "Waking State"
Cohesion: 1.0
Nodes (1): Jagrat (Waking State)

### Community 15 - "Pure Awareness"
Cohesion: 1.0
Nodes (1): Turiya (Pure Awareness)

### Community 16 - "Field Notes"
Cohesion: 1.0
Nodes (1): Series: Field Notes

### Community 17 - "Measurement Timing"
Cohesion: 1.0
Nodes (1): Measurement Timing Diagram

## Knowledge Gaps
- **78 isolated node(s):** `chatRequest`, `chatMessage`, `chatResponse`, `chatRequest`, `chatMessage` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Dream Pipeline`** (2 nodes): `Dream Engine Pipeline (Diagram)`, `Dream Pipeline Vault Trust Tiers`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evolution Loop`** (2 nodes): `Evolution Loop Cycle`, `Mutation Loop Pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MCP Toolset`** (1 nodes): `MCP Toolset Deferral`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Waking State`** (1 nodes): `Jagrat (Waking State)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pure Awareness`** (1 nodes): `Turiya (Pure Awareness)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Field Notes`** (1 nodes): `Series: Field Notes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Measurement Timing`** (1 nodes): `Measurement Timing Diagram`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `chatRequest`, `chatMessage`, `chatResponse` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Go Test Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Go Data Structures` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Agent Memory & Protocols` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `OAuth & MCP Auth` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `AI Environment Design` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Blog Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._