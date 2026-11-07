---
title: "12 — Werkzeuge und Tests"
description: "Die alltägliche TypeScript-Werkzeugkette: Paketmanager, tsc als Gate, ESLint und Prettier, Vitest und die Lint-Regeln gegen die häufigsten Fehler."
weight: 12
type: "guide"
build:
  list: local
  render: always
translationHash: "ff3f6ff5086bbb5cfe3a7788e9a45c8a"
---

# 12 — Werkzeuge und Tests

Bei den Werkzeugen fühlt sich ein erfahrener Entwickler am schnellsten zu Hause, denn die Anliegen sind bereits bekannt: Abhängigkeitsverwaltung, Linting, Formatierung, Typprüfung und Tests. Hier ist die TypeScript-spezifische Zuordnung.

## Paketmanager

`npm` wird mit Node ausgeliefert und ist die sichere Standardwahl. `pnpm` ist wegen seiner Geschwindigkeit und seines strikten, speichereffizienten Layouts für Abhängigkeiten weit verbreitet; viele Teams standardisieren darauf. `yarn` ist ebenfalls noch häufig anzutreffen. Im Alltag sind sie größtenteils austauschbar. Die Lockdatei (`package-lock.json`, `pnpm-lock.yaml` oder `yarn.lock`) garantiert reproduzierbare Installationen und gehört deshalb ins Repository.

Abhängigkeiten teilen sich in `dependencies` (zur Laufzeit benötigt) und `devDependencies` (nur für Build und Tests benötigt). TypeScript selbst, reine Typ-Pakete unter `@types/*`, Linter und Test Runner gehören in `devDependencies`.

## tsc als Gate für die Typprüfung

Auch wenn ein Bundler oder Runner deinen Code kompiliert, führe den Type Checker separat in der CI aus:

```bash
tsc --noEmit
```

Das entspricht deiner Kompilierprüfung. Der Befehl findet Typfehler, ohne Dateien zu erzeugen. Mache ihn zu einem verpflichtenden CI-Schritt. Typfehler sollen den Build abbrechen und nicht ausgeliefert werden.

## Linting und Formatierung

- **ESLint** mit `typescript-eslint` ist der Standard-Linter. Er findet Fehler, die das Typsystem nicht erkennt; typbewusste Regeln können Typinformationen für tiefere Prüfungen nutzen.
- **Prettier** formatiert Code, damit Stilfragen nie Gegenstand eines Reviews sind. Viele Teams führen es über ESLint oder als separaten Schritt aus.
- **Biome** ist ein neueres, schnelles Einzelwerkzeug für Linting und Formatierung und etabliert sich als Alternative zur Kombination aus ESLint und Prettier.

Diese Lint-Regeln sollten früh aktiviert werden, weil sie die in diesem Leitfaden beschriebenen Fehler erkennen:

- `no-floating-promises`: markiert nicht mit `await` behandelte Promises, deren Fehler verloren gehen.
- `no-explicit-any`: lenkt dich zu `unknown` und echten Typen.
- `no-misused-promises`: erkennt, wenn eine asynchrone Funktion an einer Stelle übergeben wird, die eine synchrone erwartet.

## Tests

- **Vitest** ist der verbreitete moderne Test Runner. Er ist schnell, bietet eine Jest-kompatible API und verarbeitet TypeScript und ESM mit wenig Konfiguration. Eine starke Standardwahl für neue Projekte.
- **Jest** ist der langjährige Platzhirsch und immer noch überall anzutreffen; seine API solltest du erkennen.
- **Playwright** ist der Standard für End-to-End-Tests im Browser.

Ein Vitest-Test sieht so aus:

```ts
import { describe, it, expect } from "vitest";
import { add } from "./math";

describe("add", () => {
  it("sums two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

Die Testkonzepte lassen sich direkt aus jeder dir bekannten Sprache übertragen: Arrange, Act, Assert. Mocke an Grenzen. Teste Verhalten statt Implementierungsdetails. Neu ist nur die API des Runners.

## Ein Hinweis zum Vertrauen in Typen

Zwei Gewohnheiten erhöhen deine Grundqualität sofort. Erstens: Lass `strict` aktiviert und halte `tsc --noEmit` grün. Zweitens: Betrachte `any`, `as` und `!` als Dinge, die du begründen musst, denn jedes davon ist eine Stelle, an der du den Compiler überstimmt hast. In einer Codebasis mit wenigen solchen Stellen und validierten Grenzen bedeuten die Typen tatsächlich etwas.

## Kurzer Selbsttest

- Warum `tsc --noEmit` in der CI ausführen, wenn ein Bundler den Code bereits kompiliert?
- Wie unterscheiden sich `dependencies` und `devDependencies`?
- Welche drei Lint-Regeln verhindern die häufigsten Fehler bei asynchronem Code und Typisierung?
- Welcher moderne Test Runner ist die Standardwahl, und welcher API ähnelt er?
