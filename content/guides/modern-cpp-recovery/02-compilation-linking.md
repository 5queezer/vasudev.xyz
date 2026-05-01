---
title: "02 — Compilation, Linking, and Project Shape"
description: "C++ is usually built in separate translation units. Understanding the build process saves hours of confusion."
weight: 2
type: "guide"
build:
  list: local
  render: always
---

# 02 — Compilation, Linking, and Project Shape

## Core Idea

C++ is usually built in separate translation units. Understanding the build process saves hours of confusion.

## The Pipeline

Typical C++ build stages:

1. Preprocessing — handles `#include`, macros, conditional compilation.
2. Compilation — turns each `.cpp` into an object file.
3. Linking — combines object files and libraries into an executable.

Example:

```bash
g++ -std=c++20 -Wall -Wextra -g -c main.cpp -o main.o
g++ main.o -o app
```

## Headers vs Source Files

Headers usually contain declarations:

```cpp
// math_utils.hpp
#pragma once

int add(int a, int b);
```

Source files contain definitions:

```cpp
// math_utils.cpp
#include "math_utils.hpp"

int add(int a, int b) {
    return a + b;
}
```

Use them:

```cpp
// main.cpp
#include "math_utils.hpp"
#include <iostream>

int main() {
    std::cout << add(2, 3) << '\n';
}
```

## Common Errors

### Compiler Error

Usually means one `.cpp` file cannot be compiled.

Examples:

- missing semicolon,
- unknown type,
- bad template usage,
- wrong include.

### Linker Error

Usually means the compiler saw a declaration but the linker cannot find the definition.

Example:

```text
undefined reference to `add(int, int)`
```

Typical causes:

- forgot to compile/link a `.cpp` file,
- function declared but not defined,
- signature mismatch,
- missing library.

## Include Guards

Modern simple option:

```cpp
#pragma once
```

Traditional option:

```cpp
#ifndef MY_HEADER_HPP
#define MY_HEADER_HPP

// declarations

#endif
```

## One Definition Rule

A non-inline function or global variable should have exactly one definition across the program.

Bad:

```cpp
// header.hpp
int global_count = 0; // bad if included by multiple .cpp files
```

Better:

```cpp
// header.hpp
extern int global_count;

// source.cpp
int global_count = 0;
```

## Minimal CMake Project

```cmake
cmake_minimum_required(VERSION 3.20)
project(app LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(app
    src/main.cpp
    src/math_utils.cpp
)

target_include_directories(app PRIVATE include)
```

## Quick Self-Test

You should be able to answer:

- What is the difference between declaration and definition?
- What is a linker error?
- Why do headers need include guards?
- Why should most definitions live in `.cpp` files?
- What does CMake do for you?
