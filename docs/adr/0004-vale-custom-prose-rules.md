# ADR-0004: Vale with custom Vasudev prose rules

- Status: Accepted
- Date: 2025-02-20

## Context

The blog's voice is direct. Hedging, em-dashes, and semicolons are symptoms
of the voice drifting. A single author cannot reliably catch these patterns
in their own prose. The cost of a bad post shipped is a permanent artifact
on the public internet. The cost of a prose linter blocking a commit is
seconds.

## Decision

Use Vale with Google's style pack as a base plus four custom rules under
`styles/Vasudev/`: `EmDash.yml`, `DoubleDash.yml`, `Semicolon.yml`, and
`BulletList.yml`. Spelling exceptions for proper nouns, Sanskrit terms, and
product names go in `styles/config/vocabularies/Blog/accept.txt` sorted
alphabetically. The lint runs in CI via `.github/workflows/prose-lint.yml`
on any PR that touches `content/blog/**`. Style errors fail the build.
Generated translations (`*.de.md`, `*.es.md`) are excluded from the lint.

## Consequences

Voice stays inside a narrow range without the author having to think about
it. New contributors see the rule fire and learn the style implicitly. The
Vale config is now a committed surface that has to be maintained. The custom
rules are strict enough that edge cases (technical abbreviations, code
samples with semicolons inside them) require either rephrasing or an inline
Vale comment.

## Alternatives considered

### Alternative A: No linter

Trust the author. Rejected because the author is the reason the rules
exist. Style drift in personal writing is only catchable after the fact
without tooling.

### Alternative B: write-good or alex.js

Broader prose linters. Rejected because they flag things the blog
specifically wants (passive voice is sometimes correct, certain "insensitive"
words are technical terms). Vale's rule-per-YAML model gives finer control.

### Alternative C: Pre-commit hook instead of CI

Blocks faster. Rejected because the author edits on multiple machines and
sometimes in the GitHub web UI. CI is the only place every change passes
through.
