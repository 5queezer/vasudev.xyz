---
title: "19 — Quick Checklist"
description: "Use this as a fast self-assessment."
weight: 19
type: "guide"
build:
  list: local
  render: always
---

# 19 — Quick Checklist

Use this as a fast self-assessment.

## Modern C++ Core

- [ ] I understand stack vs heap lifetime.
- [ ] I can explain RAII.
- [ ] I avoid manual `new` and `delete` in normal code.
- [ ] I know when to use `unique_ptr`.
- [ ] I know when not to use `shared_ptr`.
- [ ] I understand raw pointers as non-owning views.
- [ ] I understand references vs pointers.
- [ ] I can explain const correctness.

## Move and Value Semantics

- [ ] I know what `std::move` actually does.
- [ ] I know what a moved-from object means.
- [ ] I understand copy constructor and copy assignment.
- [ ] I understand move constructor and move assignment.
- [ ] I know Rule of 0, Rule of 3, Rule of 5.
- [ ] I prefer value semantics when possible.

## STL

- [ ] I use `std::vector` as the default sequence container.
- [ ] I know `map` vs `unordered_map`.
- [ ] I know `set` vs `unordered_set`.
- [ ] I understand iterator invalidation.
- [ ] I can use `sort`, `find`, `count`, `transform`, `remove_if`.
- [ ] I can write lambdas for algorithms.

## Modern Syntax

- [ ] I use `auto` appropriately.
- [ ] I use range-based `for`.
- [ ] I use lambdas.
- [ ] I use `nullptr`.
- [ ] I use `enum class`.
- [ ] I understand `constexpr` basics.
- [ ] I can read structured bindings.

## Modern Library Types

- [ ] I know when to use `optional`.
- [ ] I know when to use `variant`.
- [ ] I understand `string_view` lifetime risks.
- [ ] I understand `span` as a non-owning view.
- [ ] I can use `filesystem`.
- [ ] I can use `chrono` durations.

## Templates

- [ ] I can write a function template.
- [ ] I can write a simple class template.
- [ ] I understand template instantiation.
- [ ] I can read basic concept-constrained templates.

## Error Handling

- [ ] I understand exceptions.
- [ ] I understand exception safety basics.
- [ ] I know why destructors should not throw.
- [ ] I know when `optional` is not enough.
- [ ] I know some domains avoid exceptions.

## Concurrency

- [ ] I can create and join a thread.
- [ ] I know what a data race is.
- [ ] I can use `mutex` and `lock_guard`.
- [ ] I understand condition variables at a basic level.
- [ ] I understand atomics at a basic level.
- [ ] I know what deadlock is.

## Safety and Performance

- [ ] I know common undefined behavior cases.
- [ ] I use sanitizers.
- [ ] I understand cache locality basics.
- [ ] I know why heap allocation can be expensive.
- [ ] I profile before optimizing.
- [ ] I understand `reserve`.

## Tooling

- [ ] I can build with CMake.
- [ ] I can debug with gdb/lldb.
- [ ] I can enable AddressSanitizer and UBSan.
- [ ] I can format code with clang-format.
- [ ] I can run basic tests with Catch2 or GoogleTest.

## Portfolio

- [ ] I have one serious C++ project.
- [ ] It has a README.
- [ ] It has tests.
- [ ] It uses CMake.
- [ ] It has sanitizer instructions.
- [ ] It demonstrates a domain, not just syntax.
