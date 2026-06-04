---
title: "13 — Capstone Project and Interview Framing"
description: "One full-stack project that exercises the whole stack, plus how a senior engineer from another ecosystem should frame their TypeScript readiness."
weight: 13
type: "guide"
build:
  list: local
  render: always
---

# 13 — Capstone Project and Interview Framing

The fastest way to consolidate everything in this guide is to build one project that touches every layer, then frame your existing experience honestly.

## Build One Full-Stack Project

Pick a domain you already understand so you spend your effort on TypeScript, not on the problem space. A job-search tracker, a personal CRM, an issue tracker, or a reading list all work. Build it with the default stack:

**React with TanStack Query and Router, TypeScript in strict mode, Hono for the API, PostgreSQL with Drizzle, Zod for validation, and Vitest for tests.**

Aim for a feature set that forces each pattern to appear:

1. A handful of related entities, so you model relations in Drizzle.
2. Create and update flows, so you write mutations and optimistic updates.
3. A list view with pagination or filtering, so you key queries correctly.
4. Validated request bodies and a validated environment config, so Zod is load-bearing.
5. A board or status field, so you use a discriminated union for state.
6. A test suite and a green `tsc --noEmit` in CI.

The goal is not a polished product. It is to have written, with your own hands, the patterns from every page of this guide. After one such project, the syntax stops being the thing you think about.

## How to Frame Your Background

If you already build production systems in other languages, the honest framing is that you are a senior engineer adding a language, not a beginner. The transferable skills are the expensive ones to acquire: async programming, API design, architecture, testing, data modeling, observability, and communication. Those do not reset when you change languages. What you are adding is the TypeScript type system and ecosystem familiarity, which is a matter of days to weeks, not years.

In an interview for a senior TypeScript role, prior depth in systems work, infrastructure, protocol or security work, and shipping real software usually weighs more than whether you can recall the exact syntax of an advanced conditional type. That syntax is learnable in a weekend. Judgment is not.

Two practical points follow from this. First, do not undersell yourself by positioning your experience as narrower than it is. If your portfolio looks like backend and platform engineering, present yourself that way rather than defaulting to a more junior framing. Second, be ready to back the framing with substance: speak fluently about the type-system patterns in this guide, and have the capstone project to point to. Confidence plus a working artifact is far more convincing than either alone.

## What to Be Able to Discuss

Going into an interview, make sure you can speak naturally about:

- Why types are erased and why you still validate at boundaries.
- Discriminated unions and exhaustiveness, with a real example.
- Generics with constraints, and when not to use them.
- The async model and the common floating-promise bug.
- Server state versus client state, and TanStack Query's caching and invalidation.
- Your tooling: strict mode, the type-check gate, linting, and tests.

If those are second nature and your broader engineering experience is real, you are ready.

## Quick Self-Test

- Does your capstone exercise every pattern in this guide?
- Can you explain why your prior experience transfers to a senior TypeScript role?
- Can you discuss each item in the list above without notes?
