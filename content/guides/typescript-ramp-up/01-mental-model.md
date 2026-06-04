---
title: "01 — Mental Model: What TypeScript Is and Is Not"
description: "TypeScript is a structural, erasable type layer over JavaScript. Understanding what survives to runtime is the single most important shift for an experienced engineer."
weight: 1
type: "guide"
build:
  list: local
  render: always
---

# 01 — Mental Model: What TypeScript Is and Is Not

## Core Idea

TypeScript is JavaScript with a static type system bolted on at compile time. The compiler checks your types and then erases them. The program that runs is plain JavaScript.

If you come from a language where types exist at runtime, this is the biggest adjustment:

> Types are a compile-time tool for catching mistakes and describing intent. They are not present when your code executes.

## Types Are Erased

This compiles, and at runtime the type annotations are simply gone:

```ts
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

There is no reflection over `string` at runtime. You cannot ask "is this value of type `User`" by consulting the type system, because the type does not exist once the code runs. You check shapes at runtime yourself, usually with a validation library at the edges of your program (see [Validation at the Boundary with Zod](10-validation-with-zod.md)).

This is why you cannot trust a value just because its type says it is a `User`. If it came from the network, a file, or `JSON.parse`, the type is a claim, not a guarantee. Validate untrusted input.

## The Type System Is Structural

TypeScript uses structural typing. Two types are compatible if their shapes are compatible, regardless of their names or declared relationships.

```ts
interface Point {
  x: number;
  y: number;
}

function printPoint(p: Point) {
  console.log(p.x, p.y);
}

// No "implements Point" needed. The shape matches, so this is accepted.
const location = { x: 1, y: 2, label: "home" };
printPoint(location);
```

If you come from Java or C#, this is the surprise. There is no `implements` requirement for plain compatibility. A value fits a type when it has the right shape.

## `strict` Is the Real Language

Always develop with `strict` mode on. Without it, `null` and `undefined` slip into every type and the compiler stops protecting you. The interesting, useful version of TypeScript is the strict one. Every example in this guide assumes:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

The most important flag inside `strict` is `strictNullChecks`. With it on, `string` does not include `null` or `undefined`. You must say `string | null` if a value can be absent, and the compiler forces you to handle the absent case.

## What Transfers From Your Other Languages

You already have the hard parts. Async programming, API design, layering, testing, data modeling, and observability all transfer. What you are learning here is:

- how to describe data with the type system,
- how the JavaScript runtime behaves,
- which libraries the ecosystem reaches for.

## What to Avoid Early

- Avoid `any`. It disables type checking for that value and spreads silently. Prefer `unknown` when you genuinely do not know a type yet (see [Narrowing](06-narrowing-and-guards.md)).
- Avoid treating types as runtime guarantees. Validate at the boundary.
- Avoid clever type-level programming before ordinary types feel natural.
- Avoid disabling `strict` to make errors go away.

## Quick Self-Test

You have the mental model when you can explain:

- Why a TypeScript type cannot be inspected at runtime.
- Why a plain object literal can satisfy an `interface` with no `implements`.
- Why you still need runtime validation for external input.
- What `strictNullChecks` changes about the `string` type.
