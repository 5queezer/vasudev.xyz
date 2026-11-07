---
title: "02 — Compilación, enlazado y estructura del proyecto"
description: "C++ suele compilarse en unidades de traducción separadas. Comprender el proceso de construcción ahorra horas de confusión."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "315074b9eec6cb773eadac4779c22d41"
---

# 02 — Compilación, enlazado y estructura del proyecto

## Idea central

C++ suele compilarse en unidades de traducción separadas. Comprender el proceso de construcción ahorra horas de confusión.

## La cadena de construcción

Etapas habituales de una compilación de C++:

1. Preprocesamiento — gestiona `#include`, macros y compilación condicional.
2. Compilación — convierte cada archivo `.cpp` en un archivo objeto.
3. Enlazado — combina archivos objeto y bibliotecas en un ejecutable.

Ejemplo:

```bash
g++ -std=c++20 -Wall -Wextra -g -c main.cpp -o main.o
g++ main.o -o app
```

## Cabeceras frente a archivos fuente

Las cabeceras suelen contener declaraciones:

```cpp
// math_utils.hpp
#pragma once

int add(int a, int b);
```

Los archivos fuente contienen definiciones:

```cpp
// math_utils.cpp
#include "math_utils.hpp"

int add(int a, int b) {
    return a + b;
}
```

Úsalos así:

```cpp
// main.cpp
#include "math_utils.hpp"
#include <iostream>

int main() {
    std::cout << add(2, 3) << '\n';
}
```

## Errores habituales

### Error del compilador

Suele indicar que no se puede compilar un archivo `.cpp`.

Ejemplos:

- falta un punto y coma,
- tipo desconocido,
- uso incorrecto de una plantilla,
- inclusión incorrecta.

### Error del enlazador

Suele indicar que el compilador vio una declaración, pero el enlazador no puede encontrar la definición.

Ejemplo:

```text
undefined reference to `add(int, int)`
```

Causas habituales:

- se olvidó compilar o enlazar un archivo `.cpp`,
- función declarada pero no definida,
- firmas que no coinciden,
- falta una biblioteca.

## Guardas de inclusión

Opción moderna y sencilla:

```cpp
#pragma once
```

Opción tradicional:

```cpp
#ifndef MY_HEADER_HPP
#define MY_HEADER_HPP

// declarations

#endif
```

## Regla de una definición

Una función no inline o una variable global debe tener exactamente una definición en todo el programa.

Mal:

```cpp
// header.hpp
int global_count = 0; // bad if included by multiple .cpp files
```

Mejor:

```cpp
// header.hpp
extern int global_count;

// source.cpp
int global_count = 0;
```

## Proyecto CMake mínimo

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

## Autoevaluación rápida

Deberías poder responder:

- ¿Cuál es la diferencia entre declaración y definición?
- ¿Qué es un error del enlazador?
- ¿Por qué necesitan guardas de inclusión las cabeceras?
- ¿Por qué deberían estar la mayoría de las definiciones en archivos `.cpp`?
- ¿Qué hace CMake por ti?
