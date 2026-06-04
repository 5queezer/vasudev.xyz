---
title: "Guía de introducción a TypeScript"
description: "Unavía rápida y sólida hacia TypeScript moderno para ingenieros senior que ya construyen sistemas en otros lenguajes."
date: 2026-06-04
guideTags: ["typescript", "backend", "frontend"]
type: "guide"
build:
  list: local
  render: always
translationHash: "20bf5a9bd1340cfa53d09954c8334004"
---


# TypeScript Ramp-Up Guide

A compact guide for senior engineers who already build production systems in other languages and now need TypeScript quickly.

If you have shipped services in Rust, Go, Python, Java, or C#, the gap is not software engineering. Async, API design, architecture, testing, data modeling, and observability transfer directly. The gap is the TypeScript type system and its ecosystem, and that part is learnable in days, not months.

## How to Use This Guide

Read the pages in order. You can skim anything that maps cleanly onto a language you know and slow down on the parts that do not. For each topic, aim to answer:

1. What problem does this feature solve?
2. What does idiomatic TypeScript prefer?
3. Where does it differ from the languages I already know?
4. Can I write a tiny example from memory?

## What Is Genuinely New

For an experienced engineer, only a few things are actually new:

- TypeScript types are erased at runtime. The type system is a compile-time layer over JavaScript, not a runtime guarantee.
- The type system is structural, not nominal. Compatibility is based on shape, not declared inheritance.
- The type system is unusually expressive. Discriminated unions, generics, mapped types, and conditional types let you encode real constraints.
- The runtime is JavaScript, with single-threaded event-loop concurrency and one error model.

Everything else is ecosystem familiarity.

## Recommended Path

### Phase 1 — The Type System

1. [Mental Model: What TypeScript Is and Is Not](01-mental-model.md)
2. [The Type System Core](02-type-system-core.md)
3. [Discriminated Unions and Exhaustiveness](03-discriminated-unions.md)
4. [Generics and Constraints](04-generics-and-constraints.md)
5. [Mapped, Conditional, and Utility Types](05-mapped-conditional-utility-types.md)
6. [Narrowing: unknown, any, and Type Guards](06-narrowing-and-guards.md)

### Phase 2 — Language and Runtime

7. [Async and Concurrency](07-async-and-concurrency.md)
8. [Modules, tsconfig, and the Build Story](08-modules-and-tsconfig.md)

### Phase 3 — Backend TypeScript

9. [Backend Stack: Node, Hono or Fastify, Drizzle, Postgres](09-backend-stack.md)
10. [Validation at the Boundary with Zod](10-validation-with-zod.md)

### Phase 4 — Frontend TypeScript

11. [Frontend: React and TanStack](11-frontend-react-tanstack.md)

### Phase 5 — Ship and Interview

12. [Tooling and Testing](12-tooling-and-testing.md)
13. [Capstone Project and Interview Framing](13-capstone-and-interview.md)
14. [Grounding and References](14-grounding-and-references.md)

## Fastest Practical Plan

A focused two-week sprint is enough to interview well if the rest of your portfolio is strong.

- Week 1: the type system. Work through phases 1 and 2 and write small examples until the syntax stops surprising you.
- Week 2: build one full-stack project end to end (phases 3 and 4) and wire up the tooling.

## Default Target Stack

If you do not know where to start, aim for this combination:

**TypeScript (strict) + Node.js + Hono + Drizzle ORM + PostgreSQL + Zod + Vitest, and React + TanStack Query and Router on the frontend.**

It is modern, widely used, and maps cleanly onto patterns you already know from other backends.

## Grounding

This is a ramp-up guide, not a replacement for the official documentation. The pure-TypeScript examples in this guide were type-checked under `strict` mode. For authoritative references and verification notes, see [Grounding and References](14-grounding-and-references.md).
