---
title: "08 — STL-Container und Algorithmen"
description: "Die Standardbibliothek ist der Standardwerkzeugkasten. Moderner C++-Code sollte Container und Algorithmen statt manueller Speicherverwaltung und überall selbst geschriebener Schleifen verwenden."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "28e0e1cb54a03ff2b7d733e53a34348e"
---

# 08 — STL-Container und Algorithmen

## Kerngedanke

Die Standardbibliothek ist der Standardwerkzeugkasten. Moderner C++-Code sollte Container und Algorithmen statt manueller Speicherverwaltung und überall selbst geschriebener Schleifen verwenden.

## Standardcontainer: `std::vector`

Verwende `std::vector`, sofern es keinen konkreten Grund dagegen gibt.

```cpp
std::vector<int> values = {1, 2, 3};
values.push_back(4);
```

Seine Vorteile:

- zusammenhängender Speicher,
- cachefreundlich,
- schnelle Iteration,
- einfache Besitzverhältnisse.

## Weitere häufige Container

```cpp
std::array<int, 3> fixed = {1, 2, 3};
std::deque<int> dq;
std::map<std::string, int> ordered;
std::unordered_map<std::string, int> hashed;
std::set<int> unique_sorted;
std::unordered_set<int> unique_hashed;
std::queue<int> q;
std::stack<int> st;
std::priority_queue<int> pq;
```

## Container auswählen

- `vector`: Standardsequenz.
- `array`: Stack-Array fester Größe.
- `deque`: schnelles Einfügen vorne und hinten.
- `map`: sortierte Schlüssel, baumbasiert.
- `unordered_map`: Hashtabelle, oft schnellere Suche.
- `set`: sortierte eindeutige Werte.
- `unordered_set`: eindeutige gehashte Werte.

## Iteratoren

Iteratoren sind verallgemeinerte Zeiger in Container.

```cpp
auto it = values.begin();
std::cout << *it << '\n';
```

## Ungültigwerden von Iteratoren

Einige Operationen machen vorhandene Iteratoren oder Referenzen ungültig.

Beispiel: `vector::push_back` kann neu allokieren und Referenzen ungültig machen.

```cpp
std::vector<int> v = {1, 2, 3};
int& ref = v[0];
v.push_back(4); // ref may now be invalid
```

## Algorithmen

Bevorzuge Standardalgorithmen für häufige Operationen.

```cpp
std::sort(values.begin(), values.end());

auto it = std::find(values.begin(), values.end(), 42);

auto count = std::count(values.begin(), values.end(), 7);
```

## Lambdas mit Algorithmen

```cpp
std::sort(users.begin(), users.end(), [](const User& a, const User& b) {
    return a.score < b.score;
});
```

## Remove-Erase-Idiom

```cpp
values.erase(
    std::remove_if(values.begin(), values.end(), [](int x) { return x < 0; }),
    values.end()
);
```

## Häufige Fehler

- `list` verwenden, weil Einfügen vermeintlich immer schneller ist.
- Das Ungültigwerden von Iteratoren vergessen.
- Für alles manuelle Schleifen schreiben.
- `map` verwenden, obwohl `unordered_map` ausreicht.
- Rohe Zeiger mit Besitzfunktion in Containern speichern.

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Warum ist `vector` üblicherweise der Standard?
- Wann würdest du `unordered_map` statt `map` verwenden?
- Was bedeutet das Ungültigwerden eines Iterators?
- Wie sortierst du mit einer eigenen Vergleichsfunktion?
- Was ist das Remove-Erase-Idiom?
