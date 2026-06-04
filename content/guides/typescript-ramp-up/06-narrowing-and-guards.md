---
title: "06 — Narrowing: unknown, any, and Type Guards"
description: "How TypeScript narrows types through control flow, why unknown beats any, and how to write user-defined type guards and assertions."
weight: 6
type: "guide"
build:
  list: local
  render: always
---

# 06 — Narrowing: unknown, any, and Type Guards

Narrowing is how the compiler refines a broad type to a more specific one as it follows your control flow. Getting comfortable here is what makes strict mode pleasant rather than annoying.

## `any` vs `unknown`

`any` opts a value out of type checking entirely. Anything is allowed on it, and it silently infects everything it touches. Avoid it.

`unknown` is the safe top type. You can assign anything to it, but you cannot use it until you narrow it to something specific. This is exactly what you want for external input.

```ts
function parse(input: unknown) {
  // input.toUpperCase();  // error, unknown is not yet a string
  if (typeof input === "string") {
    return input.toUpperCase(); // ok, narrowed to string
  }
  return null;
}
```

Rule of thumb: when you do not yet know a type, reach for `unknown`, then narrow. Reserve `any` for genuine escape hatches and isolate it.

## Control-Flow Narrowing

The compiler narrows automatically based on the checks you write.

```ts
function len(x: string | string[]): number {
  if (typeof x === "string") {
    return x.length;        // x: string here
  }
  return x.length;          // x: string[] here
}
```

Useful narrowing operators:

- `typeof x === "string"` for primitives.
- `Array.isArray(x)` for arrays.
- `x instanceof Date` for class instances.
- `"field" in x` to check for a property.
- `x === null` or `x == null` (the latter also catches `undefined`).

```ts
function getId(x: { id: string } | null): string {
  if (x === null) {
    return "anonymous";
  }
  return x.id; // narrowed to the object type
}
```

## User-Defined Type Guards

When narrowing needs custom logic, write a function whose return type is a type predicate, the `value is Type` form.

```ts
interface Cat {
  meow(): void;
}

function isCat(animal: unknown): animal is Cat {
  return typeof animal === "object"
    && animal !== null
    && "meow" in animal;
}

function handle(animal: unknown) {
  if (isCat(animal)) {
    animal.meow(); // narrowed to Cat
  }
}
```

The `animal is Cat` return type tells the compiler that a `true` result means the argument is a `Cat`. This is how validation libraries and your own helpers teach the compiler about runtime checks. Note that the compiler trusts your predicate. If your check is wrong, the type is wrong, so keep guards honest.

## Assertion Functions

A related form throws instead of returning a boolean. Useful for invariants.

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function use(value: string | null) {
  assert(value !== null, "value must be set");
  return value.toUpperCase(); // value narrowed to string after the assert
}
```

## The Non-Null Assertion, and Why to Avoid It

The postfix `!` operator tells the compiler "trust me, this is not null." It removes `null` and `undefined` from the type without any runtime check.

```ts
const el = document.getElementById("app")!; // claims non-null, unchecked
```

It is occasionally justified, but every `!` is a place you have overruled the compiler. Prefer an actual check or an assertion function. Treat a spreading `!` habit as a smell.

## Quick Self-Test

- Why is `unknown` safer than `any` for external input?
- Name four ways the compiler narrows a union.
- Write a type guard with a `value is Type` predicate.
- What is the risk of the `!` non-null assertion?
