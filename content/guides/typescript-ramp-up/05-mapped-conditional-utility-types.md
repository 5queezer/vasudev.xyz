---
title: "05 — Mapped, Conditional, and Utility Types"
description: "The type-level toolkit: built-in utility types, how mapped types build them, and conditional types with infer for the cases the utilities do not cover."
weight: 5
type: "guide"
build:
  list: local
  render: always
---

# 05 — Mapped, Conditional, and Utility Types

This is the part that looks intimidating from the outside and is mostly a small set of patterns once you see them. You will use the built-in utility types daily and write your own mapped or conditional types occasionally.

## Built-In Utility Types You Will Actually Use

These ship with TypeScript. Learn these four first.

```ts
interface User {
  id: string;
  email: string;
  name: string;
}

type PartialUser = Partial<User>;        // all properties optional
type UserPreview = Pick<User, "id" | "name">; // only id and name
type UserWithoutId = Omit<User, "id">;   // every property except id
type UsersById = Record<string, User>;   // { [key: string]: User }
```

- `Partial<T>` makes every property optional. Common for update payloads.
- `Pick<T, K>` keeps only the named keys.
- `Omit<T, K>` removes the named keys.
- `Record<K, V>` builds an object type with keys `K` and values `V`.

Other common ones: `Required<T>`, `Readonly<T>`, `ReturnType<T>`, `Parameters<T>`, `Awaited<T>`, `NonNullable<T>`. Reach for a utility type before writing your own. They cover most needs.

## Mapped Types

A mapped type transforms each property of an existing type. This is how `Partial` and `Readonly` are implemented internally, and you can write your own.

```ts
type Optional<T> = {
  [K in keyof T]?: T[K];
};
// Optional<User> is the same as Partial<User>
```

`[K in keyof T]` iterates the keys. `T[K]` is the value type for each key. Add modifiers like `?` (optional) or `readonly`, or remove them with `-?` and `-readonly`.

```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

A practical example, making selected fields nullable:

```ts
type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};
```

## Conditional Types

A conditional type chooses between two types based on a relationship. The syntax mirrors a ternary.

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
```

The real power comes with `infer`, which captures a type from within a match. This is how `ReturnType` works:

```ts
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R = MyReturnType<() => number>; // number
```

`infer R` says "whatever the return type is, bind it to `R` and use it." You will read `infer` more often than you write it, but recognizing it removes the mystery from advanced library types.

## Template Literal Types

String literal types can be composed like template strings, useful for typed event names and routes.

```ts
type Event = "click" | "hover";
type Handler = `on${Capitalize<Event>}`; // "onClick" | "onHover"
```

## How Deep to Go

For most senior interviews and most real code, you need fluency with the built-in utilities, comfort reading mapped and conditional types, and the ability to write a simple mapped type. Deep type-level metaprogramming is a specialty. Knowing it exists and being able to read it is enough to start. Do not let the most extreme examples make you think this is the daily experience. It is not.

## Quick Self-Test

- What do `Partial`, `Pick`, `Omit`, and `Record` each do?
- Write a mapped type that makes every property `readonly`.
- What does `infer` do in a conditional type?
- When should you use a built-in utility instead of writing your own type?
