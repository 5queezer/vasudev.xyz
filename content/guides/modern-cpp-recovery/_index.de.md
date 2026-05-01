---
title: "Modernes C++-Recovery-Handbuch"
description: "Ein kompakter Wiederherstellungsweg, um nach dem Erlernen von vor‑modernen C++ wieder zu C++17/20 zurückzukehren."
date: 2026-04-27
guideTags: ["c++", "systems", "recovery"]
type: "guide"
build:
  list: local
  render: always
translationHash: "838f5ef69b7d7f4ab6381a0468c7b891"
chunkHashes: "9a84462dc0b46c33,86622b9c289faaac,1d4e7cc51f142c37,b4715dd94a30045a,3f5fdd4571657156,adbe3d6449091861"
---
# Modern C++ Recovery Guide

Ein kurzes, praktisches Wiki für jemanden, der etwa 2008 C++ gelernt hat und schnell wieder in modernes C++17/20 einsteigen möchte.
## Wie man dieses Wiki benutzt

Gehe die Seiten in der vorgegebenen Reihenfolge durch. Versuche nicht, alles auswendig zu lernen. Für jedes Thema solltest du verstehen:

1. Welches Problem wird damit gelöst?
2. Was bevorzugt modernes C++?
3. Was sind die üblichen Fehlermodi?
4. Kann ich aus dem Gedächtnis ein kleines Beispiel schreiben?
## Empfohlener Pfad

### Phase 1 — Kern neu aufbauen

1. [Mental Model: Modern C++](01-modern-cpp-mental-model.md)
2. [Compilation, Linking, and Project Shape](02-compilation-linking.md)
3. [Object Lifetime, Stack, Heap, and RAII](03-lifetime-raii.md)
4. [Ownership, Raw Pointers, and Smart Pointers](04-ownership-smart-pointers.md)
5. [Value Semantics and Rule of 0/3/5](05-value-semantics-rule-of-0-3-5.md)

### Phase 2 — Moderne Sprachfeatures

6. [Move Semantics](06-move-semantics.md)
7. [Const, References, and Parameter Passing](07-const-references-parameters.md)
8. [STL Containers and Algorithms](08-stl-containers-algorithms.md)
9. [Modern Syntax: auto, Lambdas, enum class, constexpr](09-modern-syntax.md)
10. [Optional, Variant, String View, Span, Filesystem, Chrono](10-modern-library-types.md)
11. [Templates and Generic Programming](11-templates-generic-programming.md)

### Phase 3 — Ernsthaftes C++

12. [Error Handling and Exception Safety](12-error-handling.md)
13. [Concurrency: Threads, Mutexes, Atomics](13-concurrency.md)
14. [Undefined Behavior and Memory Safety](14-undefined-behavior.md)
15. [Performance Fundamentals](15-performance.md)
16. [Tooling: CMake, Debuggers, Sanitizers, Testing](16-tooling.md)

### Phase 4 — Einen Anwendungsbereich wählen

17. [Domain Tracks](17-domain-tracks.md)
18. [Project Ideas](18-project-ideas.md)
19. [Quick Checklist](19-quick-checklist.md)
20. [Grounding and References](20-grounding-and-references.md)
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

Dies ist ein kurzer Wiederherstellungsleitfaden, kein Ersatz für den Standard oder ein vollständiges Lehrbuch. Für autoritative Referenzen und Versionshinweise siehe [Grounding and References](20-grounding-and-references.md).