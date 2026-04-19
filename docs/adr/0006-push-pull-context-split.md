# ADR-0006: Push vs pull context split for agent files

- Status: Accepted
- Date: 2026-04-19

## Context

CLAUDE.md had grown to 138 lines covering voice guidelines, post structure
rules, cross-disciplinary bridging rules, post types, tone calibration,
project layout, build commands, Vale usage, translation pipeline notes, and
commit conventions. Most of that content is relevant only when the agent is
actively writing a blog post. It loads into every session regardless, paying
a per-turn reasoning-token tax on tasks where it is irrelevant. The same
content was already partially duplicated in `.claude/skills/blog-writer/SKILL.md`,
which loads only when the skill triggers.

Two 2026 studies ([ETH Zurich](https://arxiv.org/abs/2602.11988) and
[Lulla et al.](https://arxiv.org/abs/2601.20404)) disagree on whether
AGENTS.md style files help coding agents. The disagreement resolves once you
separate always-relevant content (push) from task-relevant content (pull).
The reasoning is documented in the post
[Stop Putting Decisions in CLAUDE.md](/blog/push-pull-context/).

## Decision

Split the repo's agent-facing context into four tiers by residency.

CLAUDE.md is push context. It contains only universally relevant items:
stack summary, non-default build and lint commands, commit conventions, a
one-line pointer to `docs/adr/`, and a pointer to `.claude/skills/`. Target
under 80 lines.

`docs/adr/` is pull context. Binding architectural decisions live here in
Nygard format, one per file, numbered sequentially. The agent reads the
relevant ADR when touching architecture. See `docs/adr/README.md`.

`docs/specs/` is pull context. Per-feature intent documents live here. The
agent reads the spec for the feature it is currently working on, ignores the
rest. See `docs/specs/README.md`.

`.claude/skills/` is triggered pull context. Workflow protocols live here.
Each skill's description loads into the agent's awareness, but the body only
loads when the skill's trigger phrase matches the current task.

## Consequences

Per-session token cost drops. Irrelevant content stops paying a tax. The
audit trail for decisions becomes higher fidelity than CLAUDE.md ever was,
because each ADR captures the Alternatives Considered section that nobody
would ever write inside a bloated CLAUDE.md. A new surface, `docs/adr/`, now
has to be maintained, which is a deliberate cost. The agent needs the
pointer in CLAUDE.md to discover the pull tier at all. Without it, the split
fails silently.

An ADR-lint workflow (`.github/workflows/adr-lint.yml`) validates structure:
filename format, sequential numbering without gaps, required sections
(Status, Context, Decision, Consequences, Alternatives considered), and a
valid Status value.

## Alternatives considered

### Alternative A: Keep everything in CLAUDE.md

Status quo. Rejected because the per-session cost grows with every added
decision, and the token tax hits every session regardless of relevance.
Anthropic's own harness tells Claude that CLAUDE.md "may or may not be
relevant", an admission that the always-loaded model is defective for
non-universal content.

### Alternative B: Move everything into `.claude/skills/`

All context becomes triggered. Rejected because skills require a trigger
phrase. Truly universal context (build commands, commit conventions) should
not depend on the agent guessing the right skill name. A small push tier
still carries its weight.

### Alternative C: Use git commit messages as the only decision carrier

Ivan Stetsenko's ["Lore" proposal](https://arxiv.org/abs/2603.15566).
Rejected not because it is wrong but because it operates at a finer grain.
Commit messages catch per-change reasoning, ADRs catch per-decision
reasoning. The layers complement each other. This ADR does not preclude
adopting richer commit message conventions later.
