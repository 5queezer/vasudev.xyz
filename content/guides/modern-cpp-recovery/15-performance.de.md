---
title: "15 — Performance-Grundlagen"
description: "C++ gibt dir Kontrolle über die Performance, aber du musst messen. Raten ist unzuverlässig."
weight: 15
type: "guide"
build:
  list: local
  render: always
translationHash: "931af5fb602361085769002579409691"
---

# 15 — Performance-Grundlagen

## Kernidee

C++ gibt dir Kontrolle über die Performance, aber du musst messen. Raten ist unzuverlässig.

## Zuerst messen

Verwende Profiler, bevor du optimierst.

Werkzeuge:

- `perf` unter Linux,
- Instruments unter macOS,
- Visual Studio Profiler unter Windows,
- `valgrind/callgrind`,
- Compilerberichte,
- Benchmarks mit Google Benchmark.

## Big O bleibt wichtig

Ein `O(n log n)`-Algorithmus schlägt bei großen Datenmengen normalerweise `O(n^2)`.

Aber auch konstante Faktoren, Speicherlayout und Cacheverhalten sind wichtig.

## Cache-Lokalität

Zusammenhängender Speicher ist schnell.

```cpp
std::vector<User> users;
```

Ist normalerweise besser als:

```cpp
std::vector<std::unique_ptr<User>> users;
```

Außer du brauchst Polymorphie, stabile Adressen oder unabhängigen Besitz.

## Allokationskosten

Heap-Allokationen sind vergleichsweise teuer.

Vermeide unnötige Allokationen in Hot Loops.

Schlecht:

```cpp
for (int i = 0; i < 10; ++i) {
    auto p = std::make_unique<Item>();
}
```

Möglicherweise besser:

```cpp
std::vector<Item> items;
items.reserve(10);
```

## Unnötige Kopien vermeiden

Verwende Referenzen für große, schreibgeschützte Objekte.

```cpp
void process(const std::vector<int>& values);
```

Verwende Move-Semantik, wenn du Besitz überträgst.

```cpp
class Holder {
    std::vector<int> data_;
public:
    void set(std::vector<int> data) {
        this->data_ = std::move(data);
    }
};
```

## `reserve`

Wenn du die Größe kennst, reserviere Kapazität.

```cpp
std::vector<int> v;
v.reserve(1000);
```

## Verzweigungen und Layout

Heißer Code kann beeinflusst werden durch:

- Sprungvorhersage,
- Cache Misses,
- False Sharing,
- Speicherausrichtung,
- virtuelle Aufrufe,
- Allokationsmuster.

Optimiere diese Dinge nicht blind. Miss sie.

## Compileroptimierung

Häufige Flags:

```bash
-O0  # no optimization, debugging
-O2  # good production default
-O3  # more aggressive, not always better
-g   # debug symbols
```

## Performance-Denkweise

Gute Performance entsteht häufig durch:

- bessere Algorithmen,
- besseres Datenlayout,
- weniger Allokationen,
- weniger Kopien,
- einfacheren Besitz,
- gebündelte Verarbeitung,
- den richtigen Container.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Warum ist `vector` cachefreundlich?
- Warum können Heap-Allokationen Hot Paths ausbremsen?
- Was bewirkt `reserve`?
- Warum solltest du vor dem Optimieren profilieren?
- Was ist False Sharing?
