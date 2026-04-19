# Architecture Decision Records

Binding decisions for the vasudev.xyz repo, one per file, in
[Michael Nygard's format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

These files are pull context. Agents and humans read them when touching a
related area. Do not copy their content into CLAUDE.md. Read the relevant ADR
before proposing a structural change.

## Rules

- One decision per file. Filename pattern: `NNNN-kebab-case-title.md`, zero-padded to four digits.
- Numbering is sequential. No gaps. New decisions take the next free number.
- Status is one of `Proposed`, `Accepted`, `Deprecated`, or `Superseded by ADR-NNNN`.
- Do not edit an accepted ADR's Context or Decision sections. If the decision changes, write a new ADR that supersedes the old one and update the old one's status to `Superseded by ADR-NNNN`.
- Every ADR lists alternatives considered. This is the part that stops an agent (or a human) from "helpfully" re-suggesting the option you already rejected.

## Template

Copy `_template.md` when starting a new ADR.

## Index

- [ADR-0001: Hugo as the static site generator](0001-hugo-static-site.md)
- [ADR-0002: GitHub Pages as the deployment target](0002-github-pages-deployment.md)
- [ADR-0003: LLM auto-translation outside the build](0003-llm-auto-translation.md)
- [ADR-0004: Vale with custom Vasudev prose rules](0004-vale-custom-prose-rules.md)
- [ADR-0005: Tag allowlist in `.github/allowed-tags.txt`](0005-tag-allowlist.md)
- [ADR-0006: Push vs pull context split for agent files](0006-push-pull-context-split.md)
