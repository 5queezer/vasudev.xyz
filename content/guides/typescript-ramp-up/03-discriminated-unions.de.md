---
title: "03 — Discriminated Unions und Exhaustiveness"
description: "Mit Discriminated Unions modelliert idiomatisches TypeScript Zustände, Ergebnisse und Ereignisse, während der Compiler die Behandlung jedes Falls erzwingt."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "e850ca21725a512d2c4ade7689832d6e"
---

# 03 — Discriminated Unions und Exhaustiveness

Wenn du Rust-Enums oder Sum Types aus einer funktionalen Sprache kennst, wird dir das vertraut vorkommen. Discriminated Unions sind das wichtigste Modellierungswerkzeug in TypeScript. Hier zeigt das Typsystem seinen eigentlichen Wert.

## Das Muster

Eine Discriminated Union ist eine Union aus Objekttypen, die ein gemeinsames Literal-Feld besitzen: den Discriminant. Der Compiler verwendet dieses Feld, um den Typ innerhalb eines `switch` oder `if` einzugrenzen.

```ts
type Result =
  | { kind: "ok"; value: number }
  | { kind: "error"; message: string };

function handle(r: Result): string {
  switch (r.kind) {
    case "ok":
      return `value is ${r.value}`;   // here r is the "ok" variant
    case "error":
      return `failed: ${r.message}`;  // here r is the "error" variant
  }
}
```

Innerhalb von `case "ok"` weiß TypeScript, dass `r.value` existiert und `r.message` nicht. Das Discriminant-Feld (hier `kind`, jeder Name ist möglich) ermöglicht dieses Narrowing.

## Asynchronen Zustand modellieren

Dieses Muster ersetzt verstreute boolesche Flags wie `isLoading`, `isError` und `data`. Statt vier Booleans, die sich widersprechen können, modellierst du die tatsächlich vorhandenen Zustände:

```ts
type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

Ein unmöglicher Zustand wie „lädt, besitzt zugleich Daten und ist zugleich fehlgeschlagen“ kann nun nicht mehr dargestellt werden. Das ist dieselbe Disziplin wie bei der Modellierung von Zustandsautomaten, ausgedrückt durch Typen.

## Exhaustiveness Checking

Der Compiler soll den Build fehlschlagen lassen, wenn du eine neue Variante hinzufügst und ihre Behandlung vergisst. Das übliche Muster ist eine `never`-Zuweisung im Default-Zweig:

```ts
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "square":
      return s.side ** 2;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

Wenn du später `{ kind: "triangle"; base: number; height: number }` zu `Shape` hinzufügst, aber keinen entsprechenden Fall ergänzt, lässt sich die Zuweisung an `never` nicht mehr kompilieren. Der Compiler zeigt dir jede Stelle, die aktualisiert werden muss. Das ist eines der wertvollsten Muster der Sprache. Verwende es für jede Union, die du mit `switch` behandelst.

## Warum das in Interviews wichtig ist

Wer eine Discriminated Union mit Exhaustiveness Checking verwendet, zeigt, dass er ungültige Zustände nicht darstellbar machen will. Das ist ein konkreter Beleg für einen sicheren Umgang mit dem Typsystem und genau das, worauf erfahrene TypeScript-Reviewer achten.

## Kurzer Selbsttest

- Was macht eine Union „discriminated“ statt zu einer gewöhnlichen Union?
- Wie funktioniert Narrowing innerhalb eines `switch` auf dem Discriminant?
- Wie zwingt dich die `never`-Zuweisung dazu, jeden Fall zu behandeln?
- Warum ist eine Union für asynchronen Zustand besser als drei Booleans?
