---
title: "01 — Denkmodell für modernes C++"
description: "Modernes C++ ist nicht „C mit Klassen“. Es ist eine Sprache zum Bau effizienter Systeme mit explizitem Besitz, deterministischer Bereinigung, Wertsemantik und kostenfreien Abstraktionen."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "9c38f3c93cfb3f2639dff5416efa25b4"
---

# 01 — Denkmodell für modernes C++

## Kerngedanke

Modernes C++ ist nicht „C mit Klassen“. Es ist eine Sprache zum Bau effizienter Systeme mit explizitem Besitz, deterministischer Bereinigung, Wertsemantik und kostenfreien Abstraktionen.

Wenn du C++ etwa 2008 gelernt hast, ist dies die größte Veränderung:

> Altes C++ vermittelte häufig manuelle Speicherverwaltung. Modernes C++ vermittelt Besitz und RAII.

## Was sich seit 2008 geändert hat

C++11 hat die Sprache grundlegend verändert. C++14, 17, 20 und 23 haben diese Entwicklung fortgesetzt.

Wichtige moderne Konzepte:

- RAII überall.
- Werte sind rohen Zeigern vorzuziehen.
- Typen der Standardbibliothek sind manueller Speicherverwaltung vorzuziehen.
- Verwende `std::unique_ptr` für exklusiven Besitz.
- Verwende `std::shared_ptr` nur, wenn Besitz wirklich geteilt wird.
- Verstehe Verschiebesemantik.
- Verwende `auto`, Lambdas, bereichsbasierte Schleifen, `nullptr` und `enum class`.
- Verwende CMake, Sanitizer, Debugger und Tests.

## Prioritäten des modernen Stils

Bevorzuge dies:

```cpp
std::vector<std::string> names;
```

Stattdessen:

```cpp
char** names;
```

Bevorzuge dies:

```cpp
auto user = std::make_unique<User>("Ada");
```

Stattdessen:

```cpp
User* user = new User("Ada");
delete user;
```

Bevorzuge dies:

```cpp
for (const auto& item : items) {
    process(item);
}
```

Stattdessen:

```cpp
for (int i = 0; i < items.size(); ++i) {
    process(items[i]);
}
```

## Was C++ wertvoll macht

C++ ist wertvoll, weil es die Realität offenlegt:

- Speicherlayout,
- Objektlebensdauer,
- Leistung,
- Nebenläufigkeit,
- Cache-Verhalten,
- Ressourcenbesitz,
- undefiniertes Verhalten,
- Hardware- und Betriebssystemgrenzen.

Das ist zugleich der Grund, warum es schwierig ist.

## Was du vermeiden solltest

Schreibe modernes C++ nicht so, als wäre es C++ von 1998:

- Vermeide rohe Zeiger mit Besitzfunktion.
- Vermeide manuelles `new` / `delete` in normalem Code.
- Vermeide C-Arrays, wenn `std::array` oder `std::vector` geeignet ist.
- Vermeide unnötige Vererbung.
- Vermeide Makros, wenn Sprachmittel ausreichen.
- Vermeide raffinierten Template-Code, bevor du gewöhnlichen Code verstehst.

## Kurzer Selbsttest

Du findest dich in modernem C++ wieder zurecht, wenn du Folgendes erklären kannst:

- Warum RAII wichtig ist.
- Wann `unique_ptr` und wann `shared_ptr` verwendet wird.
- Was `std::move` tatsächlich tut.
- Warum `std::vector` normalerweise der Standardcontainer ist.
- Warum undefiniertes Verhalten gefährlich ist.
- Wie man ein kleines C++-Projekt baut und debuggt.
