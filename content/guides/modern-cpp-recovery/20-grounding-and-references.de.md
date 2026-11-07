---
title: "20 — Grundlagen und Referenzen"
description: "Maßgebliche Referenzen, auf denen der Leitfaden zum Wiedereinstieg in modernes C++ basiert."
weight: 20
type: "guide"
build:
  list: local
  render: always
translationHash: "039a9c5fa4c2ddc334dbeac57520b71f"
---

# 20 — Grundlagen und Referenzen

Dieser Leitfaden ist bewusst kompakt und lässt daher viele Sonderfälle aus. Nutze diese Referenzen, wenn du die genaue, normnahe Erklärung möchtest.

## Primäre Referenzen

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — Best-Practice-Empfehlungen aus der C++-Community.
- [cppreference: C++-Sprache](https://en.cppreference.com/w/cpp/language) — ausführliche Sprachreferenz.
- [cppreference: C++-Standardbibliothek](https://en.cppreference.com/w/cpp/standard_library) — ausführliche Referenz der Standardbibliothek.
- [ISO C++](https://isocpp.org/) — offizielle Community-Seite für C++ und Informationen zu den Standards.

## Kernthemen

- [RAII](https://en.cppreference.com/w/cpp/language/raii)
- [Objektlebensdauer](https://en.cppreference.com/w/cpp/language/lifetime)
- [Rule of three/five/zero](https://en.cppreference.com/w/cpp/language/rule_of_three)
- [Move-Konstruktor](https://en.cppreference.com/w/cpp/language/move_constructor)
- [Move-Zuweisung](https://en.cppreference.com/w/cpp/language/move_assignment)
- [Wertkategorien](https://en.cppreference.com/w/cpp/language/value_category)
- [Undefiniertes Verhalten](https://en.cppreference.com/w/cpp/language/ub)

## Besitz und Speicher

- [`std::unique_ptr`](https://en.cppreference.com/w/cpp/memory/unique_ptr)
- [`std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)
- [`std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)
- [`std::make_unique`](https://en.cppreference.com/w/cpp/memory/unique_ptr/make_unique)
- [`std::make_shared`](https://en.cppreference.com/w/cpp/memory/shared_ptr/make_shared)

## Container, Algorithmen und Views

- [`std::vector`](https://en.cppreference.com/w/cpp/container/vector)
- [`std::array`](https://en.cppreference.com/w/cpp/container/array)
- [`std::map`](https://en.cppreference.com/w/cpp/container/map)
- [`std::unordered_map`](https://en.cppreference.com/w/cpp/container/unordered_map)
- [Algorithmenbibliothek](https://en.cppreference.com/w/cpp/algorithm)
- [`std::optional`](https://en.cppreference.com/w/cpp/utility/optional)
- [`std::variant`](https://en.cppreference.com/w/cpp/utility/variant)
- [`std::string_view`](https://en.cppreference.com/w/cpp/string/basic_string_view)
- [`std::span`](https://en.cppreference.com/w/cpp/container/span)
- [`std::filesystem`](https://en.cppreference.com/w/cpp/filesystem)
- [`std::chrono`](https://en.cppreference.com/w/cpp/chrono)
- [`std::expected`](https://en.cppreference.com/w/cpp/utility/expected)

## Nebenläufigkeit

- [`std::thread`](https://en.cppreference.com/w/cpp/thread/thread)
- [`std::jthread`](https://en.cppreference.com/w/cpp/thread/jthread)
- [`std::mutex`](https://en.cppreference.com/w/cpp/thread/mutex)
- [`std::lock_guard`](https://en.cppreference.com/w/cpp/thread/lock_guard)
- [`std::condition_variable`](https://en.cppreference.com/w/cpp/thread/condition_variable)
- [`std::atomic`](https://en.cppreference.com/w/cpp/atomic/atomic)
- [Speichermodell](https://en.cppreference.com/w/cpp/language/memory_model)

## Tooling

- [CMake-Tutorial](https://cmake.org/cmake/help/latest/guide/tutorial/index.html)
- [GDB-Dokumentation](https://sourceware.org/gdb/documentation/)
- [LLDB-Dokumentation](https://lldb.llvm.org/)
- [Clang AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html)
- [Clang UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html)
- [Clang ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [clang-format](https://clang.llvm.org/docs/ClangFormat.html)
- [clang-tidy](https://clang.llvm.org/extra/clang-tidy/)
- [GoogleTest](https://google.github.io/googletest/)
- [Catch2](https://github.com/catchorg/Catch2)

## Compiler-Verifikation

Die Beispiele wurden mit einem kleinen Verifikations-Harness im Repository geprüft:

```text
tools/verify-cpp-guide/
```

Die positiven Beispiele kompilieren und laufen mit GCC 15.2.1 und C++20. Das Beispiel mit `std::expected` kompiliert und läuft mit C++23. Die absichtlich unsicheren Beispiele im Abschnitt über undefiniertes Verhalten wurden separat mit Clang 21.1.8 und AddressSanitizer/UndefinedBehaviorSanitizer geprüft.

Du kannst es lokal so ausführen:

```bash
cd tools/verify-cpp-guide
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
./build/verify_cpp_guide
./build/expected_cpp23
```

## Hinweise zur Genauigkeit

- C++ bietet je nach Einsatzgebiet mehrere gültige Stile. Embedded-Systeme, Finance, Game Engines, sicherheitskritische Software und Anwendungs-Backends treffen bei Exceptions, Allokation, RTTI, Templates und der Verwendung der Standardbibliothek oft unterschiedliche Entscheidungen.
- Der Leitfaden folgt standardmäßig dem verbreiteten modernen C++17/20-Stil: RAII, Standardcontainer, Wertsemantik, expliziter Besitz, CMake, Tests und Sanitizer.
- Manche C++23-Features, insbesondere `std::expected`, können einen aktuellen Compiler und eine aktuelle Standardbibliothek erfordern.
- Module und Coroutines sind wichtig, werden im Wiedereinstiegspfad jedoch bewusst nicht hervorgehoben, weil Verbreitung und Nutzen je nach Codebasis variieren.
