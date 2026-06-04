---
title: "04 — Generics and Constraints"
description: "Generics in TypeScript, constraints with extends, default type parameters, and how inference flows through generic functions."
weight: 4
type: "guide"
build:
  list: local
  render: always
---

# 04 — Generics and Constraints

Generics will feel familiar if you know them from another language. The syntax is close to Java, C#, and Rust. The main differences are structural typing and how aggressively TypeScript infers type arguments for you.

## Basic Generics

A generic function or type takes one or more type parameters.

```ts
function identity<T>(value: T): T {
  return value;
}

const a = identity("hello"); // T inferred as string, a: string
const b = identity(42);      // T inferred as number, b: number
```

You rarely pass type arguments explicitly. Inference usually figures them out from the call.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const x = first([1, 2, 3]); // x: number | undefined
```

Note the return type `T | undefined`. Indexing an array can yield `undefined`, and under strict settings you account for that.

## Constraints with `extends`

A constraint says "T must be at least this shape." It lets you use properties inside the generic body while keeping the function general.

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");        // ok, strings have length
longest([1, 2], [3, 4, 5]);  // ok, arrays have length
// longest(1, 2);            // error, number has no length
```

In `T extends Bar`, `extends` means "assignable to," not class inheritance. It is a structural bound.

## Constraining to Keys

`keyof` produces a union of an object's property names. Combined with a constraint, it gives you a type-safe property accessor, a classic example:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "1", age: 30 };
const age = getProp(user, "age"); // age: number
// getProp(user, "missing");      // error, not a key of user
```

`T[K]` is an indexed access type. It is the type of the property named `K` on `T`. This trio of `keyof`, a `K extends keyof T` constraint, and `T[K]` is one of the most common generic patterns you will read and write.

## Default Type Parameters

Type parameters can have defaults, useful for configurable containers and API clients.

```ts
interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

const r1: ApiResponse = { status: 200, body: "anything" };       // T is unknown
const r2: ApiResponse<{ id: string }> = { status: 200, body: { id: "1" } };
```

## When Not to Reach for Generics

Generics are for code that is genuinely parametric over a type. If a function only ever takes one concrete type, do not make it generic. Overusing generics produces signatures that are hard to read for no benefit. A single concrete union is often clearer than a generic with three constraints.

## Quick Self-Test

- What does `extends` mean in a generic constraint?
- Write the type-safe `getProp` signature from memory.
- What does `keyof T` produce, and what is `T[K]`?
- When should a function not be generic?
