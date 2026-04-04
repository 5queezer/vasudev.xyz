## Project

- Hugo static site (vasudev.xyz)
- Custom theme at themes/vasudev/
- Content in content/blog/ (one .md file per post)
- Config: hugo.toml
- Deployed via GitHub Pages (GitHub Actions)

## Local dev

- `hugo server -D` to preview with drafts
- Posts go in content/blog/<slug>.md

## Review automation

- CodeRabbit fact-checks changed English source posts in `content/blog/*.md`
- Generated translation files (`*.de.md`, `*.es.md`) and blog index files are excluded from CodeRabbit review
- For factual claims, prefer inline citations or source links so the fact-check gate can verify dates, numbers, product behavior, standards, and similar assertions against authoritative public sources

## Writing rules

- No em-dashes or double dashes. Rephrase instead.
- No semicolons. Split into separate sentences or rephrase.
- No bullet lists in post body. Prose only.
- English default. German only if explicitly requested.
- Front matter must include: title, date, tags, description
- og:image format: 1200x630 PNG
- Tags must come from `data/allowed-tags.txt` (one tag per line, sorted). To add a new tag, add it to the file first.

## Vale prose linter

- Config: `.vale.ini` (Google style + custom Vasudev rules)
- Word allowlist: `styles/config/vocabularies/Blog/accept.txt`
- **After writing or editing a blog post, always run:**
  ```
  vale --glob='!*.{de,es}.md' content/blog/<post-file>.md
  ```
- If Vale reports `Vale.Spelling` errors for legitimate proper nouns, Sanskrit terms, product names, or technical acronyms:
  1. Add each word to `styles/config/vocabularies/Blog/accept.txt` (one word per line, keep sorted alphabetically, case-sensitive)
  2. Re-run Vale to confirm errors are resolved
  3. Commit vocab additions separately with prefix `chore:`
- Do not add common misspellings or informal words to accept.txt. Only add terms that are correctly spelled but unknown to Vale.
- If Vale reports style errors (Vasudev.EmDash, Vasudev.Semicolon, etc.), fix the prose instead of suppressing the rule
- Run `vale sync` first if styles/Google is missing

## Auto-translation

- On push to master, GitHub Actions runs `cmd/translate/main.go` via `.github/workflows/translate.yml`
- Translates every English post (`content/blog/*.md`) to German (`.de.md`) and Spanish (`.es.md`)
- Translation is committed back to master automatically by `github-actions[bot]`
- Do not manually create or edit `.de.md` / `.es.md` files -- they are generated and will be overwritten

## Commit conventions

- One commit per post or per logical change
- Prefix: "post:" for new posts, "seo:" for meta changes, "chore:" for tooling, "i18n:" for translation-related changes
- Include Claude Code session link in commit body

## Skills

- .claude/skills/blog-writer/SKILL.md -- read before writing any blog post
