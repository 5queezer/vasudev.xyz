---
title: "12 — Error Handling and Exception Safety"
description: "C++ has multiple error handling styles. The right one depends on the domain."
weight: 12
type: "guide"
build:
  list: local
  render: always
---

# 12 — Error Handling and Exception Safety

## Core Idea

C++ has multiple error handling styles. The right one depends on the domain.

## Exceptions

Exceptions separate normal flow from error handling.

```cpp
void handle_work() {
    try {
        risky();
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
    }
}
```

## RAII and Exceptions

RAII is what makes exceptions safe.

```cpp
void f() {
    std::ofstream file("out.txt");
    risky();
} // file closes even if risky throws
```

## Exception Safety Guarantees

### Basic Guarantee

Program remains valid; no leaks or corrupted invariants.

### Strong Guarantee

Operation either succeeds completely or has no effect.

### No-Throw Guarantee

Operation does not throw.

Used for destructors and many move operations.

## `noexcept`

Mark functions that should not throw.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

Destructors should generally not throw.

## Error Codes

Some domains avoid exceptions, especially embedded, game engines, low-latency trading, and some systems code.

```cpp
enum class Error {
    None,
    NotFound,
    PermissionDenied
};
```

## `std::optional`

Use for simple absence.

```cpp
std::optional<User> find_user(int id);
```

## `std::expected`

C++23 has `std::expected` for value-or-error. Some projects use similar library types earlier.

```cpp
#include <expected>

std::expected<User, Error> load_user(int id);
```

## Choosing an Error Style

- Use exceptions for application-level unexpected failures if your codebase allows them.
- Use error codes/expected in performance-sensitive or exception-free environments.
- Use `optional` for simple maybe-present values.
- Do not use exceptions for normal control flow.

## Common Mistakes

- Throwing from destructors.
- Catching exceptions by value instead of `const&`.
- Swallowing all exceptions without logging.
- Using `optional` when you need error details.
- Returning magic numbers like `-1` for everything.

## Quick Self-Test

You should be able to answer:

- What does RAII have to do with exceptions?
- What is the strong exception guarantee?
- Why should destructors not throw?
- When is `optional` insufficient?
- Why do some C++ domains avoid exceptions?
