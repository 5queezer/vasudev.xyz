---
title: "04 — Besitz, rohe Zeiger und Smart Pointer"
description: "Moderner C++-Code sollte Besitzverhältnisse eindeutig machen."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "d090afe2d958e5f70ab82ce56c00899c"
---

# 04 — Besitz, rohe Zeiger und Smart Pointer

## Kerngedanke

Moderner C++-Code sollte Besitzverhältnisse eindeutig machen.

Besitz bedeutet Verantwortung dafür, ein Objekt zu zerstören oder eine Ressource freizugeben.

## Rohe Zeiger

Rohe Zeiger eignen sich als Referenzen ohne Besitzfunktion.

```cpp
void print_user(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

Rohe Zeiger mit Besitzfunktion sind jedoch gefährlich.

Vermeide:

```cpp
User* user = new User{}; // who deletes this?
```

## Referenzen

Verwende Referenzen, wenn das Objekt vorhanden sein muss und nicht null sein kann.

```cpp
void print_user(const User& user) {
    std::cout << user.name << '\n';
}
```

## `std::unique_ptr`

Verwende `unique_ptr` für exklusiven Besitz.

```cpp
auto user = std::make_unique<User>("Ada");
```

Eigenschaften:

- ein Besitzer,
- verschiebbar,
- nicht kopierbar,
- löscht automatisch.

Besitz übergeben:

```cpp
void take_user(std::unique_ptr<User> user);

auto user = std::make_unique<User>();
take_user(std::move(user));
```

## `std::shared_ptr`

Verwende `shared_ptr` nur, wenn Besitz wirklich geteilt wird.

```cpp
auto user = std::make_shared<User>();
```

Eigenschaften:

- referenzgezählt,
- kopierbar,
- löscht, wenn der letzte Besitzer stirbt,
- verursacht Laufzeitaufwand,
- kann Zyklen bilden.

## `std::weak_ptr`

Verwende `weak_ptr`, um ein `shared_ptr`-Objekt zu beobachten, ohne es zu besitzen.

```cpp
std::weak_ptr<User> weak = shared;

if (auto user = weak.lock()) {
    // safe to use user
}
```

## Den richtigen Typ wählen

```cpp
void read(const User& u);                 // must exist, no ownership
void maybe_read(const User* u);           // optional, no ownership
void take(std::unique_ptr<User> u);       // takes ownership
void share(std::shared_ptr<User> u);      // shares ownership
```

## Häufige Fehler

### `shared_ptr` übermäßig verwenden

Verwende `shared_ptr` nicht nur deshalb, weil es sich sicher anfühlt. Geteilter Besitz macht Lebensdauern schwerer nachvollziehbar.

### `delete` manuell aufrufen

Wenn du Smart Pointer richtig verwendest, rufst du `delete` fast nie direkt auf.

### Rohe Zeiger mit Besitzfunktion zurückgeben

Vermeide:

```cpp
User* make_user();
```

Bevorzuge:

```cpp
std::unique_ptr<User> make_user();
```

## Kurzer Selbsttest

Du solltest Folgendes beantworten können:

- Wem gehört dieses Objekt?
- Kann dieser Zeiger null sein?
- Sollte diese Funktion den Besitz übernehmen?
- Warum ist `unique_ptr` normalerweise besser als `shared_ptr`?
- Welches Problem löst `weak_ptr`?
