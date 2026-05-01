---
title: "20 — Grounding and References"
description: "Authoritative references used to ground the Modern C++ Recovery Guide."
weight: 20
type: "guide"
build:
  list: local
  render: always
---

# 20 — Grounding and References

This guide is intentionally compact, so it omits many edge cases. Use these references when you want the precise language-lawyer version.

## Primary References

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — best-practice guidance from the C++ community.
- [cppreference: C++ language](https://en.cppreference.com/w/cpp/language) — detailed language reference.
- [cppreference: C++ standard library](https://en.cppreference.com/w/cpp/standard_library) — detailed standard library reference.
- [ISO C++](https://isocpp.org/) — official C++ community site and standards information.

## Core Topics

- [RAII](https://en.cppreference.com/w/cpp/language/raii)
- [Object lifetime](https://en.cppreference.com/w/cpp/language/lifetime)
- [Rule of three/five/zero](https://en.cppreference.com/w/cpp/language/rule_of_three)
- [Move constructor](https://en.cppreference.com/w/cpp/language/move_constructor)
- [Move assignment](https://en.cppreference.com/w/cpp/language/move_assignment)
- [Value categories](https://en.cppreference.com/w/cpp/language/value_category)
- [Undefined behavior](https://en.cppreference.com/w/cpp/language/ub)

## Ownership and Memory

- [`std::unique_ptr`](https://en.cppreference.com/w/cpp/memory/unique_ptr)
- [`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)
- [`std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)
- [`std::make_unique`](https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique)
- [`std::make_shared`](https://en.cppreference.com/w/cpp/memory/shared_ptr/make_shared)

## Containers, Algorithms, and Views

- [`std::vector`](https://en.cppreference.com/w/cpp/container/vector)
- [`std::array`](https://en.cppreference.com/w/cpp/container/array)
- [`std::map`](https://en.cppreference.com/w/cpp/container/map)
- [`std::unordered_map`](https://en.cppreference.com/w/cpp/container/unordered_map)
- [Algorithms library](https://en.cppreference.com/w/cpp/algorithm)
- [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional)
- [`std::variant`](https://en.cppreference.com/w/cpp/utility/variant)
- [`std::string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view)
- [`std::span`](https://en.cppreference.com/w/cpp/container/span)
- [`std::filesystem`](https://en.cppreference.com/w/cpp/filesystem)
- [`std::chrono`](https://en.cppreference.com/w/cpp/chrono)
- [`std::expected`](https://en.cppreference.com/w/cpp/utility/expected)

## Concurrency

- [`std::thread`](https://en.cppreference.com/w/cpp/thread/thread)
- [`std::jthread`](https://en.cppreference.com/w/cpp/thread/jthread)
- [`std::mutex`](https://en.cppreference.com/w/cpp/thread/mutex)
- [`std::lock_guard`](https://en.cppreference.com/w/cpp/thread/lock_guard)
- [`std::condition_variable`](https://en.cppreference.com/w/cpp/thread/condition_variable)
- [`std::atomic`](https://en.cppreference.com/w/cpp/atomic/atomic)
- [Memory model](https://en.cppreference.com/w/cpp/language/memory_model)

## Tooling

- [CMake Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)
- [GDB Documentation](https://sourceware.org/gdb/documentation/)
- [LLDB Documentation](https://lldb.llvm.org/)
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Clang ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [clang-format](https://clang.llvm.org/docs/ClangFormat.html)
- [clang-tidy](https://clang.llvm.org/extra/clang-tidy/)
- [GoogleTest](https://google.github.io/googletest/)
- [Catch2](https://github.com/catchorg/Catch2)

## Compiler Verification

The examples were checked with a small verification harness in the repository:

```text
tools/verify-cpp-guide/
```

Positive examples compile and run under GCC 15.2.1 with C++20. The `std::expected` example compiles and runs under C++23. The intentionally unsafe examples in the undefined-behavior section were checked separately with Clang 21.1.8 and AddressSanitizer/UndefinedBehaviorSanitizer.

Run it locally with:

```bash
cd tools/verify-cpp-guide
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
./build/verify_cpp_guide
./build/expected_cpp23
```

## Accuracy Notes

- C++ has multiple valid styles depending on domain. Embedded, finance, game engines, safety-critical software, and application backends often make different choices around exceptions, allocation, RTTI, templates, and standard library usage.
- The guide defaults to mainstream modern C++17/20 style: RAII, standard containers, value semantics, explicit ownership, CMake, tests, and sanitizers.
- Some C++23 features, especially `std::expected`, may require a recent compiler and standard library.
- Modules and coroutines are important but intentionally not emphasized in the recovery path because adoption and usefulness vary by codebase.
