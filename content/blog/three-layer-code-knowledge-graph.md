---
title: "Your Code Knowledge Graph Needs Three Layers, Not One"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
description: "Shamsi's Memory Layer is right that agents need a graph. It stops one layer short. The middle layer is what carries an LLM through a repo."
---

Andrej Karpathy made the argument in one post: memory is a structure you inhabit, not a cache you refill every prompt. Forty-eight hours later, Safi Shamsi shipped [Graphify](https://github.com/safishamsi/graphify) and wrote *The Memory Layer* around it. The thesis is that an AI agent should walk a knowledge graph instead of grepping a vector index, because relationships live in the white space between chunks and a vector store cannot see them.

I agree with the thesis. I think the book stops one layer short.

I generated a Graphify graph for a coding agent codebase last week. The first version was the obvious thing. Nodes were files, classes, functions, methods. Edges were `imports`, `calls`, `contains`, `method`. Opening it in Obsidian gave me a hairball. I clustered it into communities and labeled each with a concept name. Better. But the edges still said things like `calls×32 / method×7 / contains×11`. Useful as evidence. Not useful as a map. Then I rewrote the edges as human relationship phrases: "drives and observes conversations," "supplies credentials to," "renders markdown with." Suddenly the graph read like a sentence. Suddenly an LLM could orient on it.

Then I asked the obvious question. If the human-language layer is so readable, why not skip the other two?

**A code knowledge graph for an LLM agent should be three layers, and the middle layer is the one that does the work.**

## What This Actually Looks Like

Take a real subsystem boundary in a coding agent runtime. The interactive terminal UI talks to the agent session lifecycle. That's a real architectural fact. There are three different ways to describe it.

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

Same fact. Three different framings. None of them is the right answer alone.

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

## The Layer That Actually Carries the Agent

Layer two is the unglamorous one. Communities of files glued by aggregated typed edges. No prose, no hand-curated language, just structural clusters with counts on the edges between them.

This is what an LLM agent should reason on first.

The reason is search-space reduction. A repo has hundreds of files. A subsystem graph has a few dozen communities. When the user says "fix the bug where the bash tool prints stale output," the agent should not be doing keyword search across the whole tree. It should be looking at the community graph, finding "Bash Execution Interface" and "Interactive Session Orchestration," noting which other communities they bridge to, then descending into layer one for the precise file. That is two graph hops instead of a thousand grep matches.

The aggregated edge counts also encode something the raw graph hides. If two communities are connected by `calls×32 / imports×9 / events×4`, that is a thick coupling and any change to one will probably touch the other. If they are connected by `contains×1`, they barely know each other. Counts are the cheapest impact-analysis signal you have.

## The Workflow This Implies

The three layers are not alternatives. They are a pipeline.

```text
Layer 3 (human ontology)
  agent reads the map, picks a conceptual route
    "the user wants to change how exports render markdown"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "HTML Session Export Viewer, bridged to Markdown Rendering Engine"

Layer 1 (raw graph)
  agent finds the exact file and function
    "themes/export/render.ts, parseMarkdown(), line 84"

Source code
  agent reads, edits, verifies
```

Each layer answers a different question. Layer three answers "what is this and why does it exist." Layer two answers "where does it live and what does it touch." Layer one answers "what is the precise symbol I need to change." You cannot collapse them, because the question changes at each step.

## Where This Sits in the Literature

Two literatures converge on this shape and mostly do not talk to each other.

The first is program analysis. The [code property graph](https://en.wikipedia.org/wiki/Code_property_graph), introduced by Yamaguchi et al. in their 2014 IEEE S&P paper "Modeling and Discovering Vulnerabilities with Code Property Graphs" (which won the IEEE Test-of-Time Award in 2024), already merges three classic representations into one structure: the abstract syntax tree, the control flow graph, and the program dependence graph. The original use case was vulnerability discovery, but the lesson generalizes. A single representation cannot answer all the questions you have about code, so you compose representations and let the query pick the right slice. That is layer one done well, and it has been done well for over a decade.

The second is graph-based retrieval for LLMs. Microsoft's GraphRAG paper, ["From Local to Global: A Graph RAG Approach to Query-Focused Summarization"](https://arxiv.org/abs/2404.16130) by Edge et al. (2024), is explicit about the value of an intermediate community layer. They build an entity graph, partition it with the [Leiden algorithm](https://en.wikipedia.org/wiki/Leiden_algorithm), and generate summaries per community. Queries hit the community summaries first and only descend into entities when needed. That is exactly layer two, applied to documents instead of code. *The Memory Layer* describes the same pattern in Chapter 5 and treats HybridRAG (a tunable blend `α · vector_score + (1 - α) · graph_score`) as the new default. Both confirm that the community layer is real and load-bearing.

Recent code-specific work is converging on the same shape. ["Code Graph Model (CGM): A Graph-Integrated Large Language Model for Repository-Level Software Engineering Tasks"](https://arxiv.org/abs/2505.16901) by Tao et al. integrates repository code graph structure into an LLM's attention mechanism and pairs it with an agentless graph RAG framework, hitting 43% on SWE-bench Lite as the top open-weight model. ["GraphCodeAgent: Dual Graph-Guided LLM Agent for Retrieval-Augmented Repo-Level Code Generation"](https://arxiv.org/abs/2504.10046) by Li et al. uses a dual-graph design (a requirement graph and a structural-semantic code graph) and lets the agent multi-hop across both for retrieval. ["Knowledge Graph Based Repository-Level Code Generation"](https://arxiv.org/abs/2505.14394) by Athale and Vaddina represents a repo as a graph that captures structural and relational information and uses hybrid retrieval over it.

What none of these works spell out cleanly is the third layer. *The Memory Layer* describes Graphify's "three brains" (Tree-sitter for code, a semantic extractor for prose, a multimodal pipeline for diagrams and audio), but those are extraction modalities, not navigation layers. The book stops at "build the graph and let the agent walk it." GraphRAG generates community summaries but uses them as retrieval anchors for chunk-level evidence, not as a permanent human-readable map. The code-specific papers expose raw nodes and edges to the LLM. Either the LLM reads structural mush or it reads natural-language summaries that have been collapsed for retrieval. The split that worked for me is to keep human prose as the entry-point map but always link it back to the aggregated structural edges, which themselves link back to symbols. Three layers, one read direction, evidence preserved at every hop.

## What This Costs

This is not free. Three things hurt.

First, every layer needs regeneration when the code moves. Layer one is automatic from a parser. Layer two is automatic from community detection. Layer three is the expensive one, because the human predicates need an LLM pass and they go stale silently. The mitigation is to treat layer three as a cache over layer two, with a freshness check that reruns the labeler when the underlying aggregated edges change beyond a threshold.

Second, layer three is interpretive. If you let an LLM write the predicate phrases, you inherit its hallucinations. The mitigation is the one *The Memory Layer* already prescribes for raw edges: grounding plus provenance. Every phrase carries the aggregated layer-two edge counts that justify it, which themselves carry Graphify's `EXTRACTED` / `INFERRED` / `AMBIGUOUS` tags. The agent treats the phrase as a hypothesis and the lower layers as the test.

Third, the middle layer needs a community detection algorithm that produces stable, interpretable clusters. Leiden works, but cluster identity drifts as the code grows. You either pin community IDs across runs or you accept that "subsystem X" may mean a slightly different bag of files next month. I have not solved this cleanly.

## What I Left Out

A few things were intentionally deferred:

- **Cross-repo graphs.** The same three-layer pattern should compose across a monorepo of services, but the community algorithm needs to respect package boundaries first. Not done yet.
- **Versioned ontology diffs.** Layer three changes when the architecture changes, and that diff is itself interesting (it is the architecture changelog). I have not built the diff view.
- **Query language.** Right now the agent navigates the layers by reading markdown and following links. A typed query language across the three layers, perhaps Cypher over a Neo4j export of layer two, would be faster, but it is a separate project.
- **Embedding-based edges.** The current edges are structural. Adding semantic-similarity edges (modules that solve similar problems without calling each other) would catch latent coupling, at the cost of more noise. This is essentially HybridRAG inside layer two.

## Which Layer Should the Agent Read First

If you only have time to wire one layer into your agent, wire layer two. The community graph with aggregated typed edges is the best ratio of information to tokens. Layer three is a nice-to-have that helps onboarding. Layer one is mandatory for verification but should never be the entry point.

If you are building a code agent and your retrieval is keyword-over-source or vector-over-chunks, you are leaving the strongest signal on the floor. Karpathy was right that memory should be a graph. Shamsi was right that you can ship that graph in forty-eight hours. The remaining step is to stop reading the graph as one thing. The structural graph already exists in your AST. Cluster it, label the bridges, and let the agent walk the map before it walks the tree.

The skill that produces all three layers from a Graphify `graph.json` is at `~/.pi/agent/skills/graphify-human-ontology/`. Run Graphify on your largest repo first, then point the skill at the output. You get the labeled diagrams, the evidence notes, and the canvas. The hairball gets a lot less ugly when you stop trying to read it as one thing.

---

Christian Pojoni writes about AI agents, knowledge graphs, and the architecture decisions that decide whether they actually work. More at [vasudev.xyz](https://vasudev.xyz).
