---
title: "03 — Discriminated Unions and Exhaustiveness"
description: "Discriminated unions are how idiomatic TypeScript models state, results, and events, with the compiler enforcing that you handle every case."
weight: 3
type: "guide"
build:
  list: local
  render: always
---

# 03 — Discriminated Unions and Exhaustiveness

If you know Rust enums or sum types from a functional language, this will feel familiar. Discriminated unions are the most important modeling tool in TypeScript, and they are where the type system earns its keep.

## The Pattern

A discriminated union is a union of object types that share a common literal field, the discriminant. The compiler uses that field to narrow the type inside a `switch` or `if`.

```ts
type Result =
  | { kind: "ok"; value: number }
  | { kind: "error"; message: string };

function handle(r: Result): string {
  switch (r.kind) {
    case "ok":
      return `value is ${r.value}`;   // here r is the "ok" variant
    case "error":
      return `failed: ${r.message}`;  // here r is the "error" variant
  }
}
```

Inside `case "ok"`, TypeScript knows `r.value` exists and `r.message` does not. The discriminant field (`kind` here, any name works) is what makes the narrowing possible.

## Modeling Async State

This pattern replaces scattered boolean flags like `isLoading`, `isError`, and `data`. Instead of four booleans that can contradict each other, model the states that actually exist:

```ts
type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

Now an impossible state like "loading and also has data and also errored" cannot be represented. This is the same discipline as modeling state machines, expressed in types.

## Exhaustiveness Checking

You want the compiler to fail the build when you add a new variant and forget to handle it. The idiom is a `never` assertion in the default branch:

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "square":
      return s.side ** 2;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

If you later add `{ kind: "triangle"; base: number; height: number }` to `Shape` and do not add a case, the assignment to `never` fails to compile. The compiler points you at every place that needs updating. This is one of the highest-value patterns in the language. Use it for any union you switch over.

## Why This Matters in Interviews

Reaching for a discriminated union with exhaustiveness checking signals that you think in terms of making illegal states unrepresentable. It is concrete evidence of type-system fluency, and it is the kind of thing a senior TypeScript reviewer looks for.

## Quick Self-Test

- What makes a union "discriminated" rather than a plain union?
- How does narrowing work inside a `switch` on the discriminant?
- How does the `never` assignment force you to handle every case?
- Why is modeling async state as a union better than three booleans?
