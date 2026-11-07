---
title: "16 — Herramientas: CMake, depuradores, sanitizadores y pruebas"
description: "Dominar C++ moderno incluye sus herramientas. El trabajo real en C++ no consiste solo en la sintaxis del lenguaje."
weight: 16
type: "guide"
build:
  list: local
  render: always
translationHash: "c7cad9d259f48427b036c7cf636faa25"
---

# 16 — Herramientas: CMake, depuradores, sanitizadores y pruebas

## Idea principal

Dominar C++ moderno incluye sus herramientas. El trabajo real en C++ no consiste solo en la sintaxis del lenguaje.

## Opciones del compilador

Empieza con avisos estrictos:

```bash
-Wall -Wextra -Wpedantic
```

Mientras aprendes, considera:

```bash
-Werror
```

Compilación de depuración:

```bash
-g -O0
```

Compilación de producción:

```bash
-O2
```

## CMake

Proyecto mínimo:

```cmake
cmake_minimum_required(VERSION 3.20)
project(myapp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(myapp src/main.cpp)
```

Compilación:

```bash
cmake -S . -B build
cmake --build build
./build/myapp
```

## Depuradores

Usa `gdb` o `lldb`.

Comandos básicos de `gdb`:

```text
break main
run
next
step
print variable
backtrace
continue
```

## Sanitizadores

Sanitizadores de direcciones y comportamiento indefinido:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Sanitizador de hilos:

```bash
-fsanitize=thread -g
```

Usa sanitizadores habitualmente durante el desarrollo.

## Formato

Usa `clang-format` para evitar discusiones sobre el estilo.

```bash
clang-format -i src/*.cpp include/*.hpp
```

## Análisis estático

Usa `clang-tidy` para detectar patrones sospechosos.

```bash
clang-tidy src/main.cpp -- -std=c++20
```

## Pruebas

Opciones populares:

- Catch2,
- GoogleTest,
- doctest.

Pequeña prueba de humo solo con la biblioteca estándar:

```cpp
#include <cassert>

void test_addition() {
    assert(add(2, 3) == 5);
}
```

## Gestores de paquetes

Gestores de paquetes habituales de C++:

- vcpkg,
- Conan.

No los necesitas el primer día, pero los proyectos reales suelen usarlos.

## Entorno de desarrollo recomendado

- Compilador C++20: GCC o Clang.
- CMake.
- Ninja o Make.
- gdb/lldb.
- clang-format.
- clang-tidy.
- sanitizadores.
- Catch2 o GoogleTest.

## Autoevaluación rápida

Deberías poder responder:

- ¿Cómo se compila un proyecto CMake?
- ¿Cómo se establece un punto de interrupción?
- ¿Qué detecta AddressSanitizer?
- ¿Por qué usar clang-format?
- ¿Cuál es la diferencia entre las compilaciones de depuración y producción?
