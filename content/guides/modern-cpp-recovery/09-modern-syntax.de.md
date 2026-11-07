---
title: "09 — Moderne Syntax: auto, Lambdas, enum class, constexpr"
description: "Verwende `auto`, wenn der Typ offensichtlich oder ausführlich ist."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "0e94b60cf9e9bee2510b996d0abfd9ee"
---

# 09 — Moderne Syntax: auto, Lambdas, enum class, constexpr

## `auto`

Verwende `auto`, wenn der Typ offensichtlich oder ausführlich ist.

```cpp
auto count = users.size();
auto it = map.find("key");
```

Verwende es nicht, wenn es eine wichtige Bedeutung verbirgt.

```cpp
auto x = get_value(); // unclear if get_value is unclear
```

## Bereichsbasierte For-Schleife

```cpp
for (const auto& user : users) {
    std::cout << user.name << '\n';
}
```

Verwende:

- `auto` für Kopien,
- `auto&` für Veränderungen,
- `const auto&` für schreibgeschützten Zugriff ohne Kopie.

## Lambdas

Lambdas sind inline definierte Funktionsobjekte.

```cpp
auto is_even = [](int x) {
    return x % 2 == 0;
};
```

Mit Capture:

```cpp
int threshold = 10;
auto bigger = [threshold](int x) {
    return x > threshold;
};
```

Capture per Referenz vorsichtig einsetzen:

```cpp
auto f = [&threshold](int x) {
    return x > threshold;
};
```

Stelle sicher, dass referenzierte Objekte länger leben als das Lambda.

## `nullptr`

Verwende `nullptr`, nicht `NULL` oder `0`.

```cpp
User* user = nullptr;
```

## `enum class`

Bevorzuge bereichsgebundene Enumerationen.

```cpp
enum class Status {
    Ok,
    Error,
    Unknown
};

Status s = Status::Ok;
```

Dies vermeidet Namenskonflikte und implizite Ganzzahlkonvertierung.

## Einheitliche Initialisierung

```cpp
User user{"Ada", 42};
std::vector<int> values{1, 2, 3};
```

Beachte, dass Überladungen mit Initializer-Listen manchmal überraschen können.

## `constexpr`

`constexpr` bedeutet, dass etwas nach Möglichkeit zur Kompilierzeit ausgewertet werden kann.

```cpp
constexpr int square(int x) {
    return x * x;
}

constexpr int nine = square(3);
```

## Strukturierte Bindungen

```cpp
auto [it, inserted] = map.insert({"key", 42});
```

Nützlich für Paare, Tupel und Strukturen.

## Initialisierungsanweisungen in If/Switch

```cpp
if (auto it = users.find(id); it != users.end()) {
    // use it
}
```

## Kurzer Selbsttest

Du solltest Folgendes erklären können:

- Wann solltest du `auto` verwenden?
- Was bewirkt ein Lambda-Capture?
- Warum ist `nullptr` vorzuziehen?
- Warum ist `enum class` sicherer als alte Enumerationen?
- Was bringt dir `constexpr`?
