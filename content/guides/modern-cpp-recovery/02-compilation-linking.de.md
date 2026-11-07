---
title: "02 — Kompilierung, Linken und Projektstruktur"
description: "C++ wird üblicherweise in getrennten Übersetzungseinheiten gebaut. Das Verständnis des Build-Prozesses erspart Stunden der Verwirrung."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "315074b9eec6cb773eadac4779c22d41"
---

# 02 — Kompilierung, Linken und Projektstruktur

## Kerngedanke

C++ wird üblicherweise in getrennten Übersetzungseinheiten gebaut. Das Verständnis des Build-Prozesses erspart Stunden der Verwirrung.

## Die Pipeline

Typische Phasen eines C++-Builds:

1. Präprozessierung — verarbeitet `#include`, Makros und bedingte Kompilierung.
2. Kompilierung — wandelt jede `.cpp`-Datei in eine Objektdatei um.
3. Linken — verbindet Objektdateien und Bibliotheken zu einer ausführbaren Datei.

Beispiel:

```bash
g++ -std=c++20 -Wall -Wextra -g -c main.cpp -o main.o
g++ main.o -o app
```

## Header- und Quelldateien

Header enthalten üblicherweise Deklarationen:

```cpp
// math_utils.hpp
#pragma once

int add(int a, int b);
```

Quelldateien enthalten Definitionen:

```cpp
// math_utils.cpp
#include "math_utils.hpp"

int add(int a, int b) {
    return a + b;
}
```

So verwendest du sie:

```cpp
// main.cpp
#include "math_utils.hpp"
#include <iostream>

int main() {
    std::cout << add(2, 3) << '\n';
}
```

## Häufige Fehler

### Compilerfehler

Bedeutet üblicherweise, dass eine `.cpp`-Datei nicht kompiliert werden kann.

Beispiele:

- fehlendes Semikolon,
- unbekannter Typ,
- fehlerhafte Template-Verwendung,
- falsches Include.

### Linkerfehler

Bedeutet üblicherweise, dass der Compiler eine Deklaration gesehen hat, der Linker aber die Definition nicht finden kann.

Beispiel:

```text
undefined reference to `add(int, int)`
```

Typische Ursachen:

- eine `.cpp`-Datei wurde nicht kompiliert oder gelinkt,
- eine Funktion wurde deklariert, aber nicht definiert,
- die Signaturen stimmen nicht überein,
- eine Bibliothek fehlt.

## Include-Guards

Einfache moderne Variante:

```cpp
#pragma once
```

Traditionelle Variante:

```cpp
#ifndef MY_HEADER_HPP
#define MY_HEADER_HPP

// declarations

#endif
```

## One Definition Rule

Eine nicht als inline markierte Funktion oder globale Variable sollte im gesamten Programm genau eine Definition haben.

Schlecht:

```cpp
// header.hpp
int global_count = 0; // bad if included by multiple .cpp files
```

Besser:

```cpp
// header.hpp
extern int global_count;

// source.cpp
int global_count = 0;
```

## Minimales CMake-Projekt

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

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Was ist der Unterschied zwischen Deklaration und Definition?
- Was ist ein Linkerfehler?
- Warum benötigen Header Include-Guards?
- Warum sollten die meisten Definitionen in `.cpp`-Dateien stehen?
- Was übernimmt CMake für dich?
