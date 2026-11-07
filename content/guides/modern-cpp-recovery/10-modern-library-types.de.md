---
title: "10 — Moderne Bibliothekstypen"
description: "Verwende optional, wenn ein Wert vorhanden sein kann oder nicht."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "d44d5d95f1b4da50a921aaaa2cf0850a"
---

# 10 — Moderne Bibliothekstypen

## `std::optional`

Verwende diesen Typ, wenn ein Wert vorhanden sein kann oder nicht.

```cpp
std::optional<User> find_user(int id);

if (auto user = find_user(42)) {
    std::cout << user->name << '\n';
}
```

Vermeide Sentinel-Werte wie `-1` oder leere Strings, wenn Abwesenheit eine eigene Bedeutung hat.

## `std::variant`

Verwende diesen Typ für einen Wert, der einen von mehreren bekannten Typen annehmen kann.

```cpp
using Result = std::variant<int, std::string>;
```

So wertest du ihn aus:

```cpp
std::visit([](const auto& value) {
    std::cout << value << '\n';
}, result);
```

## `std::any`

Kann jeden Typ aufnehmen, sollte aber sparsam verwendet werden. Die Klarheit über den Typ geht verloren.

```cpp
std::any value = 42;
```

## `std::string_view`

Eine Ansicht ohne Besitzfunktion auf Stringdaten.

```cpp
void print(std::string_view text) {
    std::cout << text << '\n';
}
```

Wichtig: Die Ansicht besitzt den String nicht. Gib keinen `string_view` auf temporäre Daten zurück.

Schlecht:

```cpp
std::string_view bad() {
    std::string s = "dead";
    return s;
}
```

## `std::span`

Eine Ansicht ohne Besitzfunktion auf zusammenhängenden Speicher.

```cpp
void process(std::span<int> values) {
    for (int& v : values) {
        v += 1;
    }
}
```

Funktioniert mit Vektoren, Arrays und C-Arrays.

## `std::filesystem`

Portable Dateisystemoperationen.

```cpp
#include <filesystem>

namespace fs = std::filesystem;

for (const auto& entry : fs::directory_iterator(".")) {
    std::cout << entry.path() << '\n';
}
```

## `std::chrono`

Typsichere Verarbeitung von Zeitpunkten und Zeitspannen.

```cpp
using namespace std::chrono_literals;

auto timeout = 500ms;
```

Zeit messen:

```cpp
auto start = std::chrono::steady_clock::now();
// work
auto end = std::chrono::steady_clock::now();
```

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Wann solltest du `optional` verwenden?
- Warum ist `string_view` bei falscher Verwendung gefährlich?
- Welches Problem löst `span`?
- Wann ist `variant` besser als Vererbung?
- Warum solltest du `chrono` statt roher Ganzzahlen für Zeit verwenden?
