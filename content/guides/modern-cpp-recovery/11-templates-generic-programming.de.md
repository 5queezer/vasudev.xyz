---
title: "11 — Templates und generische Programmierung"
description: "Mit Templates schreibst du Code, der mit vielen Typen funktioniert und dennoch in effizienten, typspezifischen Code kompiliert wird."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "37d99baa0c6083b5cb26062fe6969962"
---

# 11 — Templates und generische Programmierung

## Kernidee

Mit Templates schreibst du Code, der mit vielen Typen funktioniert und dennoch in effizienten, typspezifischen Code kompiliert wird.

## Funktionstemplates

```cpp
template <typename T>
T max_value(T a, T b) {
    return a < b ? b : a;
}
```

Verwendung:

```cpp
auto x = max_value(3, 7);
auto y = max_value(2.5, 1.1);
```

## Klassentemplates

```cpp
template <typename T>
class Box {
    T value_;
public:
    explicit Box(T value) : value_(std::move(value)) {}
    const T& value() const { return value_; }
};
```

## Template-Instanziierung

Templates werden kompiliert, wenn sie mit konkreten Typen verwendet werden.

```cpp
Box<int> a{42};
Box<std::string> b{"hello"};
```

Der Compiler erzeugt Code für diese spezifischen Typen.

## Typanforderungen

Template-Code setzt voraus, dass bestimmte Operationen vorhanden sind.

```cpp
template <typename T>
void print_twice(const T& x) {
    std::cout << x << x;
}
```

Hierfür muss `operator<<` für `T` funktionieren.

## Concepts in C++20

Mit Concepts kannst du Typanforderungen klar ausdrücken.

```cpp
#include <concepts>

template <std::integral T>
T add(T a, T b) {
    return a + b;
}
```

## `typename` im Vergleich zu `class`

In Template-Parameterlisten sind beide normalerweise gleichbedeutend:

```cpp
template <typename T>
template <class T>
```

In modernen Beispielen wird `typename` häufiger verwendet.

## Template-Fehler

Fehlermeldungen bei Templates können lang und unübersichtlich sein. Lies ab dem ersten aussagekräftigen Fehler in der Nähe deines Codes und nicht nur die letzte Zeile.

## Häufige Einsatzbereiche

Templates bilden die Grundlage für:

- Container,
- Algorithmen,
- Smart Pointer,
- generische Hilfsfunktionen,
- Programmierung zur Kompilierzeit,
- Zero-Cost-Abstraktionen.

## Nicht übertreiben

Beginne nicht gleich mit raffinierter Template-Metaprogrammierung. Lerne zuerst normale Templates, dann Concepts und erst bei Bedarf fortgeschrittene Muster.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Was erzeugt ein Template?
- Was passiert, wenn ein Typ eine in einem Template verwendete Operation nicht unterstützt?
- Warum sind Templates für die Performance nützlich?
- Was ergänzen Concepts?
- Wann solltest du Templates vermeiden?
