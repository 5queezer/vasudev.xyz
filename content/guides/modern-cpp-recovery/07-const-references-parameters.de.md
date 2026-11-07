---
title: "07 — Const, Referenzen und Parameterübergabe"
description: "Funktionssignaturen sollten Besitz, Veränderbarkeit und Optionalität vermitteln."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "abbd414f73e3c1d005e83760aa9b1fe1"
---

# 07 — Const, Referenzen und Parameterübergabe

## Kerngedanke

Funktionssignaturen sollten Besitz, Veränderbarkeit und Optionalität vermitteln.

## `const`

`const` bedeutet, dass das Objekt über diesen Namen nicht verändert werden soll.

```cpp
void print(const std::string& s) {
    std::cout << s << '\n';
}
```

Verwende `const` konsequent für schreibgeschützten Zugriff.

## Referenzen

Verwende eine Referenz, wenn ein Objekt vorhanden sein muss.

```cpp
void update(User& user) {
    user.score += 1;
}
```

Verwende `const&`, wenn du ein potenziell teures Objekt ohne Kopie liest.

```cpp
void print_user(const User& user);
```

## Zeiger

Verwende einen Zeiger, wenn der Parameter optional oder nullfähig ist.

```cpp
void maybe_print(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

## Übergabe als Wert

Übergib kleine, günstige Typen als Wert.

```cpp
void set_age(int age);
```

Übergib auch dann als Wert, wenn du eine Kopie erzeugen oder in ein Element verschieben möchtest.

```cpp
class User {
    std::string name_;
public:
    explicit User(std::string name)
        : name_(std::move(name)) {}
};
```

Dies ermöglicht sowohl kopierende als auch verschiebende Aufrufer.

## Besitz in Parametern

```cpp
void read(const User& user);                 // read only, no ownership
void modify(User& user);                     // mutate, no ownership
void maybe_read(const User* user);           // nullable, no ownership
void take(std::unique_ptr<User> user);       // takes ownership
void share(std::shared_ptr<User> user);      // shares ownership
```

## Rückgabetypen

```cpp
User make_user();                    // returns value
std::optional<User> find_user(int);  // may not exist
User& get_user();                    // caller does not own
std::unique_ptr<User> create_user(); // transfers ownership
```

## Häufige Fehler

### Alles als nicht konstante Referenz übergeben

Schlecht:

```cpp
void process(User& user); // does this modify user?
```

Wenn keine Veränderung stattfindet, verwende:

```cpp
void process(const User& user);
```

### Zeiger verwenden, obwohl Referenzen besser sind

Wenn null kein gültiger Wert ist, bevorzuge eine Referenz.

```cpp
void process(const User& user); // better than const User* if user required
```

### Referenzen auf lokale Variablen zurückgeben

Tu dies niemals:

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s;
}
```

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Besitzt diese Funktion das Objekt?
- Kann das Argument null sein?
- Kann die Funktion das Objekt verändern?
- Sollte dieser Parameter kopiert, referenziert, verschoben oder in Besitz genommen werden?
