---
title: "06 — Move Semantics"
description: "Move semantics let C++ transfer resources instead of copying them."
weight: 6
type: "guide"
build:
  list: local
  render: always
---

# 06 — Move Semantics

## Core Idea

Move semantics let C++ transfer resources instead of copying them.

This is one of the biggest changes since old C++.

## Copy vs Move

Copying duplicates a value.

```cpp
std::string a = "hello";
std::string b = a; // copy
```

Moving transfers resources from one object to another.

```cpp
std::string a = "hello";
std::string b = std::move(a); // move
```

After a move, `a` is still valid but its value is unspecified. You can destroy it or assign a new value to it.

## Why Move Exists

Some objects are expensive to copy:

- vectors,
- strings,
- buffers,
- file handles,
- sockets,
- unique ownership objects.

Moving avoids unnecessary allocation and copying.

## `std::unique_ptr` Example

`unique_ptr` cannot be copied because ownership is unique.

```cpp
auto a = std::make_unique<User>();
// auto b = a; // error
```

But it can be moved:

```cpp
auto b = std::move(a);
```

Now `b` owns the object and `a` is empty.

## Lvalues and Rvalues

Very simplified:

- lvalue: has a name or stable location.
- rvalue: temporary value.

```cpp
std::string name = "Ada";        // name is an lvalue
std::string temporary{"Ada"};    // initializer creates a temporary, then temporary is a named lvalue
```

## Rvalue References

Move constructors often use `T&&`.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

## `std::move`

`std::move` does not move by itself. It casts an object to an rvalue so it can be moved from.

```cpp
std::vector<int> a = {1, 2, 3};
std::vector<int> b = std::move(a);
```

## Move Constructor

```cpp
class Buffer {
    std::vector<int> data;
public:
    Buffer(Buffer&& other) noexcept
        : data(std::move(other.data)) {}
};
```

Most of the time, let the compiler generate this.

## `noexcept`

Move constructors should often be `noexcept`. Containers like `std::vector` may use move operations more efficiently if they are known not to throw.

## Common Mistakes

### Using a Moved-From Object

```cpp
std::string a = "hello";
std::string b = std::move(a);
std::cout << a; // valid but unspecified content
```

### Moving From `const`

A `const` object usually cannot be meaningfully moved from because moving modifies the source.

```cpp
const std::string a = "hello";
std::string b = std::move(a); // likely copies
```

## Quick Self-Test

You should be able to answer:

- What does `std::move` actually do?
- Why can `unique_ptr` move but not copy?
- What state is a moved-from object in?
- Why are move constructors often `noexcept`?
- When should you prefer Rule of 0 instead of writing moves yourself?
