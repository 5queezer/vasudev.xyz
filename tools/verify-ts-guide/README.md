# verify-ts-guide

Type-checks the pure-TypeScript examples used in the
[TypeScript Ramp-Up Guide](../../content/guides/typescript-ramp-up/).

Each `chNN.ts` file contains the language examples from the matching guide
page (chapters 01 through 07, the type-system and runtime chapters). They are
compiled under `strict` mode with no emit. The framework-specific examples
(Hono, Drizzle, Zod, React, TanStack, Vitest) are not included here because
they require external dependencies, and the guide marks them as illustrative.

Intentional-error examples use `// @ts-expect-error`. The compiler fails if the
following line does **not** produce an error, so the negative cases are verified
just as strictly as the positive ones.

## Run it

```bash
cd tools/verify-ts-guide
tsc --noEmit -p tsconfig.json
```

A clean exit means every example type-checks as the guide claims.

## Verified with

TypeScript 6.0.2, `strict: true`, `target: ES2022`, `module: NodeNext`,
`lib: ["ES2022", "DOM"]`.
