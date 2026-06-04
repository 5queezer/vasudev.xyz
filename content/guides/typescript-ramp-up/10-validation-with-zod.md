---
title: "10 — Validation at the Boundary with Zod"
description: "Because types are erased at runtime, you validate external input with a schema library. Zod is the common choice and bridges runtime checks back into types."
weight: 10
type: "guide"
build:
  list: local
  render: always
---

# 10 — Validation at the Boundary with Zod

This page closes the loop opened on the first page. Types are erased at runtime, so a value arriving from the network, a request body, an environment variable, or `JSON.parse` cannot be trusted just because a type annotation says what it should be. You validate it. Zod is the most common library for this, and its key trick is that one schema gives you both the runtime check and the static type.

## The Problem It Solves

```ts
const data = JSON.parse(rawBody) as User; // a lie, not a guarantee
```

The `as User` assertion tells the compiler to stop checking. It does nothing at runtime. If `rawBody` is malformed, you have an invalid `User` masquerading as a valid one, and the failure surfaces somewhere far away. Validation replaces the assertion with an actual check.

## Defining a Schema

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0),
  role: z.enum(["admin", "user"]),
});
```

## Deriving the Type From the Schema

Instead of writing a separate `interface User` and keeping it in sync, you infer the type from the schema. One source of truth.

```ts
type User = z.infer<typeof UserSchema>;
// User is { id: string; email: string; age: number; role: "admin" | "user" }
```

This is the pattern that makes Zod worth it. The schema and the type can never drift, because the type is derived from the schema.

## Parsing Input

```ts
// Throws a ZodError if invalid.
const user = UserSchema.parse(rawInput);

// Returns a discriminated result instead of throwing.
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  // result.data is a fully typed User
} else {
  // result.error describes what failed
}
```

After a successful parse, the value is both validated at runtime and correctly typed at compile time. The `unknown` input has become a known `User` through an honest check, not an assertion. Note that `safeParse` returns a discriminated union, the exact pattern from [Discriminated Unions](03-discriminated-unions.md).

## Where to Validate

Validate at the edges of your system:

- Incoming HTTP request bodies, query parameters, and route parameters.
- Environment variables at startup, so a misconfigured deployment fails loudly and early.
- Responses from third-party APIs you do not control.
- Anything from `JSON.parse` or a file.

Inside your own validated core, you trust the types. You do not re-validate data that has already crossed a checked boundary. This is the same trust-boundary discipline you apply in any language, expressed with one tool.

## Framework Integration

Both Hono and Fastify integrate schema validation into routing, so a request can be validated and typed before your handler runs. Fastify supports JSON Schema natively and works with Zod through adapters. Hono has middleware for Zod validation. The result is the same: by the time your handler executes, the input is validated and typed.

## Quick Self-Test

- Why is `JSON.parse(x) as User` unsafe?
- How does `z.infer` keep your type and your validation in sync?
- What is the difference between `parse` and `safeParse`?
- Which boundaries in a service should validate input?
