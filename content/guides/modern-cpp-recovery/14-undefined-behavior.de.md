---
title: "14 — Undefiniertes Verhalten und Speichersicherheit"
description: "Undefiniertes Verhalten bedeutet, dass der C++-Standard keinerlei Anforderungen an das weitere Geschehen stellt. Das Programm kann scheinbar funktionieren, abstürzen, Daten beschädigen oder verwundbar werden."
weight: 14
type: "guide"
build:
  list: local
  render: always
translationHash: "9e9264e94387a1de8e4a92d8dc0935a1"
---

# 14 — Undefiniertes Verhalten und Speichersicherheit

## Kernidee

Undefiniertes Verhalten bedeutet, dass der C++-Standard keinerlei Anforderungen an das weitere Geschehen stellt. Das Programm kann scheinbar funktionieren, abstürzen, Daten beschädigen oder verwundbar werden.

## Häufiges undefiniertes Verhalten

### Use-after-free

```cpp
int* p = new int(42);
delete p;
std::cout << *p; // UB
```

### Hängende Referenz

```cpp
const std::string& bad() {
    std::string s = "hello";
    return s; // UB when used
}
```

### Zugriff außerhalb der Grenzen

```cpp
std::vector<int> v = {1, 2, 3};
std::cout << v[10]; // UB
```

Verwende `.at()`, wenn du eine Grenzprüfung möchtest:

```cpp
v.at(10); // throws
```

### Nicht initialisierte Variablen

```cpp
int x;
std::cout << x; // invalid: do not read uninitialized automatic objects
```

In der Terminologie vor C++26 wird dies meist als Lesen eines unbestimmten Wertes beschrieben; C++26 präzisiert die Begriffe für unbestimmte und fehlerhafte Werte. Die praktische Regel bleibt gleich: Initialisiere vor dem Lesen.

### Vorzeichenbehafteter Integer-Überlauf

```cpp
int x = INT_MAX;
++x; // UB
```

### Data Races

Ein Data Race ist undefiniertes Verhalten: Zwei widersprüchliche Auswertungen greifen gleichzeitig auf denselben Speicher zu, mindestens eine verändert ihn und zwischen ihnen besteht keine Happens-before-Beziehung.

## Ungültigwerden von Iteratoren

```cpp
std::vector<int> v = {1, 2, 3};
auto it = v.begin();
v.push_back(4); // may invalidate it
std::cout << *it; // maybe UB
```

## Strict Aliasing und Casts

Unsichere Casts können Annahmen verletzen, auf die sich der Compiler stützt.

Vermeide raffinierte Neuinterpretationen von Zeigern, sofern du nicht genau weißt, was du tust.

## Warum UB gefährlich ist

Compiler optimieren unter der Annahme, dass UB nicht auftritt. Deshalb kann UB in optimierten Builds überraschendes Verhalten erzeugen.

## Werkzeuge zum Auffinden von UB

Verwende Sanitizer:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Thread Sanitizer:

```bash
-fsanitize=thread
```

Nutze außerdem:

- Warnungen: `-Wall -Wextra -Wpedantic`,
- statische Analyse: `clang-tidy`,
- Debugger: `gdb`, `lldb`,
- Valgrind, wo es sinnvoll ist.

## Sicherheitsgewohnheiten

- Bevorzuge RAII.
- Bevorzuge Standardcontainer.
- Vermeide rohe besitzende Zeiger.
- Initialisiere Variablen.
- Verwende Referenzen nur bei klaren Lebensdauern.
- Vermeide ungeprüfte Indizierung bei externen Daten.
- Verwende Sanitizer während der Entwicklung.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Was bedeutet undefiniertes Verhalten?
- Warum kann UB nur in optimierten Builds sichtbar werden?
- Was ist eine hängende Referenz?
- Warum kann `vector::push_back` Referenzen ungültig machen?
- Welche Sanitizer solltest du zuerst aktivieren?
