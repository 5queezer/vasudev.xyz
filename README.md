# vasudev.xyz

Personal site of Christian Pojoni, built with [Hugo](https://gohugo.io) and deployed via GitHub Pages.

## Local development

```bash
hugo server -D
```

## Stack

- Hugo static site generator
- Custom theme (`themes/vasudev/`)
- Content in `content/blog/`
- Deployed via GitHub Actions to GitHub Pages

## Review automation

CodeRabbit is configured to fact-check changed English source posts in `content/blog/*.md`. Generated translation files (`*.de.md`, `*.es.md`) and blog index files are excluded from review. For factual claims, prefer adding inline citations or source links so the fact-check gate can verify dates, numbers, product behavior, standards, and similar assertions against authoritative public sources.
