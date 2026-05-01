---
title: "Modern C++ Recovery Guide"
description: "A compact recovery path for returning to C++17/20 after learning pre-modern C++."
date: 2026-04-27
guideTags: ["c++", "systems", "recovery"]
type: "guide"
build:
  list: local
  render: always
---

# Modern C++ Recovery Guide

A quick, practical wiki for someone who learned C++ around 2008 and wants to recover quickly into modern C++17/20.

## How to Use This Wiki

Go through the pages in order. Do not try to memorize everything. For each topic, aim to understand:

1. What problem does this solve?
2. What does modern C++ prefer?
3. What are the common failure modes?
4. Can I write a tiny example from memory?

## Recommended Path

### Phase 1 — Rebuild the Core

1. [Mental Model: Modern C++](01-modern-cpp-mental-model.md)
2. [Compilation, Linking, and Project Shape](02-compilation-linking.md)
3. [Object Lifetime, Stack, Heap, and RAII](03-lifetime-raii.md)
4. [Ownership, Raw Pointers, and Smart Pointers](04-ownership-smart-pointers.md)
5. [Value Semantics and Rule of 0/3/5](05-value-semantics-rule-of-0-3-5.md)

### Phase 2 — Modern Language Features

6. [Move Semantics](06-move-semantics.md)
7. [Const, References, and Parameter Passing](07-const-references-parameters.md)
8. [STL Containers and Algorithms](08-stl-containers-algorithms.md)
9. [Modern Syntax: auto, Lambdas, enum class, constexpr](09-modern-syntax.md)
10. [Optional, Variant, String View, Span, Filesystem, Chrono](10-modern-library-types.md)
11. [Templates and Generic Programming](11-templates-generic-programming.md)

### Phase 3 — Serious C++

12. [Error Handling and Exception Safety](12-error-handling.md)
13. [Concurrency: Threads, Mutexes, Atomics](13-concurrency.md)
14. [Undefined Behavior and Memory Safety](14-undefined-behavior.md)
15. [Performance Fundamentals](15-performance.md)
16. [Tooling: CMake, Debuggers, Sanitizers, Testing](16-tooling.md)

### Phase 4 — Pick a Domain

17. [Domain Tracks](17-domain-tracks.md)
18. [Project Ideas](18-project-ideas.md)
19. [Quick Checklist](19-quick-checklist.md)
20. [Grounding and References](20-grounding-and-references.md)

## Fastest Practical Plan

If you want a 30-day sprint:

- Week 1: RAII, ownership, smart pointers, value semantics.
- Week 2: move semantics, STL, lambdas, modern syntax.
- Week 3: CMake, debugging, sanitizers, tests, concurrency basics.
- Week 4: build one serious project.

## Default Target Stack

If you do not know where to start, aim for:

**C++17/20 + Linux + CMake + gdb/lldb + sanitizers + GoogleTest/Catch2 + Python for automation.**

That combination gives you a durable technical foundation and keeps you productive.

## Grounding

This is a quick recovery guide, not a substitute for the standard or a full textbook. For authoritative references and version notes, see [Grounding and References](20-grounding-and-references.md).
