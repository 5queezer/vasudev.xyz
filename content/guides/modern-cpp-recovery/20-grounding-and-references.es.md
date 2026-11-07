---
title: "20 — Fundamentos y referencias"
description: "Referencias autorizadas utilizadas como base para la guía de actualización a C++ moderno."
weight: 20
type: "guide"
build:
  list: local
  render: always
translationHash: "039a9c5fa4c2ddc334dbeac57520b71f"
---

# 20 — Fundamentos y referencias

Esta guía es deliberadamente compacta, por lo que omite muchos casos límite. Usa estas referencias cuando quieras la versión precisa y cercana al estándar.

## Referencias principales

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — recomendaciones de buenas prácticas de la comunidad de C++.
- [cppreference: lenguaje C++](https://en.cppreference.com/w/cpp/language) — referencia detallada del lenguaje.
- [cppreference: biblioteca estándar de C++](https://en.cppreference.com/w/cpp/standard_library) — referencia detallada de la biblioteca estándar.
- [ISO C++](https://isocpp.org/) — sitio oficial de la comunidad C++ e información sobre los estándares.

## Temas principales

- [RAII](https://en.cppreference.com/w/cpp/language/raii)
- [Duración de vida de los objetos](https://en.cppreference.com/w/cpp/language/lifetime)
- [Rule of three/five/zero](https://en.cppreference.com/w/cpp/language/rule_of_three)
- [Constructor de movimiento](https://en.cppreference.com/w/cpp/language/move_constructor)
- [Asignación por movimiento](https://en.cppreference.com/w/cpp/language/move_assignment)
- [Categorías de valores](https://en.cppreference.com/w/cpp/language/value_category)
- [Comportamiento indefinido](https://en.cppreference.com/w/cpp/language/ub)

## Propiedad y memoria

- [`std::unique_ptr`](https://en.cppreference.com/w/cpp/memory/unique_ptr)
- [`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)
- [`std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)
- [`std::make_unique`](https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique)
- [`std::make_shared`](https://en.cppreference.com/w/cpp/memory/shared_ptr/make_shared)

## Contenedores, algoritmos y vistas

- [`std::vector`](https://en.cppreference.com/w/cpp/container/vector)
- [`std::array`](https://en.cppreference.com/w/cpp/container/array)
- [`std::map`](https://en.cppreference.com/w/cpp/container/map)
- [`std::unordered_map`](https://en.cppreference.com/w/cpp/container/unordered_map)
- [Biblioteca de algoritmos](https://en.cppreference.com/w/cpp/algorithm)
- [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional)
- [`std::variant`](https://en.cppreference.com/w/cpp/utility/variant)
- [`std::string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view)
- [`std::span`](https://en.cppreference.com/w/cpp/container/span)
- [`std::filesystem`](https://en.cppreference.com/w/cpp/filesystem)
- [`std::chrono`](https://en.cppreference.com/w/cpp/chrono)
- [`std::expected`](https://en.cppreference.com/w/cpp/utility/expected)

## Concurrencia

- [`std::thread`](https://en.cppreference.com/w/cpp/thread/thread)
- [`std::jthread`](https://en.cppreference.com/w/cpp/thread/jthread)
- [`std::mutex`](https://en.cppreference.com/w/cpp/thread/mutex)
- [`std::lock_guard`](https://en.cppreference.com/w/cpp/thread/lock_guard)
- [`std::condition_variable`](https://en.cppreference.com/w/cpp/thread/condition_variable)
- [`std::atomic`](https://en.cppreference.com/w/cpp/atomic/atomic)
- [Modelo de memoria](https://en.cppreference.com/w/cpp/language/memory_model)

## Herramientas

- [Tutorial de CMake](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)
- [Documentación de GDB](https://sourceware.org/gdb/documentation/)
- [Documentación de LLDB](https://lldb.llvm.org/)
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Clang ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [clang-format](https://clang.llvm.org/docs/ClangFormat.html)
- [clang-tidy](https://clang.llvm.org/extra/clang-tidy/)
- [GoogleTest](https://google.github.io/googletest/)
- [Catch2](https://github.com/catchorg/Catch2)

## Verificación con el compilador

Los ejemplos se comprobaron con un pequeño arnés de verificación incluido en el repositorio:

```text
tools/verify-cpp-guide/
```

Los ejemplos positivos compilan y se ejecutan con GCC 15.2.1 y C++20. El ejemplo de `std::expected` compila y se ejecuta con C++23. Los ejemplos deliberadamente inseguros de la sección sobre comportamiento indefinido se comprobaron por separado con Clang 21.1.8 y AddressSanitizer/UndefinedBehaviorSanitizer.

Ejecútalo localmente así:

```bash
cd tools/verify-cpp-guide
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
./build/verify_cpp_guide
./build/expected_cpp23
```

## Notas sobre la precisión

- C++ tiene varios estilos válidos según el ámbito. Los sistemas embebidos, las finanzas, los motores de videojuegos, el software crítico para la seguridad y los backends de aplicaciones suelen tomar decisiones distintas sobre excepciones, asignación, RTTI, plantillas y uso de la biblioteca estándar.
- La guía adopta como opción predeterminada el estilo convencional de C++17/20 moderno: RAII, contenedores estándar, semántica de valores, propiedad explícita, CMake, pruebas y sanitizadores.
- Algunas características de C++23, especialmente `std::expected`, pueden necesitar un compilador y una biblioteca estándar recientes.
- Los módulos y las coroutines son importantes, pero no se destacan deliberadamente en esta ruta de actualización porque su adopción y utilidad varían según la base de código.
