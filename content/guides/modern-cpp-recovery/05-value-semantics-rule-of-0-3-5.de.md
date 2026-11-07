---
title: "05 — Wertsemantik und die Rule of 0/3/5"
description: "Modernes C++ bevorzugt Typen, die sich wie Werte verhalten. Ein guter Typ lässt sich sicher kopieren, verschieben, in Containern speichern, aus Funktionen zurückgeben und zerstören."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "5bb03b547d5152d3ebdce179ac977af2"
---

# 05 — Wertsemantik und die Rule of 0/3/5

## Kerngedanke

Modernes C++ bevorzugt Typen, die sich wie Werte verhalten. Ein guter Typ lässt sich sicher kopieren, verschieben, in Containern speichern, aus Funktionen zurückgeben und zerstören.

## Wertsemantik

Ein Wert besitzt seine Daten und verhält sich vorhersehbar.

```cpp
std::string a = "hello";
std::string b = a; // b has its own value
```

Das ist leichter nachzuvollziehen als verstreute Heap-Objekte hinter rohen Zeigern.

## Rule of 0

Wenn deine Klasse nur Elemente der Standardbibliothek oder ressourcenverwaltende Elemente enthält, benötigst du üblicherweise weder einen eigenen Destruktor noch einen Kopier- oder Verschiebekonstruktor.

```cpp
class User {
public:
    std::string name;
    std::vector<int> scores;
};
```

Das ist der Idealfall.

## Rule of 3

Wenn du eines der folgenden Elemente definierst, brauchst du wahrscheinlich alle drei:

- Destruktor,
- Kopierkonstruktor,
- Kopierzuweisungsoperator.

Das tritt meist in Klassen alten Stils auf, die Speicher manuell besitzen.

```cpp
class Buffer {
    int* data;
    std::size_t size;
public:
    ~Buffer();
    Buffer(const Buffer& other);
    Buffer& operator=(const Buffer& other);
};
```

## Rule of 5

Wenn du mit Verschiebesemantik eine Ressource manuell verwaltest, benötigst du möglicherweise alle fünf:

- Destruktor,
- Kopierkonstruktor,
- Kopierzuweisung,
- Verschiebekonstruktor,
- Verschiebezuweisung.

```cpp
class Buffer {
public:
    ~Buffer();
    Buffer(const Buffer&);
    Buffer& operator=(const Buffer&);
    Buffer(Buffer&&) noexcept;
    Buffer& operator=(Buffer&&) noexcept;
};
```

## Rule of 0 bevorzugen

Statt Speicher manuell zu verwalten:

```cpp
class Buffer {
    std::vector<int> data;
};
```

Damit sind die vom Compiler erzeugten Operationen normalerweise korrekt.

## `= default` und `= delete`

Operationen ausdrücklich als Standard definieren:

```cpp
class User {
public:
    User() = default;
};
```

Operationen deaktivieren:

```cpp
class NonCopyable {
public:
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};
```

## Häufiger Fehler

Wenn deine Klasse einen rohen Zeiger mit Besitzfunktion enthält und den standardmäßigen Kopierkonstruktor verwendet, hast du wahrscheinlich einen Double-Delete-Fehler.

```cpp
class Bad {
    int* data;
};
```

Beim Kopieren wird der Zeiger kopiert, nicht die Daten, auf die er zeigt.

## Kurzer Selbsttest

Du solltest Folgendes erklären können:

- Was bedeutet Wertsemantik für einen Typ?
- Warum wird die Rule of 0 bevorzugt?
- Wann benötigst du die Rule of 5?
- Was bewirkt `= delete`?
- Warum sind rohe Zeiger mit Besitzfunktion in kopierbaren Klassen gefährlich?
