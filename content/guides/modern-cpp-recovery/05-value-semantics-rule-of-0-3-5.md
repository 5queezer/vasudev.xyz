---
title: "05 — Value Semantics and Rule of 0/3/5"
description: "Modern C++ prefers types that behave like values. A good type can be copied, moved, stored in containers, returned from functions, and destroyed safely."
weight: 5
type: "guide"
build:
  list: local
  render: always
---

# 05 — Value Semantics and Rule of 0/3/5

## Core Idea

Modern C++ prefers types that behave like values. A good type can be copied, moved, stored in containers, returned from functions, and destroyed safely.

## Value Semantics

A value owns its data and behaves predictably.

```cpp
std::string a = "hello";
std::string b = a; // b has its own value
```

This is easier to reason about than scattered heap objects behind raw pointers.

## Rule of 0

If your class only contains standard library/resource-managing members, you usually need no custom destructor, copy constructor, or move constructor.

```cpp
class User {
public:
    std::string name;
    std::vector<int> scores;
};
```

This is ideal.

## Rule of 3

If you define one of these, you probably need all three:

- destructor,
- copy constructor,
- copy assignment operator.

This usually appears in old-style classes that manually own memory.

```cpp
class Buffer {
    int* data;
    std::size_t size;
public:
    ~Buffer();
    Buffer(const Buffer& other);
    Buffer& operator=(const Buffer& other);
};
```

## Rule of 5

With move semantics, if you manage a resource manually, you may need all five:

- destructor,
- copy constructor,
- copy assignment,
- move constructor,
- move assignment.

```cpp
class Buffer {
public:
    ~Buffer();
    Buffer(const Buffer&);
    Buffer& operator=(const Buffer&);
    Buffer(Buffer&&) noexcept;
    Buffer& operator=(Buffer&&) noexcept;
};
```

## Prefer Rule of 0

Instead of manually managing memory:

```cpp
class Buffer {
    std::vector<int> data;
};
```

Now the compiler-generated operations are usually correct.

## `= default` and `= delete`

Explicitly default operations:

```cpp
class User {
public:
    User() = default;
};
```

Disable operations:

```cpp
class NonCopyable {
public:
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};
```

## Common Mistake

If your class has a raw owning pointer and uses the default copy constructor, you likely have a double-delete bug.

```cpp
class Bad {
    int* data;
};
```

Copying this copies the pointer, not the pointed-to data.

## Quick Self-Test

You should be able to explain:

- What does it mean for a type to have value semantics?
- Why is the Rule of 0 preferred?
- When do you need the Rule of 5?
- What does `= delete` do?
- Why are raw owning pointers dangerous in copyable classes?
