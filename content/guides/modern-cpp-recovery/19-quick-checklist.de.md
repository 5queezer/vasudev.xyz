---
title: "19 — Schnelle Checkliste"
description: "Nutze diese Checkliste für eine schnelle Selbsteinschätzung."
weight: 19
type: "guide"
build:
  list: local
  render: always
translationHash: "f65dab7fd47edf7c9b480f2dfbff641b"
---

# 19 — Schnelle Checkliste

Nutze diese Checkliste für eine schnelle Selbsteinschätzung.

## Grundlagen von modernem C++

- [ ] Ich verstehe die Lebensdauer auf Stack und Heap.
- [ ] Ich kann RAII erklären.
- [ ] Ich vermeide manuelles `new` und `delete` in normalem Code.
- [ ] Ich weiß, wann ich `unique_ptr` verwende.
- [ ] Ich weiß, wann ich `shared_ptr` nicht verwende.
- [ ] Ich verstehe rohe Zeiger als nicht besitzende Views.
- [ ] Ich verstehe Referenzen im Vergleich zu Zeigern.
- [ ] Ich kann Const Correctness erklären.

## Move- und Wertsemantik

- [ ] Ich weiß, was `std::move` tatsächlich tut.
- [ ] Ich weiß, was ein Objekt im moved-from-Zustand bedeutet.
- [ ] Ich verstehe Kopierkonstruktor und Kopierzuweisung.
- [ ] Ich verstehe Move-Konstruktor und Move-Zuweisung.
- [ ] Ich kenne Rule of 0, Rule of 3 und Rule of 5.
- [ ] Ich bevorzuge Wertsemantik, wenn möglich.

## STL

- [ ] Ich verwende `std::vector` als Standard-Sequence-Container.
- [ ] Ich kenne den Unterschied zwischen `map` und `unordered_map`.
- [ ] Ich kenne den Unterschied zwischen `set` und `unordered_set`.
- [ ] Ich verstehe das Ungültigwerden von Iteratoren.
- [ ] Ich kann `sort`, `find`, `count`, `transform` und `remove_if` verwenden.
- [ ] Ich kann Lambdas für Algorithmen schreiben.

## Moderne Syntax

- [ ] Ich verwende `auto` angemessen.
- [ ] Ich verwende bereichsbasierte `for`-Schleifen.
- [ ] Ich verwende Lambdas.
- [ ] Ich verwende `nullptr`.
- [ ] Ich verwende `enum class`.
- [ ] Ich verstehe die Grundlagen von `constexpr`.
- [ ] Ich kann Structured Bindings lesen.

## Moderne Bibliothekstypen

- [ ] Ich weiß, wann ich `optional` verwende.
- [ ] Ich weiß, wann ich `variant` verwende.
- [ ] Ich verstehe die Lebensdauerrisiken von `string_view`.
- [ ] Ich verstehe `span` als nicht besitzenden View.
- [ ] Ich kann `filesystem` verwenden.
- [ ] Ich kann Zeitspannen von `chrono` verwenden.

## Templates

- [ ] Ich kann ein Funktionstemplate schreiben.
- [ ] Ich kann ein einfaches Klassentemplate schreiben.
- [ ] Ich verstehe Template-Instanziierung.
- [ ] Ich kann einfache, durch Concepts eingeschränkte Templates lesen.

## Fehlerbehandlung

- [ ] Ich verstehe Exceptions.
- [ ] Ich verstehe die Grundlagen der Exception Safety.
- [ ] Ich weiß, warum Destruktoren keine Exceptions werfen sollten.
- [ ] Ich weiß, wann `optional` nicht ausreicht.
- [ ] Ich weiß, dass manche Einsatzgebiete Exceptions vermeiden.

## Nebenläufigkeit

- [ ] Ich kann einen Thread erzeugen und joinen.
- [ ] Ich weiß, was ein Data Race ist.
- [ ] Ich kann `mutex` und `lock_guard` verwenden.
- [ ] Ich verstehe Condition Variables auf grundlegender Ebene.
- [ ] Ich verstehe Atomics auf grundlegender Ebene.
- [ ] Ich weiß, was ein Deadlock ist.

## Sicherheit und Performance

- [ ] Ich kenne häufige Fälle von undefiniertem Verhalten.
- [ ] Ich verwende Sanitizer.
- [ ] Ich verstehe die Grundlagen der Cache-Lokalität.
- [ ] Ich weiß, warum Heap-Allokationen teuer sein können.
- [ ] Ich profiliere, bevor ich optimiere.
- [ ] Ich verstehe `reserve`.

## Tooling

- [ ] Ich kann mit CMake bauen.
- [ ] Ich kann mit gdb/lldb debuggen.
- [ ] Ich kann AddressSanitizer und UBSan aktivieren.
- [ ] Ich kann Code mit clang-format formatieren.
- [ ] Ich kann grundlegende Tests mit Catch2 oder GoogleTest ausführen.

## Portfolio

- [ ] Ich habe ein ernsthaftes C++-Projekt.
- [ ] Es hat ein README.
- [ ] Es hat Tests.
- [ ] Es verwendet CMake.
- [ ] Es enthält Anweisungen für Sanitizer.
- [ ] Es demonstriert ein Fachgebiet und nicht nur Syntax.
