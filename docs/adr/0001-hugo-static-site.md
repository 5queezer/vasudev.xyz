# ADR-0001: Hugo as the static site generator

- Status: Accepted
- Date: 2025-01-15

## Context

vasudev.xyz is a personal engineering blog. The content is Markdown with
front matter. The audience is split between recruiters who may visit once
and technical readers who arrive via search or social. Build speed matters
because content changes are frequent and because the auto-translation pipeline
rebuilds on every push to master. Hosting is GitHub Pages, which only serves
static files.

## Decision

Use Hugo as the static site generator. The site lives in the repo root with
a custom theme at `themes/vasudev/`, config in `hugo.toml`, and content in
`content/blog/`.

## Consequences

Builds are sub-second on a single post change, which keeps the translation
job cheap. The custom theme is a second artifact to maintain. Hugo's
templating language (Go templates) is less ergonomic than JSX but adequate
for a blog. i18n is supported natively via language files, which the
translation pipeline writes into.

## Alternatives considered

### Alternative A: Jekyll

The GitHub Pages default. Rejected because Ruby tooling is slower, the
ecosystem is in maintenance mode, and Liquid is weaker than Go templates
for the conditional rendering the theme needs.

### Alternative B: Astro

Modern, component-based, good DX. Rejected because the blog has no
interactive components that justify a JS-driven builder, and Astro's
build output is heavier than Hugo's for a pure-content site.

### Alternative C: Zola

Rust, single-binary, similar feature set to Hugo. Rejected because the
i18n support was weaker at the time of decision and the ecosystem is
smaller when searching for theme patterns.
