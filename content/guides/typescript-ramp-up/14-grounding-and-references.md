---
title: "14 — Grounding and References"
description: "Authoritative references used to ground the TypeScript Ramp-Up Guide, plus how the pure-TypeScript examples were verified."
weight: 14
type: "guide"
build:
  list: local
  render: always
---

# 14 — Grounding and References

This guide is intentionally compact, so it omits many edge cases and does not pin library versions, because the ecosystem moves quickly. Use these references for the precise and current details.

## TypeScript Language

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — the official language guide.
- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Type Manipulation: keyof, mapped, conditional, infer, template literals](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [tsconfig reference](https://www.typescriptlang.org/tsconfig/)
- [Modules](https://www.typescriptlang.org/docs/handbook/2/modules.html)

## JavaScript Runtime and Async

- [MDN: Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Node.js: The event loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js: worker_threads](https://nodejs.org/api/worker_threads.html)
- [Node.js: ECMAScript modules](https://nodejs.org/api/esm.html)

## Backend Libraries

- [Hono](https://hono.dev/)
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Prisma](https://www.prisma.io/docs)
- [node-postgres (pg)](https://node-postgres.com/)
- [BullMQ](https://docs.bullmq.io/)

## Validation

- [Zod](https://zod.dev/)

## Frontend

- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Table](https://tanstack.com/table/latest)

## Tooling and Testing

- [typescript-eslint](https://typescript-eslint.io/)
- [Prettier](https://prettier.io/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)
- [tsx](https://tsx.is/)
- [Vite](https://vite.dev/)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)

## Example Verification

The pure-TypeScript examples in this guide (the type-system and runtime chapters, 01 through 07) were extracted into a small harness in the repository:

```text
tools/verify-ts-guide/
```

Every example type-checks under `strict` mode with no emit. The intentional-error examples use `// @ts-expect-error`, which the compiler validates by requiring the following line to actually fail, so the negative cases are checked as strictly as the positive ones.

Run it locally with:

```bash
cd tools/verify-ts-guide
tsc --noEmit -p tsconfig.json
```

The examples were checked with TypeScript 6.0.2 under `target: ES2022`, `module: NodeNext`, and `lib: ["ES2022", "DOM"]`.

## Accuracy Notes

- The framework examples (Hono, Fastify, Drizzle, Zod, React, TanStack, Vitest) are illustrative of each library's shape and are not version-pinned or included in the verification harness, because their APIs evolve. Confirm exact signatures against the official docs above.
- Library choices in this guide are mainstream defaults, not the only valid options. Express, Prisma, and Jest remain common and are worth recognizing.
- TypeScript is a moving target. Specific compiler defaults, the set of utility types, and runtime support for executing TypeScript directly change between releases. Treat the official handbook and each library's docs as the current source of truth.
