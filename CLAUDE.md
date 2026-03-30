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

## Commit conventions

- One commit per post or per logical change
- Prefix: "post:" for new posts, "seo:" for meta changes, "chore:" for tooling
- Include Claude Code session link in commit body

## Skills

- .claude/skills/blog-writer/SKILL.md -- read before writing any blog post
