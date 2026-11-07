---
title: "03 — Objektlebensdauer, Stack, Heap und RAII"
description: "C++ ist eine Sprache der Lebensdauern. Für gutes C++ musst du wissen, wann Objekte erzeugt und zerstört werden und wem Ressourcen gehören."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "5cb7dc9782234e7d52ff854179a31bcb"
---

# 03 — Objektlebensdauer, Stack, Heap und RAII

## Kerngedanke

C++ ist eine Sprache der Lebensdauern. Für gutes C++ musst du wissen, wann Objekte erzeugt und zerstört werden und wem Ressourcen gehören.

## Lebensdauer auf dem Stack

Objekte, die in einem Gültigkeitsbereich erzeugt werden, werden automatisch zerstört, wenn dieser Bereich endet.

```cpp
void f() {
    std::string name = "Ada";
} // name is destroyed here
```

Das ist deterministische Bereinigung.

## Lebensdauer auf dem Heap

Heap-Objekte leben, bis sie ausdrücklich freigegeben werden oder ihr Besitzer sie freigibt.

Alter Stil:

```cpp
User* user = new User("Ada");
delete user;
```

Moderner Stil:

```cpp
auto user = std::make_unique<User>("Ada");
```

Der `unique_ptr` löscht das Objekt automatisch.

## RAII

RAII steht für Resource Acquisition Is Initialization.

Eine Ressource wird in einem Konstruktor erworben und in einem Destruktor freigegeben.

Zu Ressourcen gehören:

- Speicher,
- Dateien,
- Sockets,
- Sperren,
- Datenbankverbindungen,
- GPU-Handles,
- Betriebssystem-Handles.

Beispiel:

```cpp
void write_file() {
    std::ofstream file("out.txt");
    file << "hello\n";
} // file closes automatically here
```

## Warum RAII wichtig ist

RAII übernimmt die Bereinigung auch bei Exceptions oder vorzeitigen Rückgaben.

```cpp
void work() {
    std::lock_guard<std::mutex> lock(m);
    // mutex is unlocked automatically when lock leaves scope
}
```

## Destruktoren

Ein Destruktor wird ausgeführt, wenn ein Objekt stirbt.

```cpp
class FileHandle {
public:
    FileHandle() { /* acquire */ }
    ~FileHandle() { /* release */ }
};
```

Moderner Code vermeidet üblicherweise eigene Destruktoren, indem er Typen der Standardbibliothek verwendet, die Ressourcen bereits verwalten.

## Häufige Lebensdauerfehler

### Ungültige Referenz

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s; // dangling reference
}
```

### Zugriff nach Freigabe

```cpp
User* p = new User{};
delete p;
p->name(); // invalid
```

### Zeiger auf lokale Variable zurückgeben

```cpp
int* bad() {
    int x = 42;
    return &x; // invalid after return
}
```

## Faustregel

Wenn eine Ressource bereinigt werden muss, lege sie in ein Objekt, dessen Destruktor die Bereinigung übernimmt.

## Kurzer Selbsttest

Du solltest Folgendes erklären können:

- Wann wird ein Stack-Objekt zerstört?
- Warum ist RAII sicherer als manuelle Bereinigung?
- Warum ist die Rückgabe einer Referenz auf eine lokale Variable ungültig?
- Warum sollten `new` und `delete` in modernem C++ selten sein?
