---
title: "02 — The Type System Core"
description: "type aliases, interfaces, unions, intersections, literals, and the everyday vocabulary you use to describe data in TypeScript."
weight: 2
type: "guide"
build:
  list: local
  render: always
---

# 02 — The Type System Core

This is the daily vocabulary. Master these and most TypeScript code becomes readable.

## Primitives and Inference

The primitive types are `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, and `undefined`. There is no `int` or `float`. All numbers are `number`. Arbitrary-precision integers use `bigint`.

Let the compiler infer when the type is obvious. Annotate function parameters, return types of public functions, and anything ambiguous.

```ts
const count = 3;          // inferred as number
const name = "Ada";       // inferred as string
let items: string[] = []; // annotate, otherwise inferred as any[] in some cases
```

## `type` vs `interface`

Both name a type. The practical guidance:

- Use `interface` for object shapes you expect to be implemented or extended, especially public API surfaces. Interfaces support declaration merging and `extends`.
- Use `type` for everything else: unions, intersections, tuples, function types, mapped types, and aliases of primitives.

```ts
interface User {
  id: string;
  email: string;
}

type Id = string;
type Handler = (event: string) => void;
type Pair = [number, number];
```

For a plain object shape, the two are nearly interchangeable. Pick one convention per codebase. A common default is `interface` for objects and `type` for unions and composed types.

## Union Types

A union means "one of these." This is the workhorse of TypeScript modeling.

```ts
type Status = "active" | "suspended" | "deleted";

function setStatus(s: Status) {
  // s can only be one of the three strings
}
```

Those quoted strings are literal types. A literal type is a single exact value used as a type. Unions of string literals replace most enums in idiomatic TypeScript.

Unions also model optionality and failure:

```ts
type MaybeUser = User | null;
type Parsed = { ok: true; value: number } | { ok: false; error: string };
```

The second form is a discriminated union, covered next.

## Intersection Types

An intersection means "all of these at once." It combines object types.

```ts
type Timestamps = { createdAt: Date; updatedAt: Date };
type UserRow = User & Timestamps;
// UserRow has id, email, createdAt, and updatedAt
```

Intersections are mostly useful for composing object shapes. Intersecting incompatible primitives produces `never`, the empty type.

## Arrays, Tuples, and Readonly

```ts
const ids: string[] = ["a", "b"];        // array
const point: [number, number] = [1, 2];  // fixed-length tuple
const frozen: readonly number[] = [1, 2]; // cannot be mutated through this reference
```

`readonly` is compile-time only. It prevents mutation through that reference but does not freeze the object at runtime.

## Optional and Nullable

```ts
interface Config {
  host: string;
  port?: number; // optional: number | undefined
}
```

An optional property may be missing. A nullable property is present but can hold `null`. They are different. With `strictNullChecks`, the compiler tracks both and forces you to handle the absent case before use.

## `enum` and Why Unions Often Win

TypeScript has `enum`, but it is one of the few features that emits runtime code rather than being erased. Many teams prefer string-literal unions or `as const` objects because they are simpler and fully erasable:

```ts
const Role = {
  Admin: "admin",
  User: "user",
} as const;

type Role = (typeof Role)[keyof typeof Role]; // "admin" | "user"
```

Use `enum` if your team already standardizes on it. Otherwise, literal unions are the lighter default.

## Quick Self-Test

- When would you reach for `interface` over `type`?
- How do you model "a value that is one of three known states"?
- What is the difference between an optional property and a nullable one?
- Why do many codebases avoid `enum`?
