---
title: "12 — Tooling and Testing"
description: "The everyday TypeScript toolchain: package managers, tsc as a gate, ESLint and Prettier, Vitest, and the lint rules that prevent the most common mistakes."
weight: 12
type: "guide"
build:
  list: local
  render: always
---

# 12 — Tooling and Testing

The tooling is where an experienced engineer feels at home fastest, because the concerns are the ones you already have: dependency management, linting, formatting, type checking, and tests. Here is the TypeScript-specific mapping.

## Package Managers

`npm` ships with Node and is the safe default. `pnpm` is widely used for its speed and strict, disk-efficient dependency layout, and many teams standardize on it. `yarn` is also still common. They are largely interchangeable for daily work. The lockfile (`package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`) is what guarantees reproducible installs, so commit it.

Dependencies split into `dependencies` (needed at runtime) and `devDependencies` (needed only to build and test). TypeScript itself, type-only `@types/*` packages, linters, and test runners belong in `devDependencies`.

## tsc as the Type-Check Gate

Even when a bundler or runner compiles your code, run the type checker separately in CI:

```bash
tsc --noEmit
```

This is your equivalent of a compile check. It catches type errors without producing output. Make it a required CI step. Type errors should fail the build, not ship.

## Linting and Formatting

- **ESLint** with `typescript-eslint` is the standard linter. It catches bugs the type system does not, and type-aware rules can use type information for deeper checks.
- **Prettier** formats code so style is never a review topic. Many teams run it through ESLint or as a separate step.
- **Biome** is a newer single tool that does both linting and formatting quickly, and is gaining adoption as an alternative to the ESLint plus Prettier pair.

Lint rules worth enabling early, because they catch the mistakes this guide warned about:

- `no-floating-promises`: flags un-awaited promises that swallow errors.
- `no-explicit-any`: pushes you toward `unknown` and real types.
- `no-misused-promises`: catches passing an async function where a sync one is expected.

## Testing

- **Vitest** is the common modern test runner. It is fast, has a Jest-compatible API, and handles TypeScript and ESM with little configuration. A strong default for new projects.
- **Jest** is the long-standing incumbent and still everywhere, so recognize its API.
- **Playwright** is the standard for end-to-end browser testing.

A Vitest test looks like this:

```ts
import { describe, it, expect } from "vitest";
import { add } from "./math";

describe("add", () => {
  it("sums two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

The testing concepts transfer directly from any language you know. Arrange, act, assert. Mock at boundaries. Test behavior, not implementation. The only new part is the runner's API.

## A Note on Type-Level Confidence

Two habits raise your baseline quality immediately. First, keep `strict` on and `tsc --noEmit` green. Second, treat `any`, `as`, and `!` as things you must justify, because each one is a place you have overridden the compiler. A codebase with few of those and validated boundaries is one where the types actually mean something.

## Quick Self-Test

- Why run `tsc --noEmit` in CI when a bundler already compiles the code?
- What is the split between `dependencies` and `devDependencies`?
- Which three lint rules prevent the most common async and typing mistakes?
- What is the default modern test runner, and what does its API resemble?
