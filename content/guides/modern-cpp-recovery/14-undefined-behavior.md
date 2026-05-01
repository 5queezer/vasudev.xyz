---
title: "14 — Undefined Behavior and Memory Safety"
description: "Undefined behavior means the C++ standard places no requirements on what happens. The program may appear to work, crash, corrupt data, or become vulnerable"
weight: 14
type: "guide"
build:
  list: local
  render: always
---

# 14 — Undefined Behavior and Memory Safety

## Core Idea

Undefined behavior means the C++ standard places no requirements on what happens. The program may appear to work, crash, corrupt data, or become vulnerable.

## Common Undefined Behavior

### Use After Free

```cpp
int* p = new int(42);
delete p;
std::cout << *p; // UB
```

### Dangling Reference

```cpp
const std::string& bad() {
    std::string s = "hello";
    return s; // UB when used
}
```

### Out-of-Bounds Access

```cpp
std::vector<int> v = {1, 2, 3};
std::cout << v[10]; // UB
```

Use `.at()` when you want bounds checking:

```cpp
v.at(10); // throws
```

### Uninitialized Variables

```cpp
int x;
std::cout << x; // invalid: do not read uninitialized automatic objects
```

In pre-C++26 wording this is usually described as reading an indeterminate value; C++26 refines the terminology around indeterminate and erroneous values. The practical rule is unchanged: initialize before reading.

### Signed Integer Overflow

```cpp
int x = INT_MAX;
++x; // UB
```

### Data Races

A data race is undefined behavior: two conflicting evaluations access the same memory concurrently, at least one modifies it, and there is no happens-before relationship between them.

## Iterator Invalidation

```cpp
std::vector<int> v = {1, 2, 3};
auto it = v.begin();
v.push_back(4); // may invalidate it
std::cout << *it; // maybe UB
```

## Strict Aliasing and Casts

Unsafe casts can break assumptions the compiler relies on.

Avoid clever pointer reinterpretation unless you really know what you are doing.

## Why UB Is Dangerous

Compilers optimize under the assumption that UB does not happen. This means UB can produce surprising behavior in optimized builds.

## Tools to Catch UB

Use sanitizers:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Thread sanitizer:

```bash
-fsanitize=thread
```

Also use:

- warnings: `-Wall -Wextra -Wpedantic`,
- static analysis: `clang-tidy`,
- debuggers: `gdb`, `lldb`,
- Valgrind where useful.

## Safety Habits

- Prefer RAII.
- Prefer standard containers.
- Avoid raw owning pointers.
- Initialize variables.
- Use references only when lifetimes are clear.
- Avoid unchecked indexing if data is external.
- Use sanitizers in development.

## Quick Self-Test

You should be able to answer:

- What does undefined behavior mean?
- Why can UB appear only in optimized builds?
- What is a dangling reference?
- Why can `vector::push_back` invalidate references?
- Which sanitizers should you enable first?
