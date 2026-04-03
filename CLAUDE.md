## Project

- Hugo static site (vasudev.xyz)
- Custom theme at themes/vasudev/
- Content in content/blog/ (one .md file per post)
- Config: hugo.toml
- Deployed via GitHub Pages (GitHub Actions)

## Local dev

- `hugo server -D` to preview with drafts
- Posts go in content/blog/<slug>.md

## Writing rules

- No em-dashes or double dashes. Rephrase instead.
- No semicolons. Split into separate sentences or rephrase.
- No bullet lists in post body. Prose only.
- English default. German only if explicitly requested.
- Front matter must include: title, date, tags, description
- og:image format: 1200x630 PNG

## Vale prose linter

- Config: `.vale.ini` (Google style + custom Vasudev rules)
- Word allowlist: `styles/config/vocabularies/Blog/accept.txt`
- Add new proper nouns, Sanskrit terms, product names, and technical acronyms to accept.txt before committing a post -- Vale will fail CI otherwise
- Commit vocab additions with prefix `chore:`

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
