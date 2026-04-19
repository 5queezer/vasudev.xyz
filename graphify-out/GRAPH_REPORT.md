# Graph Report - content/blog  (2026-04-19)

## Corpus Check
- 15 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 282 nodes · 374 edges · 20 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `main()` - 19 edges
2. `Patanjali Harness Spec` - 11 edges
3. `Memory Metrics Are Lying` - 10 edges
4. `Dream Engine (LLM Memory Consolidation)` - 9 edges
5. `Dream Engine Pipeline` - 8 edges
6. `Svapna or Sushupti` - 8 edges
7. `Streaming UI from AI Agents: 4 Approaches Ranked` - 8 edges
8. `AG-UI Protocol` - 8 edges
9. `A2UI Protocol` - 8 edges
10. `Stop Putting Decisions in CLAUDE.md` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Goodhart's Law` --semantically_similar_to--> `Intermediary Self-Optimization Pattern`  [INFERRED] [semantically similar]
  content/blog/ai-environment-design.md → content/blog/direct-divine-access.md
- `Baldwin Effect` --semantically_similar_to--> `Samskara and Vairagya`  [INFERRED] [semantically similar]
  content/blog/automated-circuit-discovery.md → content/blog/patanjali-harness-spec.md
- `Auto-translation Pipeline` --implements--> `GitHub Actions CI/CD`  [INFERRED]
  CLAUDE.md → README.md
- `Sleep-inspired Memory Consolidation` --conceptually_related_to--> `Neuroscience Framework`  [INFERRED]
  content/series/building-agents-that-sleep/_index.md → CLAUDE.md
- `A2UI Protocol` --semantically_similar_to--> `Pull Context`  [INFERRED] [semantically similar]
  content/blog/frontend-ai-agents-streaming-ui.md → content/blog/push-pull-context.md

## Hyperedges (group relationships)
- **Four UI Streaming Approaches Compared** — frontend_ai_agents_streaming_ui__vercel_ai_sdk_streamui, frontend_ai_agents_streaming_ui__ag_ui, frontend_ai_agents_streaming_ui__a2ui, frontend_ai_agents_streaming_ui__kombai [EXTRACTED 1.00]
- **Code/Data/Events Architectural Trichotomy** — frontend_ai_agents_streaming_ui__vercel_ai_sdk_streamui, frontend_ai_agents_streaming_ui__a2ui, frontend_ai_agents_streaming_ui__ag_ui, frontend_ai_agents_streaming_ui__code_data_events_divide [EXTRACTED 1.00]
- **Four Agent Context Residency Layers** — push_pull_context__claude_md, push_pull_context__adr, push_pull_context__specs_directory, push_pull_context__claude_skills, push_pull_context__layered_decision_residency [EXTRACTED 1.00]

## Communities

### Community 0 - "Link Checker Tests"
Cohesion: 0.06
Nodes (24): roundTripFunc, assertStringSlicesEqual(), jsonResponse(), parseTagList(), projectRoot(), readAllowedTags(), TestAllowedTagsContainsNewTags(), TestAllowedTagsFormat() (+16 more)

### Community 1 - "Link Checker Internals"
Cohesion: 0.08
Nodes (47): arxivEntry, arxivFeed, checkResult, crossrefResponse, linkLocation, chatMessage, chatRequest, chatResponse (+39 more)

### Community 2 - "Agent Memory and Protocols"
Cohesion: 0.06
Nodes (43): Agent Cards, Constant-Time Token Comparison, Shipping A2A Protocol in Rust, Hrafn PR #4166, A2A Protocol (Google), SSRF Protection, TaskStore Cap (DoS Prevention), Dream Engine Pipeline (+35 more)

### Community 3 - "Context Engineering Patterns"
Cohesion: 0.1
Nodes (23): Progressive JSON Streaming, Trust Boundary Decision Framework, Architecture Decision Records, CLAUDE.md / AGENTS.md, .claude/skills Triggered Workflow Protocols, Decision Shadow (Implementation-Level Reasoning), ETH Zurich AGENTS.md Study (2026), Hrafn Rust Agent Framework (+15 more)

### Community 4 - "MCP and Auth Pitfalls"
Cohesion: 0.14
Nodes (19): OAuth MCP Server Gotchas, Multi-Layer Auth Chain, better-auth Deprecation, Dual Auth Path, Reactive Resume PR #2829, Two .well-known Endpoints, Direct Divine Access, Intermediary Self-Optimization Pattern (+11 more)

### Community 5 - "Evolutionary AI Design"
Cohesion: 0.13
Nodes (18): AI Environment Design, Evaluator Is Not a Loss Function, Genotype/Phenotype Separation, Goodhart's Law, Mutation/Selection Cycle, Persistence Tier, SAE Steering Operator, Why AI Agents Need Sleep (+10 more)

### Community 6 - "Streaming UI Protocols"
Cohesion: 0.14
Nodes (18): A2UI Protocol, AG-UI Protocol, AI SDK RSC Paused October 2024, Code vs Data vs Events Architectural Divide, CopilotKit, CrewAI, CopilotKit Generative UI Playground, Grid Dynamics A2UI Orchestrator Inspection (+10 more)

### Community 7 - "Site and Series Meta"
Cohesion: 0.14
Nodes (17): Auto-translation Pipeline, Cross-disciplinary Bridging, Evolutionary Biology Framework, Iron Rule: empirical to tradition, Neuroscience Framework, CLAUDE.md Config, Translation Script (Go), Vale Prose Linter (+9 more)

### Community 8 - "Mechanistic Interpretability"
Cohesion: 0.24
Nodes (10): Author-Nationality Circuit, Baldwin Effect, Capital-of Is Distributed, Feedback Loop Fix, Gemma-2-2B, Linear Probe, Mutation-Selection Loop, Automated Circuit Discovery (+2 more)

### Community 9 - "SAE and Hallucinations"
Cohesion: 0.29
Nodes (8): Direct Inner Experience, Dimensional Overfitting, Encoding vs Generation Time, Hallucination Taxonomy, Generation-Time Hypothesis Falsified, Pratyahara Bridge, Sycophancy Detection (d=9.9), SAE Measurement Timing

### Community 10 - "Dream Engine Phases"
Cohesion: 0.25
Nodes (8): Phase 0: Orient, Phase 1: Replay, Phase 2: Dedup, Phase 2b: LLM Consolidate, Phase 3: Schema Promotion, Phase 4: Bidirectional Stability, Phase 5: Transitive Inference, Phase 6: Dream Journal

### Community 11 - "AI Architecture Diagrams"
Cohesion: 0.5
Nodes (5): Central AI Hub, MCP Protocol (Diagram), AI Orchestrating Apps (MCP Way), defer_loading Optimization, MCP Architecture Diagram

### Community 12 - "Mutation Pipeline"
Cohesion: 0.67
Nodes (3): LLM Proposer, Probe Pipeline, Tokenizer Gate

### Community 13 - "Dream Engine Architecture"
Cohesion: 1.0
Nodes (2): Dream Engine Pipeline (Diagram), Dream Pipeline Vault Trust Tiers

### Community 14 - "Evolution Loops"
Cohesion: 1.0
Nodes (2): Evolution Loop Cycle, Mutation Loop Pipeline

### Community 15 - "MCP Toolset Deferral"
Cohesion: 1.0
Nodes (1): MCP Toolset Deferral

### Community 16 - "Jagrat State"
Cohesion: 1.0
Nodes (1): Jagrat (Waking State)

### Community 17 - "Turiya State"
Cohesion: 1.0
Nodes (1): Turiya (Pure Awareness)

### Community 18 - "Field Notes Series"
Cohesion: 1.0
Nodes (1): Series: Field Notes

### Community 19 - "Measurement Timing"
Cohesion: 1.0
Nodes (1): Measurement Timing Diagram

## Knowledge Gaps
- **97 isolated node(s):** `chatRequest`, `chatMessage`, `chatResponse`, `chatRequest`, `chatMessage` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Dream Engine Architecture`** (2 nodes): `Dream Engine Pipeline (Diagram)`, `Dream Pipeline Vault Trust Tiers`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evolution Loops`** (2 nodes): `Evolution Loop Cycle`, `Mutation Loop Pipeline`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MCP Toolset Deferral`** (1 nodes): `MCP Toolset Deferral`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Jagrat State`** (1 nodes): `Jagrat (Waking State)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Turiya State`** (1 nodes): `Turiya (Pure Awareness)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Field Notes Series`** (1 nodes): `Series: Field Notes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Measurement Timing`** (1 nodes): `Measurement Timing Diagram`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `chatRequest`, `chatMessage`, `chatResponse` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Link Checker Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Link Checker Internals` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Agent Memory and Protocols` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Context Engineering Patterns` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `MCP and Auth Pitfalls` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Evolutionary AI Design` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._