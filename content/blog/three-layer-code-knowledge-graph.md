---
title: "Your Code Knowledge Graph Needs Four Layers, Not One"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
agentQuestions:
  - "Why does a code knowledge graph need four layers?"
  - "What does layer four add for agents?"
  - "How should an LLM navigate a code graph?"
description: "Memory should be a graph. The graph should be four layers. The middle one carries navigation. The top one turns navigation into action."
images: ["/images/three-layer-code-knowledge-graph-og.png"]
---



Andrej Karpathy made the argument in one post: memory is a structure you inhabit, not a cache you refill every prompt. Forty-eight hours later, Safi Shamsi shipped [Graphify](https://github.com/safishamsi/graphify) and wrote *The Memory Layer* around it. The thesis is that an AI agent should walk a knowledge graph instead of grepping a vector index, because relationships live in the white space between chunks and a vector store cannot see them.

I agree with the thesis. I think the book stops one layer short. Then I posted that, and immediately noticed it stops two layers short.

I generated a Graphify graph for a coding agent codebase last week. The first version was the obvious thing. Nodes were files, classes, functions, methods. Edges were `imports`, `calls`, `contains`, `method`. Opening it in Obsidian gave me a hairball. I clustered it into communities and labeled each with a concept name. Better. But the edges still said things like `calls×32 / method×7 / contains×11`. Useful as evidence. Not useful as a map. Then I rewrote the edges as human relationship phrases: "drives and observes conversations," "supplies credentials to," "renders markdown with." Suddenly the graph read like a sentence. Suddenly an LLM could orient on it.

That gave me three layers. Then I tried to use them on a real task ("add a new model provider to this CLI") and realized I needed a fourth.

**A code knowledge graph for an LLM agent should be four layers. Layer two does the navigation. Layer four does the work.**

## What This Actually Looks Like

Take a real subsystem boundary in a coding agent runtime. The interactive terminal UI talks to the agent session lifecycle. That's a real architectural fact. There are now four different ways to describe it.

Layer one is the raw implementation graph:

```text
InteractiveSession.handleInput  --calls-->  AgentSession.send
InteractiveSession              --imports-->  AgentSession
InteractiveSession.render       --calls-->  AgentSession.events.subscribe
... 38 more edges between these two modules
```

Layer two collapses files and symbols into communities and aggregates the edges:

```text
Interactive Session Orchestration  --calls×32 / imports×9 / contains×7-->  Agent Session Lifecycle
```

Layer three rewrites the predicate as a human phrase, with the raw counts kept as evidence underneath:

```text
Interactive Session Orchestration  --drives and observes conversations-->  Agent Session Lifecycle
```

Layer four is none of those. Layer four is a playbook keyed to a task:

```text
Playbook: "Add a new model provider"
  intent:           wire a new LLM provider into the CLI
  involved concepts: Provider Auth, Model Registry, CLI Login
  key files:        model-resolver.ts, provider-display-names.ts, args.ts
  validation:       npm run check, then a manual login round-trip
  common pitfalls:  forgot to register the display name, env var fallback order
```

Same system. Four different framings. None of them is the right answer alone, and only the fourth tells the agent what to actually do.

## Why Layer One Alone Fails

The raw graph is correct and useless. A medium repo has tens of thousands of nodes and hundreds of thousands of edges. Open it in any graph viewer and you get a black ball with no information. Feed it to an LLM and you blow the context window before the agent has a chance to reason.

Shamsi makes this point with an honest number. In Chapter 6 of *The Memory Layer*, Graphify compresses a roughly five-million-token codebase into about a hundred and seventy-six thousand tokens of nodes, edges, and community summaries. That is a 28× compression. It is also the reason layer one alone cannot be the entry point. The whole appeal of building the graph is that you stop sending text and start sending topology. If you then dump the topology back at the model edge by edge, you have made the file tree slightly more structured and called it progress.

The raw graph is also miscalibrated for what an agent actually does. An agent does not want to know that `formatTimestamp` calls `padStart`. It wants to know that the export viewer renders markdown using a vendored parser, because that decides which file to edit when the user reports a rendering bug.

You still need layer one. It is the only layer that lets you go from a concept back to a precise file and line. But it cannot be the entry point.

## Why Layer Three Alone Fails

The opposite mistake is more seductive. Once you have human predicates like "drives and observes conversations," the graph reads like prose. It feels like the right abstraction for an LLM, because LLMs are good at prose.

The problem is that human predicates are interpretive. They are an editorial layer on top of evidence. If you treat them as ground truth, the agent will plan based on phrases that may have been wrong since the last refactor, and there is no easy way to catch the drift. The LLM will confidently say "the export viewer renders markdown with the vendored parser" even after someone replaced the parser, because the human label has not been regenerated.

Shamsi anticipates the failure mode and gives Graphify the right defense at the edge level. Every edge carries one of three provenance tags: `EXTRACTED` (observed in the AST), `INFERRED` (logically implied with a confidence score), and `AMBIGUOUS` (conflicting evidence, flagged for human review). Confidence multiplies along a path, so a two-hop inferred chain at 0.9 and 0.8 collapses to 0.72 and an agent can be told to refuse anything below a threshold. That defense is correct. It is also defined at the wrong granularity if you want navigation. A confidence score on a single edge tells you whether to trust that fact. It does not tell you which subsystem to look at first.

The phrase needs to be a hyperlink, not a fact. Every human predicate must point back to the aggregated raw edges that justify it. If those raw edges shift, the phrase is suspect.

## The Layer That Carries Navigation

Layer two is the unglamorous one. Communities of files glued by aggregated typed edges. No prose, no hand-curated language, just structural clusters with counts on the edges between them.

This is what an LLM agent should reason on first when it needs to find something.

The reason is search-space reduction. A repo has hundreds of files. A subsystem graph has a few dozen communities. When the user says "fix the bug where the bash tool prints stale output," the agent should not be doing keyword search across the whole tree. It should be looking at the community graph, finding "Bash Execution Interface" and "Interactive Session Orchestration," noting which other communities they bridge to, then descending into layer one for the precise file. That is two graph hops instead of a thousand grep matches.

The aggregated edge counts also encode something the raw graph hides. If two communities are connected by `calls×32 / imports×9 / events×4`, that is a thick coupling and any change to one will probably touch the other. If they are connected by `contains×1`, they barely know each other. Counts are the cheapest impact-analysis signal you have.

But layer two only answers "where do I look?" It does not answer "what do I do once I'm there?" That is the gap layer four fills.

## Layer Four: From Navigation to Action

Layer four is the operational playbook. A node at this layer is not a concept like "Authentication." It is a task: "Add or modify provider authentication flow." The node carries the things an agent actually needs to act, not the things it needs to understand.

A useful Layer 4 node has six fields:

- **Intent.** What the user is trying to accomplish, in their words.
- **Involved concepts.** Pointers into Layer 3 (Provider Auth, Model Registry, etc.).
- **Key files.** Pointers into Layer 1 (args.ts, model-resolver.ts).
- **Validation steps.** The exact commands or tests that prove the change works.
- **Common pitfalls.** What previous attempts at this task got wrong.
- **Rollback risks.** What breaks if this change is reverted halfway.

Concrete examples from a coding agent codebase:

```text
Playbook: "Add a new model provider"
  concepts:    Provider Auth, Model Registry, CLI Login, Docs
  files:       model-resolver.ts, provider-display-names.ts, args.ts, docs/
  validation:  npm run check, then login round-trip
  pitfalls:    forgetting to register the display name; env var fallback order
  rollback:    safe (additive); leftover registry entries are harmless

Playbook: "Fix a TUI rendering bug"
  concepts:    Interactive Session Orchestration, TUI Components, Footer Status
  files:       <component>.tsx, key bindings file, render entry point
  validation:  targeted component test, optional tmux harness for visual check
  pitfalls:    stale component state surviving a hot reload; async render races
  rollback:    safe; UI-only

Playbook: "Change a built-in tool's behavior"
  concepts:    Runtime Tools, Agent Session Lifecycle, Tool Rendering
  files:       tool definition, runtime binding, UI render component
  validation:  unit test for the tool, regression test for the rendering
  pitfalls:    tool schema drift breaks transcripts; UI assumes old shape
  rollback:    risky; old transcripts may not replay cleanly
```

Read these and notice what they are not. They are not architecture diagrams. They are not summaries. They are not retrieval anchors. They are short, opinionated, repeatable procedures that translate "the user asked X" into "go look at Y, change Z, verify with W."

Layer three tells the agent what the system means. Layer four tells the agent what to do in that system. The agent reads layer four first when the task is concrete, walks down through layers three, two, and one to verify, and only then touches source. When the task is exploratory and there is no playbook yet, the agent skips layer four and starts at layer three. Both reading orders are valid. What matters is that layer four exists for the recurring tasks, because those are where agents waste the most tokens reinventing the same plan.

This is also the layer with the highest return on writing effort. A handful of well-written playbooks for the most common changes in your codebase will improve agent throughput more than any other knowledge investment. Agents stop rediscovering the same five files for the same five tasks every week. They stop missing the test that catches the same regression every time. They stop forgetting the pitfall that bit the last three attempts.

## The Workflow This Implies

The four layers are not alternatives. They are a pipeline with two valid entry points.

```text
Layer 4 (operational playbook)
  agent matches the task to a known recipe
    "the user wants to add a new model provider"
       playbook: "Add a new model provider"
         (or: no playbook exists, fall through to layer 3)

Layer 3 (human ontology)
  agent reads the map for the involved concepts
    "Provider Auth, Model Registry, CLI Login"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "Auth and Credentials cluster, bridged to CLI Startup"

Layer 1 (raw graph)
  agent finds the exact file and function
    "args.ts:parseLoginArgs(), model-resolver.ts:resolveProvider()"

Source code
  agent reads, edits, runs the playbook's validation step
```

Each layer answers a different question. Layer four answers "what should I do?" Layer three answers "what is this and why does it exist?" Layer two answers "where does it live and what does it touch?" Layer one answers "what is the precise symbol I need to change?" You cannot collapse them, because the question changes at each step.

## Where This Sits in the Literature

Three literatures converge on this shape and mostly do not talk to each other.

The first is program analysis. The [code property graph](https://en.wikipedia.org/wiki/Code_property_graph), introduced by Yamaguchi et al. in their 2014 IEEE S&P paper "Modeling and Discovering Vulnerabilities with Code Property Graphs" (which won the IEEE Test-of-Time Award in 2024), already merges three classic representations into one structure: the abstract syntax tree, the control flow graph, and the program dependence graph. The original use case was vulnerability discovery, but the lesson generalizes. A single representation cannot answer all the questions you have about code, so you compose representations and let the query pick the right slice. That is layer one done well, and it has been done well for over a decade.

The second is graph-based retrieval for LLMs. Microsoft's GraphRAG paper, ["From Local to Global: A Graph RAG Approach to Query-Focused Summarization"](https://arxiv.org/abs/2404.16130) by Edge et al. (2024), is explicit about the value of an intermediate community layer. They build an entity graph, partition it with the [Leiden algorithm](https://en.wikipedia.org/wiki/Leiden_algorithm), and generate summaries per community. The [GraphRAG documentation](https://microsoft.github.io/graphrag/) is direct about what those communities buy you: each level of the resulting hierarchy "represents a different level of abstraction and summarization." That is the layered framing in their own words, applied to documents instead of code. Queries hit the community summaries first and only descend into entities when needed. *The Memory Layer* describes the same pattern in Chapter 5 and treats HybridRAG (a tunable blend `α · vector_score + (1 - α) · graph_score`) as the new default. Both confirm that the community layer is real and load-bearing.

Recent code-specific work is converging on the same shape. ["Code Graph Model (CGM): A Graph-Integrated Large Language Model for Repository-Level Software Engineering Tasks"](https://arxiv.org/abs/2505.16901) by Tao et al. integrates repository code graph structure into an LLM's attention mechanism and pairs it with an agentless graph RAG framework, hitting 43% on SWE-bench Lite as the top open-weight model. ["GraphCodeAgent: Dual Graph-Guided LLM Agent for Retrieval-Augmented Repo-Level Code Generation"](https://arxiv.org/abs/2504.10046) by Li et al. uses a dual-graph design (a requirement graph and a structural-semantic code graph) and lets the agent multi-hop across both for retrieval. ["Knowledge Graph Based Repository-Level Code Generation"](https://arxiv.org/abs/2505.14394) by Athale and Vaddina represents a repo as a graph that captures structural and relational information and uses hybrid retrieval over it.

The third literature is the operations one, and it is where layer four comes from. Site reliability engineering has had runbooks for two decades: short, opinionated procedures keyed to an alert or a recurring incident. The runbook tells the on-call engineer which dashboard to open, which service to restart, which post-mortem to file. Coding agents need the same artifact, keyed to recurring user requests instead of pages. Anthropic's Claude Code skills and Cursor's commands are early-stage versions of this. They are playbooks an agent invokes, not graphs an agent reads, but the shape is the same: intent, involved concepts, key files, validation steps. The closest published precedent for the layer-four idea, treating tasks themselves as first-class nodes in the same knowledge graph as the system they touch, is the 2024 paper [Knowledge Graph Modeling-Driven Large Language Model Operating System for Task Automation](https://arxiv.org/abs/2408.14494). It models process-engineering workflows as KG nodes that the LLM traverses to assemble executable plans. Layer four is what happens when you do that for a codebase: make playbooks first-class nodes in the same graph as the architecture they navigate, so the agent can traverse from "what to do," to "what it means," to "where it lives" without leaving the structure.

None of those works names the four-layer split as a unit. Layers one and two are strongly documented. Layer three is documented as ontology and community summarization, but the specific shape of "human predicates over code communities, regenerated as a cache of layer two" is a practical adaptation rather than a published method. Layer four is the least standardized, but it aligns with agent workflow and procedural-memory ideas in the operations literature. The contribution here is the packaging, not any of the individual layers: raw code graph → community graph → semantic ontology → operational playbooks, with evidence preserved at every hop and two valid read directions over the stack. *The Memory Layer* describes Graphify's "three brains" (Tree-sitter for code, a semantic extractor for prose, a multimodal pipeline for diagrams and audio), but those are extraction modalities, not navigation layers, and the book stops at "build the graph and let the agent walk it." GraphRAG generates community summaries but uses them as retrieval anchors for chunk-level evidence, not as a permanent human-readable map. The code-specific papers expose raw nodes and edges to the LLM. Either the model reads structural mush, or it reads natural-language summaries that have been collapsed for retrieval, or it reads a skill file detached from any structural context. The split that worked for me is to keep human prose as the entry-point map, link it back to the aggregated structural edges and the symbols underneath, and lay a thin operational layer on top so recurring tasks get a stable shape.

## What This Costs

This is not free. Four things hurt.

First, every layer needs regeneration when the code moves. Layer one is automatic from a parser. Layer two is automatic from community detection. Layer three is the expensive one, because the human predicates need an LLM pass and they go stale silently. The mitigation is to treat layer three as a cache over layer two, with a freshness check that reruns the labeler when the underlying aggregated edges change beyond a threshold.

Second, layer three is interpretive. If you let an LLM write the predicate phrases, you inherit its hallucinations. The mitigation is the one *The Memory Layer* already prescribes for raw edges: grounding plus provenance. Every phrase carries the aggregated layer-two edge counts that justify it, which themselves carry Graphify's `EXTRACTED` / `INFERRED` / `AMBIGUOUS` tags. The agent treats the phrase as a hypothesis and the lower layers as the test.

Third, the middle layer needs a community detection algorithm that produces stable, interpretable clusters. Leiden works, but cluster identity drifts as the code grows. You either pin community IDs across runs or you accept that "subsystem X" may mean a slightly different bag of files next month. I have not solved this cleanly.

Fourth, layer four is the most expensive of all to maintain, because it is mostly hand-written. A playbook that says "edit args.ts and model-resolver.ts" goes stale the moment someone renames the file. The mitigation here is provenance again: every key-file pointer in a playbook should resolve to a layer-one symbol, and a playbook with a stale pointer should be flagged and refused for autonomous execution. Treat playbooks like code, not like documentation. They get reviewed, tested, and pruned.

## What I Left Out

A few things were intentionally deferred:

- **Cross-repo graphs.** The same four-layer pattern should compose across a monorepo of services, but the community algorithm needs to respect package boundaries first. Not done yet.
- **Versioned ontology diffs.** Layer three changes when the architecture changes, and that diff is itself interesting (it is the architecture changelog). I have not built the diff view.
- **Query language.** Right now the agent navigates the layers by reading markdown and following links. A typed query language across the four layers, perhaps Cypher over a Neo4j export of layers two and four, would be faster, but it is a separate project.
- **Embedding-based edges.** The current edges are structural. Adding semantic-similarity edges (modules that solve similar problems without calling each other) would catch latent coupling, at the cost of more noise. This is essentially HybridRAG inside layer two.
- **Auto-mining playbooks from PR history.** Most recurring tasks already happened multiple times in your git log. A layer-four bootstrap that mines closed PRs for repeated change patterns is the obvious next step. Not built yet.

## Which Layers Should the Agent Read First

If the task is concrete and recurring, read layer four first, then walk down. The playbook tells the agent the answer. The lower layers tell the agent how to verify it.

If the task is exploratory and there is no playbook, read layer two first. The community graph with aggregated typed edges is the best ratio of information to tokens. Layer three helps onboard a model that has never seen the codebase. Layer one is mandatory for verification but should never be the entry point.

If you only have time to build one layer right now, build layer two (it falls out of community detection on the layer-one graph you already have). If you only have time to write one layer by hand, write layer four (a few playbooks for the tasks your team does most often). Layer three is the most enjoyable to read and the least urgent to build.

If you are building a code agent and your retrieval is keyword-over-source or vector-over-chunks, you are leaving the strongest signal on the floor. Karpathy was right that memory should be a graph. Shamsi was right that you can ship that graph in forty-eight hours. The remaining steps are to read the graph as four things, not one, and to write down the playbooks your agent keeps reinventing.

The skill that produces layers two and three from a Graphify `graph.json` is at `~/.pi/agent/skills/graphify-human-ontology/`. The playbook layer is mostly a folder of short markdown files keyed by intent, lightweight enough to live next to your `.claude/skills/` or `.cursor/commands/` directory until something more structured replaces it. Run Graphify on your largest repo first, point the skill at the output, then write five playbooks for the five things you ask an agent to do most. The hairball gets a lot less ugly when you stop trying to read it as one thing, and your agent gets a lot less expensive once it stops planning the same change from scratch every Tuesday.

---

Christian Pojoni writes about AI agents, knowledge graphs, and the architecture decisions that decide whether they actually work. More at [vasudev.xyz](https://vasudev.xyz).

*The cover image for this post was generated by AI.*
