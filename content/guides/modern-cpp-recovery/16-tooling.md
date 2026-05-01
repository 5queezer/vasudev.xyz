---
title: "16 — Tooling: CMake, Debuggers, Sanitizers, Testing"
description: "Modern C++ skill includes tooling. Real C++ work is not just language syntax."
weight: 16
type: "guide"
build:
  list: local
  render: always
---

# 16 — Tooling: CMake, Debuggers, Sanitizers, Testing

## Core Idea

Modern C++ skill includes tooling. Real C++ work is not just language syntax.

## Compiler Flags

Start with strict warnings:

```bash
-Wall -Wextra -Wpedantic
```

During learning, consider:

```bash
-Werror
```

Debug build:

```bash
-g -O0
```

Release build:

```bash
-O2
```

## CMake

Minimal project:

```cmake
cmake_minimum_required(VERSION 3.20)
project(myapp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(myapp src/main.cpp)
```

Build:

```bash
cmake -S . -B build
cmake --build build
./build/myapp
```

## Debuggers

Use `gdb` or `lldb`.

Basic `gdb` commands:

```text
break main
run
next
step
print variable
backtrace
continue
```

## Sanitizers

Address + UB sanitizer:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Thread sanitizer:

```bash
-fsanitize=thread -g
```

Use sanitizers regularly during development.

## Formatting

Use `clang-format` to avoid style arguments.

```bash
clang-format -i src/*.cpp include/*.hpp
```

## Static Analysis

Use `clang-tidy` to catch suspicious patterns.

```bash
clang-tidy src/main.cpp -- -std=c++20
```

## Testing

Popular options:

- Catch2,
- GoogleTest,
- doctest.

Tiny standard-library smoke test:

```cpp
#include <cassert>

void test_addition() {
    assert(add(2, 3) == 5);
}
```

## Package Managers

Common C++ package managers:

- vcpkg,
- Conan.

You do not need them on day one, but real projects often use them.

## Recommended Development Setup

- C++20 compiler: GCC or Clang.
- CMake.
- Ninja or Make.
- gdb/lldb.
- clang-format.
- clang-tidy.
- sanitizers.
- Catch2 or GoogleTest.

## Quick Self-Test

You should be able to answer:

- How do you build a CMake project?
- How do you set a breakpoint?
- What does AddressSanitizer catch?
- Why use clang-format?
- What is the difference between debug and release builds?
