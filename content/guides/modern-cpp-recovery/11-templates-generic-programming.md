---
title: "11 — Templates and Generic Programming"
description: "Templates let you write code that works with many types while still being compiled into efficient type-specific code."
weight: 11
type: "guide"
build:
  list: local
  render: always
---

# 11 — Templates and Generic Programming

## Core Idea

Templates let you write code that works with many types while still being compiled into efficient type-specific code.

## Function Templates

```cpp
template <typename T>
T max_value(T a, T b) {
    return a < b ? b : a;
}
```

Use:

```cpp
auto x = max_value(3, 7);
auto y = max_value(2.5, 1.1);
```

## Class Templates

```cpp
template <typename T>
class Box {
    T value_;
public:
    explicit Box(T value) : value_(std::move(value)) {}
    const T& value() const { return value_; }
};
```

## Template Instantiation

Templates are compiled when used with concrete types.

```cpp
Box<int> a{42};
Box<std::string> b{"hello"};
```

The compiler generates code for those specific types.

## Type Requirements

Template code assumes operations exist.

```cpp
template <typename T>
void print_twice(const T& x) {
    std::cout << x << x;
}
```

This requires `operator<<` to work for `T`.

## Concepts C++20

Concepts let you state type requirements clearly.

```cpp
#include <concepts>

template <std::integral T>
T add(T a, T b) {
    return a + b;
}
```

## `typename` vs `class`

In template parameter lists, these are usually equivalent:

```cpp
template <typename T>
template <class T>
```

`typename` is more common in modern examples.

## Template Errors

Template errors can be long and ugly. Read from the first meaningful error near your code, not only the final line.

## Common Uses

Templates power:

- containers,
- algorithms,
- smart pointers,
- generic utilities,
- compile-time programming,
- zero-cost abstractions.

## Avoid Overdoing It

Do not write clever template metaprogramming early. Learn normal templates, then concepts, then advanced patterns only when needed.

## Quick Self-Test

You should be able to answer:

- What does a template generate?
- What happens when a type does not support an operation used in a template?
- Why are templates useful for performance?
- What do concepts add?
- When should you avoid templates?
