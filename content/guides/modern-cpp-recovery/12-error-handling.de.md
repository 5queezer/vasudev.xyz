---
title: "12 — Fehlerbehandlung und Exception Safety"
description: "C++ bietet mehrere Arten der Fehlerbehandlung. Welche richtig ist, hängt vom Einsatzgebiet ab."
weight: 12
type: "guide"
build:
  list: local
  render: always
translationHash: "679d49d26ed92ecb8d446b59749d93d5"
---

# 12 — Fehlerbehandlung und Exception Safety

## Kernidee

C++ bietet mehrere Arten der Fehlerbehandlung. Welche richtig ist, hängt vom Einsatzgebiet ab.

## Exceptions

Exceptions trennen den normalen Kontrollfluss von der Fehlerbehandlung.

```cpp
void handle_work() {
    try {
        risky();
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
    }
}
```

## RAII und Exceptions

RAII sorgt dafür, dass Exceptions sicher verwendet werden können.

```cpp
void f() {
    std::ofstream file("out.txt");
    risky();
} // file closes even if risky throws
```

## Garantien der Exception Safety

### Basisgarantie

Das Programm bleibt in einem gültigen Zustand; es entstehen keine Leaks oder beschädigten Invarianten.

### Starke Garantie

Die Operation gelingt entweder vollständig oder bleibt ohne Wirkung.

### No-Throw-Garantie

Die Operation wirft keine Exception.

Sie wird für Destruktoren und viele Move-Operationen verwendet.

## `noexcept`

Markiere Funktionen, die keine Exception werfen sollen.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

Destruktoren sollten im Allgemeinen keine Exception werfen.

## Fehlercodes

In manchen Bereichen werden Exceptions vermieden, insbesondere bei Embedded-Systemen, Game Engines, Low-Latency-Trading und in Teilen der Systemprogrammierung.

```cpp
enum class Error {
    None,
    NotFound,
    PermissionDenied
};
```

## `std::optional`

Verwende es für einfache Abwesenheit eines Wertes.

```cpp
std::optional<User> find_user(int id);
```

## `std::expected`

C++23 bietet mit `std::expected` einen Typ für Wert-oder-Fehler. Manche Projekte verwenden schon vorher ähnliche Bibliothekstypen.

```cpp
#include <expected>

std::expected<User, Error> load_user(int id);
```

## Wahl der Fehlerbehandlung

- Verwende Exceptions für unerwartete Fehler auf Anwendungsebene, wenn die Codebasis sie erlaubt.
- Verwende Fehlercodes oder `expected` in performancekritischen oder exceptionfreien Umgebungen.
- Verwende `optional` für Werte, die einfach vorhanden oder nicht vorhanden sein können.
- Verwende Exceptions nicht für den normalen Kontrollfluss.

## Häufige Fehler

- Exceptions aus Destruktoren werfen.
- Exceptions als Wert statt als `const&` abfangen.
- Alle Exceptions ohne Protokollierung verschlucken.
- `optional` verwenden, obwohl Fehlerdetails benötigt werden.
- Magische Zahlen wie `-1` für jeden Fehler zurückgeben.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Was hat RAII mit Exceptions zu tun?
- Was ist die starke Exception-Garantie?
- Warum sollten Destruktoren keine Exceptions werfen?
- Wann reicht `optional` nicht aus?
- Warum vermeiden manche C++-Einsatzgebiete Exceptions?
