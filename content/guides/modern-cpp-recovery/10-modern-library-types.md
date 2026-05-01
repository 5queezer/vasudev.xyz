---
title: "10 — Modern Library Types"
description: "Use when a value may or may not exist."
weight: 10
type: "guide"
build:
  list: local
  render: always
---

# 10 — Modern Library Types

## `std::optional`

Use when a value may or may not exist.

```cpp
std::optional<User> find_user(int id);

if (auto user = find_user(42)) {
    std::cout << user->name << '\n';
}
```

Avoid sentinel values like `-1` or empty strings when absence is meaningful.

## `std::variant`

Use for a value that can be one of several known types.

```cpp
using Result = std::variant<int, std::string>;
```

Visit it:

```cpp
std::visit([](const auto& value) {
    std::cout << value << '\n';
}, result);
```

## `std::any`

Can hold any type, but use sparingly. It loses type clarity.

```cpp
std::any value = 42;
```

## `std::string_view`

A non-owning view into string data.

```cpp
void print(std::string_view text) {
    std::cout << text << '\n';
}
```

Important: it does not own the string. Avoid returning a `string_view` to temporary data.

Bad:

```cpp
std::string_view bad() {
    std::string s = "dead";
    return s;
}
```

## `std::span`

A non-owning view over contiguous memory.

```cpp
void process(std::span<int> values) {
    for (int& v : values) {
        v += 1;
    }
}
```

Works with vectors, arrays, and C arrays.

## `std::filesystem`

Portable filesystem operations.

```cpp
#include <filesystem>

namespace fs = std::filesystem;

for (const auto& entry : fs::directory_iterator(".")) {
    std::cout << entry.path() << '\n';
}
```

## `std::chrono`

Type-safe time and duration handling.

```cpp
using namespace std::chrono_literals;

auto timeout = 500ms;
```

Measure time:

```cpp
auto start = std::chrono::steady_clock::now();
// work
auto end = std::chrono::steady_clock::now();
```

## Quick Self-Test

You should be able to answer:

- When should you use `optional`?
- Why is `string_view` dangerous if misused?
- What problem does `span` solve?
- When is `variant` better than inheritance?
- Why use `chrono` instead of raw integers for time?
