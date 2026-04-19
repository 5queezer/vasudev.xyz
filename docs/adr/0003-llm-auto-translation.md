# ADR-0003: LLM auto-translation outside the build

- Status: Accepted
- Date: 2025-03-10

## Context

The blog targets both international readers (English) and German-speaking
employers. Maintaining two or three language variants by hand is a known
failure mode. Every post that gets out of sync erodes trust. Hugo supports
i18n natively, but the translation itself has to come from somewhere.

## Decision

Translate every English post to German and Spanish automatically. A Go
program at `cmd/translate/main.go`, triggered by `.github/workflows/translate.yml`
on push to master, reads each `content/blog/*.md` that lacks a fresh
counterpart and writes `content/blog/<slug>.de.md` and
`content/blog/<slug>.es.md`. The translation is committed back to master by
`github-actions[bot]`. Translation files are not hand-edited. They are
excluded from CodeRabbit fact-check review and from the Vale prose lint.

## Consequences

A single English source is the only hand-edited copy. Translation cost is
paid once per post change, not per reader request. Factual claims must live
in the English source because the translator has no editorial judgement.
Translation drift is possible if the Go program's prompt is changed without
re-translating historical posts, so re-translation is idempotent and safe to
run at any time.

## Alternatives considered

### Alternative A: Hand translation

Highest fidelity. Rejected because a single author cannot maintain three
languages without either skipping posts or losing tone. The blog exists to
compound over time, not to be perfect per post.

### Alternative B: Build-time translation inside Hugo

Would avoid the extra workflow. Rejected because translation is slow (tens
of seconds per post) and Hugo builds should stay sub-second. Translation also
needs to be cached across builds, which means it has to live in a committed
artifact anyway.

### Alternative C: Client-side translation via browser

Zero build cost. Rejected because SEO requires server-rendered translations.
Google does not index machine-translated content generated at request time,
and social previews fall back to the source language.
