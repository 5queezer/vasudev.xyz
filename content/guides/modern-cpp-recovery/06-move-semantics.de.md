---
title: "06 — Verschiebesemantik"
description: "Mit Verschiebesemantik kann C++ Ressourcen übertragen, statt sie zu kopieren."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "80cfb3a5af5f88385f6f2a94ead0c8f1"
---

# 06 — Verschiebesemantik

## Kerngedanke

Mit Verschiebesemantik kann C++ Ressourcen übertragen, statt sie zu kopieren.

Das ist eine der größten Veränderungen gegenüber altem C++.

## Kopieren und Verschieben

Kopieren dupliziert einen Wert.

```cpp
std::string a = "hello";
std::string b = a; // copy
```

Verschieben überträgt Ressourcen von einem Objekt auf ein anderes.

```cpp
std::string a = "hello";
std::string b = std::move(a); // move
```

Nach dem Verschieben ist `a` weiterhin gültig, sein Wert ist jedoch nicht spezifiziert. Du kannst es zerstören oder ihm einen neuen Wert zuweisen.

## Warum Verschieben existiert

Manche Objekte sind teuer zu kopieren:

- Vektoren,
- Strings,
- Puffer,
- Datei-Handles,
- Sockets,
- Objekte mit exklusivem Besitz.

Verschieben vermeidet unnötige Allokationen und Kopien.

## Beispiel mit `std::unique_ptr`

`unique_ptr` kann nicht kopiert werden, weil der Besitz exklusiv ist.

```cpp
auto a = std::make_unique<User>();
// auto b = a; // error
```

Er kann jedoch verschoben werden:

```cpp
auto b = std::move(a);
```

Nun besitzt `b` das Objekt und `a` ist leer.

## Lvalues und Rvalues

Stark vereinfacht:

- Lvalue: hat einen Namen oder festen Speicherort.
- Rvalue: temporärer Wert.

```cpp
std::string name = "Ada";        // name is an lvalue
std::string temporary{"Ada"};    // initializer creates a temporary, then temporary is a named lvalue
```

## Rvalue-Referenzen

Verschiebekonstruktoren verwenden häufig `T&&`.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

## `std::move`

`std::move` verschiebt nicht selbst. Es wandelt ein Objekt in ein Rvalue um, sodass daraus verschoben werden kann.

```cpp
std::vector<int> a = {1, 2, 3};
std::vector<int> b = std::move(a);
```

## Verschiebekonstruktor

```cpp
class Buffer {
    std::vector<int> data;
public:
    Buffer(Buffer&& other) noexcept
        : data(std::move(other.data)) {}
};
```

Meistens solltest du dies vom Compiler erzeugen lassen.

## `noexcept`

Verschiebekonstruktoren sollten häufig `noexcept` sein. Container wie `std::vector` können Verschiebeoperationen effizienter einsetzen, wenn bekannt ist, dass sie keine Exception auslösen.

## Häufige Fehler

### Ein verschobenes Objekt verwenden

```cpp
std::string a = "hello";
std::string b = std::move(a);
std::cout << a; // valid but unspecified content
```

### Aus einem `const`-Objekt verschieben

Aus einem `const`-Objekt kann üblicherweise nicht sinnvoll verschoben werden, weil das Verschieben die Quelle verändert.

```cpp
const std::string a = "hello";
std::string b = std::move(a); // likely copies
```

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Was tut `std::move` tatsächlich?
- Warum kann `unique_ptr` verschoben, aber nicht kopiert werden?
- In welchem Zustand befindet sich ein verschobenes Objekt?
- Warum sind Verschiebekonstruktoren häufig `noexcept`?
- Wann solltest du die Rule of 0 bevorzugen, statt Verschiebeoperationen selbst zu schreiben?
