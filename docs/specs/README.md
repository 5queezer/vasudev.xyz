# Feature specs

Per-feature intent documents for vasudev.xyz. Pull context. The agent reads
the spec for the feature it is currently building or modifying, ignores the
rest.

## When to write a spec

Write one when a feature spans more than a single commit and has
non-obvious acceptance criteria. Do not write one for a single blog post.
Do not write one for a pure refactor. A spec earns its place when there is
ambiguity about "is this done" that would otherwise get re-litigated.

## Format

One feature per file. Filename: `kebab-case-feature-name.md`. No numbering,
because specs are not sequential decisions. Sections:

- **Goal.** One paragraph. What the feature is and why it exists.
- **Scope.** What is in. What is out. The "out" list is the important half.
- **Acceptance criteria.** A testable list. "Done" is when every item is checked.
- **Open questions.** Unresolved design choices. Delete the section once resolved.

## Relationship to ADRs

A spec describes a feature. An ADR describes a decision that shapes one or
more features. If a spec forces an architectural choice that future features
will inherit, promote the choice to an ADR and link it from the spec.

## Current specs

None yet. First spec lands when the next multi-commit feature does.
