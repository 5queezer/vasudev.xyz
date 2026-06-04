---
title: "08 — Modules, tsconfig, and the Build Story"
description: "ESM versus CommonJS, how TypeScript compiles, the tsconfig options that matter, and the modern runners that skip the build step in development."
weight: 8
type: "guide"
build:
  list: local
  render: always
---

# 08 — Modules, tsconfig, and the Build Story

This is the part of the ecosystem that confuses newcomers most, because there are two module systems and several ways to run TypeScript. Here is the map.

## Two Module Systems

JavaScript has two module formats, and you will meet both.

- ES Modules (ESM): `import` and `export`. This is the standard and the default for new code.
- CommonJS (CJS): `require` and `module.exports`. The older Node format, still common in dependencies.

```ts
// ESM
import { readFile } from "node:fs/promises";
export function helper() {}

// CommonJS (older style you will still read)
const { readFile } = require("fs/promises");
module.exports = { helper };
```

Write ESM in new projects. Note the `node:` prefix on built-in modules. It is the explicit, modern way to import Node built-ins.

A common friction point: in ESM, relative imports may need file extensions depending on configuration, and a package declares its format with `"type": "module"` in `package.json`. When an import fails with an "ERR_REQUIRE_ESM" or "Cannot use import statement" error, you are almost always looking at a module-format mismatch.

## How TypeScript Runs

TypeScript itself does not run. The classic flow is: `tsc` type-checks and emits JavaScript, then Node runs the JavaScript. Importantly, `tsc` checks types and strips them, but it does not bundle and it does not enforce types at runtime.

In modern development you usually skip the manual build step:

- `tsx` runs a TypeScript file directly for development and scripts.
- `vite` handles TypeScript for frontend projects, with fast dev reload and production bundling.
- Newer runtimes like Deno and Bun execute TypeScript natively.
- Recent Node versions can run TypeScript files directly with type stripping, though `tsc` or a bundler is still the norm for production builds.

The mental model: use a runner or bundler for the dev loop, and use `tsc` (or the bundler's build) to produce the artifact you ship. Keep `tsc --noEmit` in CI as the type-checking gate even when something else does the actual compiling.

## The tsconfig Options That Matter

You do not need to memorize the whole file. These are the ones worth understanding.

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "outDir": "dist"
  }
}
```

- `strict`: turn it on and leave it on. This is the single most important setting.
- `target`: the JavaScript language level to emit. Match it to your runtime.
- `module` and `moduleResolution`: how imports are interpreted. `NodeNext` is the modern choice for Node projects.
- `esModuleInterop`: smooths importing CommonJS packages from ESM. Usually on.
- `skipLibCheck`: skips type-checking of dependency declaration files. Speeds up builds and avoids errors you cannot fix in other people's types.
- `noEmit`: type-check only, when something else compiles.

A good starting point for many projects is to extend a community base config such as the `@tsconfig/node22` style presets rather than writing one from scratch.

## Declaration Files and `@types`

Type information for a library lives either in the package itself or in a separate `@types/<name>` package from DefinitelyTyped. If an import has no types, you often add `npm install -D @types/<name>`. Files ending in `.d.ts` contain types only, no runtime code.

## Quick Self-Test

- What is the difference between ESM and CommonJS, and which do you write today?
- What does `tsc` actually produce, and what does it not do?
- Why keep `tsc --noEmit` in CI even when Vite or tsx runs your code?
- Where do types for an untyped dependency come from?
