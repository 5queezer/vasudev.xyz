---
title: "Stop Putting Decisions in CLAUDE.md. Put Them Where the Agent Won't Always Read Them."
date: 2026-04-19
tags: ["adr", "agents", "architecture", "claude"]
description: "Two 2026 studies disagree about whether AGENTS.md helps coding agents. The fight makes sense once you separate push context from pull context."
images: ["/images/push-pull-context-og.png"]
images: ["/images/push-pull-context-og.png"]
images: ["/images/push-pull-context-og.png"]
---




Two rigorous 2026 studies measured whether agent context files help AI coding agents. They reached opposite conclusions. The ETH Zurich group ran SWE-bench Lite and AGENTbench across multiple models and [found that LLM-generated AGENTS.md files reduced task success by 3% and inflated inference cost by 20%](https://arxiv.org/abs/2602.11988). Developer-written files gave a marginal 4% bump with the same cost hit. A month earlier, [Lulla et al. reported the opposite](https://arxiv.org/abs/2601.20404) on a clean paired experiment with 124 real GitHub PRs: AGENTS.md presence cut median runtime by 28.64% and output tokens by 16.58%.

Both studies are careful. Both measured real things. The field split immediately into camps.

The split is avoidable. Both studies measured the same artifact and treated it as one thing. It isn't.

**Decisions belong in pull context, not push context. Conflating the two is why half your CLAUDE.md is probably hurting you right now.**

## Push context versus pull context

A coding agent reads two kinds of project information.

Push context is loaded into every session, unconditionally. CLAUDE.md, AGENTS.md, copilot-instructions.md. The agent reads the nearest one at startup whether your task needs it or not. It pays a token tax on every turn, and the evidence from both studies above is that the tax is roughly 20% in reasoning tokens regardless of whether the file helps the specific task.

Pull context sits on disk and the agent reads it when relevant. `docs/adr/0007-nautilus-backtest-engine.md`, `docs/specs/mcp-tools.md`, a skill in `.claude/skills/`, the actual source of a function. Zero baseline cost. The agent greps, opens, and reads only the files whose names match the current task. If the decision isn't relevant, no tokens spent.

The empirical story reads differently through that lens. Lulla et al. measured repos where AGENTS.md contained mostly build commands, test runners, and tool names. That is genuinely always-relevant push context, where the cost is paid back by avoided discovery. The ETH Zurich group's LLM-generated files were padded with architectural overviews, directory trees, and style rules that the agent [didn't need in-context because it could discover them on demand](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). That is push context paying a tax with no payback.

Same artifact, different contents, opposite results. The metric that matters is not "does the file exist" but "what did you put in it."

## The CLAUDE.md trap most repos fall into

Open a random public repo's CLAUDE.md and you will find five recurring items. Build and test commands, correctly placed as push context. Tool names the agent wouldn't otherwise infer, like `uv` or `pnpm`, also correct. The ETH study found that [mentioned tools get used 160x more often](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Then the bloat starts. A directory tree of the repo, which agents navigate via `ls` and `grep` faster than by reading a stale text version. Code style rules like camelCase enforcement, which is what your linter is for, and the agent's training data already biases toward your language's conventions. Finally, architectural rationale along the lines of choosing Postgres over MongoDB for reason X, which is pull context pretending to be push context.

Those last three are the bloat. The architectural rationale is the one worth arguing about because the intuition behind it is defensible: if I put the decision in CLAUDE.md, the agent sees it every session and won't re-litigate it. The flaw is that you pay the token cost on every session, including the 95% of sessions where that decision is irrelevant, and [Anthropic's own harness warns Claude that CLAUDE.md may not be relevant to the task](https://www.humanlayer.dev/blog/writing-a-good-claude-md). That is an admission that the always-loaded model is defective for anything other than always-relevant content.

What you actually want is for the agent to learn the decision at the moment it's touching the relevant code. That is what pull context does.

## Why ADRs are pull context done right

Architecture Decision Records, in [Michael Nygard's format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), have four properties that make them agent-friendly without being push context.

**Numbered and sequential.** `docs/adr/0007-use-klinecharts-for-price-rendering.md`. The agent can grep `docs/adr/` for any term and find every decision touching it. Context, not trivia.

**Status-tracked.** `Accepted`, `Superseded by ADR-0023`, `Deprecated`. When the agent reads ADR-0007 and sees `Superseded by ADR-0023`, it follows the link. The decision history is navigable without polluting any single file.

**Alternatives section.** Every ADR lists what you rejected and why. This is the part nobody documents in CLAUDE.md because it would be too long, and it's the part that stops an agent from "helpfully" swapping your library choice three months later. Without alternatives documented, the agent re-suggests the rejected option because its training data has more examples of the alternative.

**Never rewritten.** If you change your mind, you write a new ADR that supersedes the old one. The audit trail is the artifact. `git log` doesn't give you this. It gives you diffs, not the reasoning layer above them.

The agent pays zero tokens for ADRs you don't read. When it does read one, it gets 200 words of focused, structured decision context exactly at the moment it's relevant.

## The full push/pull decomposition

For an agentic repo, four artifact types with four different residencies.

**CLAUDE.md (push).** Under 100 lines. Tool names the agent wouldn't infer. Non-default build, test, and lint commands. Safety boundaries ("never run migrations without approval"). A pointer to where ADRs and specs live. Nothing else. If your CLAUDE.md is over 200 lines, you are shipping per-session tax on irrelevant content.

**`docs/adr/` (pull).** Binding architectural decisions. One decision per file. Nygard format. This is where the rationale for choosing Nautilus over vectorbt lives.

**`docs/specs/` (pull).** Per-feature intent. What the feature does, what it doesn't, acceptance criteria. The agent reads the spec for the feature it's currently building, ignores the rest. Spec-driven development frameworks like [Intent](https://www.augmentcode.com/guides/how-to-build-agents-md) formalize this. You don't need the tool to follow the pattern.

**`.claude/skills/` (pull, triggered).** Workflow protocols. How to run QA, how to open a PR, how to write a blog post. Loaded only when the skill's trigger phrase matches. This is [progressive disclosure](https://github.com/shanraisshan/claude-code-best-practice). The agent sees the skill description, decides to load it, then sees the body.

The common thread in the pull tiers is that the agent chooses what to load based on task relevance. CLAUDE.md is the only tier where you choose for the agent, and you pay for it every session.

## The Lore paper's counter-argument is worth reading

[Ivan Stetsenko's March 2026 paper](https://arxiv.org/abs/2603.15566) argues ADRs operate at too coarse a granularity. They capture "why PostgreSQL over MongoDB" but not "why this retry loop has three attempts and not five." The implementation-level reasoning, which he calls the Decision Shadow, disappears. His proposal is structured git commit messages as the carrier.

He is correct that ADRs have a granularity ceiling. The response isn't to abandon them, it's to stack them. Commit messages catch the per-change reasoning. ADRs catch the per-decision reasoning. Specs catch the per-feature reasoning. CLAUDE.md catches the per-repo reasoning. Each layer has its own residency on the push/pull spectrum, and each carries a different grain of decision.

The mistake is using one layer to do the work of another. CLAUDE.md bloated with architectural rationale is the most common form of this mistake. Commit messages padded with project-level context is the rarer inverse.

## What I am not claiming

No study has isolated ADRs specifically and measured their impact on agent task success. The evidence above is for AGENTS.md style files. The push/pull argument is an architectural claim extrapolated from the AGENTS.md data plus the known behavior of filesystem-aware agents, not a direct measurement. Someone should run that experiment. Until they do, treat this as a structured hypothesis, not a theorem.

I am also not claiming pull context is free. The agent has to know where to look. That means CLAUDE.md must contain a short pointer like "Binding decisions live in `docs/adr/`, sorted by number. Read the relevant ADR before changing architecture." Without the pointer, the agent doesn't discover the pull tier. With it, one line of push context unlocks arbitrary pull depth.

## What to do on Monday

Open your repo's CLAUDE.md. Cut every section that is not universally relevant to every session. The directory tree goes. The style guide goes (your linter handles it). The architectural rationale goes. Move it to `docs/adr/0001-whatever.md` with Nygard format, including the alternatives section you've been skipping.

Add one line to CLAUDE.md: `Binding architectural decisions live in docs/adr/. Read the relevant ADR before proposing structural changes.`

That single restructuring is the highest-leverage change most agentic repos can make right now. It costs an afternoon. It removes the 20% reasoning-token tax on irrelevant sessions, preserves decision history at higher fidelity than CLAUDE.md ever could, and gives contributors (human and agent) a durable audit trail.

The two studies aren't contradicting each other. They're measuring two different content strategies under one filename. Separate push from pull and the contradiction resolves.

---

*Christian Pojoni writes about agentic coding, Rust, and trading infrastructure at [vasudev.xyz](https://vasudev.xyz). He is building [Hrafn](https://github.com/5queezer/hrafn), a Rust agent framework, and contributing to MuninnDB.*

*The cover image for this post was generated by AI.*
