---
title: "Wiedereinstieg in modernes C++"
description: "Ein kompakter Weg zurück zu C++17/20 für alle, die C++ noch vor dem modernen Sprachstandard gelernt haben."
date: 2026-04-27
guideTags: ["c++", "systems", "recovery"]
type: "guide"
build:
  list: local
  render: always
translationHash: "838f5ef69b7d7f4ab6381a0468c7b891"
---
# Wiedereinstieg in modernes C++

Ein kurzes, praktisches Wiki für jemanden, der etwa 2008 C++ gelernt hat und schnell wieder in modernes C++17/20 einsteigen möchte.

## Wie man dieses Wiki benutzt

Gehe die Seiten in der vorgegebenen Reihenfolge durch. Versuche nicht, alles auswendig zu lernen. Für jedes Thema solltest du verstehen:

1. Welches Problem wird damit gelöst?
2. Was bevorzugt modernes C++?
3. Was sind die üblichen Fehlermodi?
4. Kann ich aus dem Gedächtnis ein kleines Beispiel schreiben?
## Empfohlener Pfad

### Phase 1 — Kern neu aufbauen

1. [Denkmodell für modernes C++](01-modern-cpp-mental-model.md)
2. [Kompilierung, Linken und Projektstruktur](02-compilation-linking.md)
3. [Objektlebensdauer, Stack, Heap und RAII](03-lifetime-raii.md)
4. [Besitz, rohe Zeiger und Smart Pointer](04-ownership-smart-pointers.md)
5. [Wertsemantik und die Rule of 0/3/5](05-value-semantics-rule-of-0-3-5.md)

### Phase 2 — Moderne Sprachfeatures

6. [Verschiebesemantik](06-move-semantics.md)
7. [Const, Referenzen und Parameterübergabe](07-const-references-parameters.md)
8. [STL-Container und Algorithmen](08-stl-containers-algorithms.md)
9. [Moderne Syntax: auto, Lambdas, enum class, constexpr](09-modern-syntax.md)
10. [Moderne Bibliothekstypen](10-modern-library-types.md)
11. [Templates und generische Programmierung](11-templates-generic-programming.md)

### Phase 3 — Ernsthaftes C++

12. [Fehlerbehandlung und Exception Safety](12-error-handling.md)
13. [Nebenläufigkeit: Threads, Mutexe, Atomics](13-concurrency.md)
14. [Undefiniertes Verhalten und Speichersicherheit](14-undefined-behavior.md)
15. [Performance-Grundlagen](15-performance.md)
16. [Tooling: CMake, Debugger, Sanitizer, Tests](16-tooling.md)

### Phase 4 — Einen Anwendungsbereich wählen

17. [Spezialisierungsrichtungen](17-domain-tracks.md)
18. [Projektideen](18-project-ideas.md)
19. [Schnelle Checkliste](19-quick-checklist.md)
20. [Grundlagen und Referenzen](20-grounding-and-references.md)
## Schnellster Praktischer Plan

Wenn Sie einen 30‑Tage‑Sprint planen:

- Woche 1: RAII, Besitz, Smart Pointers, Wertsemantik.
- Woche 2: Move‑Semantik, STL, Lambdas, moderne Syntax.
- Woche 3: CMake, Debugging, Sanitizer, Tests, Grundlagen der Parallelität.
- Woche 4: ein ernsthaftes Projekt erstellen.
## Standard-Ziel-Stack

Wenn Sie nicht wissen, wo Sie anfangen sollen, streben Sie an:

**C++17/20 + Linux + CMake + gdb/lldb + sanitizers + GoogleTest/Catch2 + Python zur Automatisierung.**

Diese Kombination bietet Ihnen eine langlebige technische Grundlage und hält Sie produktiv.
## Grundlagen

Dies ist ein kurzer Wiederherstellungsleitfaden, kein Ersatz für den Standard oder ein vollständiges Lehrbuch. Für autoritative Referenzen und Versionshinweise siehe [Grundlagen und Referenzen](20-grounding-and-references.md).
