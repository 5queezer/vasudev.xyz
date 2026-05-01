---
title: "01 — Modern C++ Mental Model"
description: "Modern C++ is not “C with classes.” It is a language for building efficient systems using explicit ownership, deterministic cleanup, value semantics, and z"
weight: 1
type: "guide"
build:
  list: local
  render: always
---

# 01 — Modern C++ Mental Model

## Core Idea

Modern C++ is not “C with classes.” It is a language for building efficient systems using explicit ownership, deterministic cleanup, value semantics, and zero-cost abstractions.

If you learned C++ around 2008, the biggest shift is this:

> Old C++ often taught manual memory management. Modern C++ teaches ownership and RAII.

## What Changed Since 2008

C++11 changed the language dramatically. C++14, 17, 20, and 23 continued that direction.

Important modern concepts:

- RAII everywhere.
- Prefer values over raw pointers.
- Prefer standard library types over manual memory.
- Use `std::unique_ptr` for exclusive ownership.
- Use `std::shared_ptr` only when ownership is truly shared.
- Understand move semantics.
- Use `auto`, lambdas, range-for, `nullptr`, `enum class`.
- Use CMake, sanitizers, debuggers, and tests.

## Modern Style Priorities

Prefer this:

```cpp
std::vector<std::string> names;
```

Over this:

```cpp
char** names;
```

Prefer this:

```cpp
auto user = std::make_unique<User>("Ada");
```

Over this:

```cpp
User* user = new User("Ada");
delete user;
```

Prefer this:

```cpp
for (const auto& item : items) {
    process(item);
}
```

Over this:

```cpp
for (int i = 0; i < items.size(); ++i) {
    process(items[i]);
}
```

## What Makes C++ Valuable

C++ is valuable because it exposes reality:

- memory layout,
- object lifetime,
- performance,
- concurrency,
- cache behavior,
- resource ownership,
- undefined behavior,
- hardware and OS boundaries.

This is also why it is hard.

## What to Avoid

Avoid writing modern C++ as if it were 1998 C++:

- Avoid owning raw pointers.
- Avoid manual `new` / `delete` in normal code.
- Avoid C arrays when `std::array` or `std::vector` works.
- Avoid unnecessary inheritance.
- Avoid macros when language features work.
- Avoid clever template code before you understand ordinary code.

## Quick Self-Test

You are recovering modern C++ when you can explain:

- Why RAII matters.
- When to use `unique_ptr` vs `shared_ptr`.
- What `std::move` actually does.
- Why `std::vector` is usually the default container.
- Why undefined behavior is dangerous.
- How to build and debug a small C++ project.
