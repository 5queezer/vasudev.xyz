---
title: "16 — Tooling: CMake, Debugger, Sanitizer, Tests"
description: "Zu modernen C++-Kenntnissen gehört auch das Tooling. Echte C++-Arbeit besteht nicht nur aus Sprachsyntax."
weight: 16
type: "guide"
build:
  list: local
  render: always
translationHash: "c7cad9d259f48427b036c7cf636faa25"
---

# 16 — Tooling: CMake, Debugger, Sanitizer, Tests

## Kernidee

Zu modernen C++-Kenntnissen gehört auch das Tooling. Echte C++-Arbeit besteht nicht nur aus Sprachsyntax.

## Compiler-Flags

Beginne mit strengen Warnungen:

```bash
-Wall -Wextra -Wpedantic
```

Während des Lernens kannst du Folgendes erwägen:

```bash
-Werror
```

Debug-Build:

```bash
-g -O0
```

Release-Build:

```bash
-O2
```

## CMake

Minimales Projekt:

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

## Debugger

Verwende `gdb` oder `lldb`.

Grundlegende `gdb`-Befehle:

```text
break main
run
next
step
print variable
backtrace
continue
```

## Sanitizer

Address- und UB-Sanitizer:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Thread Sanitizer:

```bash
-fsanitize=thread -g
```

Verwende Sanitizer regelmäßig während der Entwicklung.

## Formatierung

Verwende `clang-format`, um Diskussionen über den Stil zu vermeiden.

```bash
clang-format -i src/*.cpp include/*.hpp
```

## Statische Analyse

Verwende `clang-tidy`, um verdächtige Muster zu finden.

```bash
clang-tidy src/main.cpp -- -std=c++20
```

## Tests

Beliebte Optionen:

- Catch2,
- GoogleTest,
- doctest.

Kleiner Smoke-Test nur mit der Standardbibliothek:

```cpp
#include <cassert>

void test_addition() {
    assert(add(2, 3) == 5);
}
```

## Paketmanager

Häufige C++-Paketmanager:

- vcpkg,
- Conan.

Du brauchst sie nicht am ersten Tag, aber echte Projekte verwenden sie häufig.

## Empfohlene Entwicklungsumgebung

- C++20-Compiler: GCC oder Clang.
- CMake.
- Ninja oder Make.
- gdb/lldb.
- clang-format.
- clang-tidy.
- Sanitizer.
- Catch2 oder GoogleTest.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Wie baust du ein CMake-Projekt?
- Wie setzt du einen Breakpoint?
- Was findet AddressSanitizer?
- Warum solltest du clang-format verwenden?
- Was unterscheidet Debug- und Release-Builds?
