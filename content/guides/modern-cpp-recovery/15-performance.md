---
title: "15 — Performance Fundamentals"
description: "C++ gives you control over performance, but you must measure. Guessing is unreliable."
weight: 15
type: "guide"
build:
  list: local
  render: always
---

# 15 — Performance Fundamentals

## Core Idea

C++ gives you control over performance, but you must measure. Guessing is unreliable.

## Measure First

Use profilers before optimizing.

Tools:

- `perf` on Linux,
- Instruments on macOS,
- Visual Studio Profiler on Windows,
- `valgrind/callgrind`,
- compiler reports,
- benchmarks with Google Benchmark.

## Big-O Still Matters

An `O(n log n)` algorithm usually beats `O(n^2)` at scale.

But constant factors, memory layout, and cache behavior also matter.

## Cache Locality

Contiguous memory is fast.

```cpp
std::vector<User> users;
```

Usually better than:

```cpp
std::vector<std::unique_ptr<User>> users;
```

Unless you need polymorphism, stable addresses, or independent ownership.

## Allocation Costs

Heap allocation is relatively expensive.

Avoid unnecessary allocation in hot loops.

Bad:

```cpp
for (int i = 0; i < 10; ++i) {
    auto p = std::make_unique<Item>();
}
```

Maybe better:

```cpp
std::vector<Item> items;
items.reserve(10);
```

## Avoid Unnecessary Copies

Use references for large read-only objects.

```cpp
void process(const std::vector<int>& values);
```

Use move semantics when transferring ownership.

```cpp
class Holder {
    std::vector<int> data_;
public:
    void set(std::vector<int> data) {
        this->data_ = std::move(data);
    }
};
```

## `reserve`

If you know the size, reserve capacity.

```cpp
std::vector<int> v;
v.reserve(1000);
```

## Branching and Layout

Hot code can be affected by:

- branch prediction,
- cache misses,
- false sharing,
- memory alignment,
- virtual calls,
- allocation patterns.

Do not optimize these blindly. Measure.

## Compiler Optimization

Common flags:

```bash
-O0  # no optimization, debugging
-O2  # good production default
-O3  # more aggressive, not always better
-g   # debug symbols
```

## Performance Mindset

Good performance often comes from:

- better algorithms,
- better data layout,
- fewer allocations,
- fewer copies,
- simpler ownership,
- batching work,
- using the right container.

## Quick Self-Test

You should be able to answer:

- Why is `vector` cache-friendly?
- Why can heap allocation hurt hot paths?
- What does `reserve` do?
- Why should you profile before optimizing?
- What is false sharing?
