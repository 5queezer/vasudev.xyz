# CLAUDE.md

Push context for this repo. Universally relevant on every session. If a rule
only applies when writing a post, it lives in `.claude/skills/blog-writer/`
instead. If it is a binding architectural decision, it lives in `docs/adr/`.

## Stack

- Hugo static site (vasudev.xyz). Content in `content/blog/`. Config in `hugo.toml`. Custom theme at `themes/vasudev/`.
- Deployed to GitHub Pages via `.github/workflows/deploy.yml` on push to master.

## Local dev

- Preview with drafts: `hugo server -D`
- Posts live at `content/blog/<slug>.md`

## Writing rules (always apply, even outside the skill)

- No em-dashes or double dashes. Rephrase.
- No semicolons. Split into separate sentences or rephrase.
- No bullet lists in the body of a blog post. Prose only. (Numbered lists and bullets in non-post docs are fine.)
- English is the default. German or Spanish files are generated (see translation note below).
- Front matter must include: `title`, `date`, `tags`, `description`.
- og:image is 1200x630 PNG.
- Tags must come from `data/allowed-tags.txt`, one per line, sorted. To add a new tag, add it to the file first, commit with `chore:` prefix, then use it in a post.

## Vale prose linter

Run after writing or editing any post:

```
vale --glob='!*.{de,es}.md' content/blog/<post-file>.md
```

- Style errors (EmDash, DoubleDash, Semicolon, BulletList) must be fixed in prose, not suppressed.
- Spelling exceptions for proper nouns, Sanskrit terms, and product names go in `styles/config/vocabularies/Blog/accept.txt`, sorted alphabetically. Commit vocab additions separately with `chore:` prefix.
- Run `vale sync` first if styles are missing.

## Auto-translation (do not hand-edit)

- `.github/workflows/translate.yml` runs `cmd/translate/main.go` on push to master.
- It writes `content/blog/<slug>.de.md` and `content/blog/<slug>.es.md` for every English post.
- `github-actions[bot]` commits the translations back.
- Do not manually create or edit `.de.md` or `.es.md` files. They will be overwritten.

## Review automation

- CodeRabbit fact-checks changed English source posts in `content/blog/*.md`. Translation files and blog index files are excluded.
- For factual claims, prefer inline citations or source links so the fact-check gate can verify dates, numbers, product behavior, and standards against authoritative public sources.

## Commit conventions

- One commit per post or logical change.
- Prefixes: `post:` for new posts, `seo:` for meta changes, `chore:` for tooling, `i18n:` for translation-related changes, `adr:` for ADR additions or status changes.
- Include a Claude Code session link in the commit body.

## Where the rest lives (pull context)

Read these files when the current task touches their area. Do not copy their
content into this file.

- `docs/adr/` holds binding architectural decisions in Nygard format. Read the relevant ADR before proposing structural changes. Index at `docs/adr/README.md`.
- `docs/specs/` holds per-feature intent documents. Read the spec for the feature you are working on. Index at `docs/specs/README.md`.
- `.claude/skills/blog-writer/SKILL.md` covers voice, post structure, post types, tone calibration, and every other writing-specific rule. Triggered when the task is to write or edit a blog post.
- `.claude/skills/cross-link/SKILL.md` covers the cross-linking protocol for existing posts.
