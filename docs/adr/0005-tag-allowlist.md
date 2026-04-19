# ADR-0005: Tag allowlist in `.github/allowed-tags.txt`

- Status: Accepted
- Date: 2025-03-01
- Revised: 2026-04-19. File moved from `data/allowed-tags.txt` to `.github/allowed-tags.txt` because Hugo scans `/data/` and rejects non-YAML/JSON/TOML files. Path changed, decision unchanged.

## Context

Hugo taxonomies accept any tag a post declares. Without discipline, tags
sprawl. Typos create new tag pages. Near-duplicates like `llm` and `LLMs`
and `large-language-models` fragment the archive. A reader who clicks
a tag expects every post on that topic to appear.

## Decision

Maintain a committed allowlist at `.github/allowed-tags.txt`, one tag per line,
sorted alphabetically, lowercase, kebab-case. A CI job in
`.github/workflows/prose-lint.yml` fails any post whose `tags:` front matter
field contains a value not in the allowlist. Adding a new tag is a
two-step commit: first add the tag to the allowlist, then use it in a post.

## Consequences

The archive stays clean. Tags are searchable and predictable. The friction
of adding a new tag is deliberate. The author is forced to decide whether
a topic is a one-off or a recurring theme before creating a tag page.
Historical tag renames require a migration pass across all posts, which is
also deliberate friction.

## Alternatives considered

### Alternative A: Free-form tags

Lowest friction for the author. Rejected because the archive becomes
unusable within 20 posts. Tag pages with one post each are a signal of
abandoned themes.

### Alternative B: Hugo config-based taxonomy declaration

Declares valid taxonomies in `hugo.toml`. Rejected because Hugo's taxonomy
config is coarser than per-tag control. It says "tags exist" but not
"these specific tags are allowed".

### Alternative C: Inferred tags from post content

LLM picks tags from the body. Rejected because the value of a tag system is
consistency, not coverage. An LLM with fresh context per post will not stay
consistent across 50 posts.
