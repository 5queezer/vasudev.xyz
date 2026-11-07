---
title: "02 — Der Kern des Typsystems"
description: "Typaliase, Interfaces, Unions, Intersections, Literale und der alltägliche Wortschatz, mit dem du Daten in TypeScript beschreibst."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "4308b4ade3ae7087dd7e28981510d7ea"
---

# 02 — Der Kern des Typsystems

Das ist dein alltäglicher Wortschatz. Beherrsche diese Konzepte, und der größte Teil des TypeScript-Codes wird lesbar.

## Primitive Typen und Inferenz

Die primitiven Typen sind `string`, `number`, `boolean`, `bigint`, `symbol`, `null` und `undefined`. Es gibt weder `int` noch `float`. Alle Zahlen sind vom Typ `number`. Ganzzahlen mit beliebiger Genauigkeit verwenden `bigint`.

Überlasse die Inferenz dem Compiler, wenn der Typ offensichtlich ist. Annotiere Funktionsparameter, Rückgabetypen öffentlicher Funktionen und alles, was mehrdeutig ist.

```ts
const count = 3;          // inferred as number
const name = "Ada";       // inferred as string
let items: string[] = []; // annotate, otherwise inferred as any[] in some cases
```

## `type` oder `interface`

Beide geben einem Typ einen Namen. Als praktische Richtlinie gilt:

- Verwende `interface` für Objektformen, die voraussichtlich implementiert oder erweitert werden, insbesondere für öffentliche API-Oberflächen. Interfaces unterstützen Declaration Merging und `extends`.
- Verwende `type` für alles andere: Unions, Intersections, Tupel, Funktionstypen, Mapped Types und Aliase primitiver Typen.

```ts
interface User {
  id: string;
  email: string;
}

type Id = string;
type Handler = (event: string) => void;
type Pair = [number, number];
```

Für eine gewöhnliche Objektform sind beide nahezu austauschbar. Entscheide dich pro Codebasis für eine Konvention. Ein verbreiteter Standard ist `interface` für Objekte und `type` für Unions und zusammengesetzte Typen.

## Union Types

Eine Union bedeutet „einer dieser Typen“. Sie ist das Arbeitspferd der Modellierung in TypeScript.

```ts
type Status = "active" | "suspended" | "deleted";

function setStatus(s: Status) {
  // s can only be one of the three strings
}
```

Die Zeichenketten in Anführungszeichen sind Literal Types. Ein Literal Type ist ein einzelner exakter Wert, der als Typ verwendet wird. Unions aus String-Literalen ersetzen die meisten Enums in idiomatischem TypeScript.

Unions modellieren auch Optionalität und Fehler:

```ts
type MaybeUser = User | null;
type Parsed = { ok: true; value: number } | { ok: false; error: string };
```

Die zweite Form ist eine Discriminated Union, die im nächsten Kapitel behandelt wird.

## Intersection Types

Eine Intersection bedeutet „alle diese Typen gleichzeitig“. Sie kombiniert Objekttypen.

```ts
type Timestamps = { createdAt: Date; updatedAt: Date };
type UserRow = User & Timestamps;
// UserRow has id, email, createdAt, and updatedAt
```

Intersections sind vor allem zum Zusammensetzen von Objektformen nützlich. Die Intersection inkompatibler primitiver Typen ergibt `never`, den leeren Typ.

## Arrays, Tupel und Readonly

```ts
const ids: string[] = ["a", "b"];        // array
const point: [number, number] = [1, 2];  // fixed-length tuple
const frozen: readonly number[] = [1, 2]; // cannot be mutated through this reference
```

`readonly` wirkt nur zur Kompilierzeit. Es verhindert Mutationen über diese Referenz, friert das Objekt zur Laufzeit aber nicht ein.

## Optional und Nullable

```ts
interface Config {
  host: string;
  port?: number; // optional: number | undefined
}
```

Eine optionale Eigenschaft kann fehlen. Eine nullable Eigenschaft ist vorhanden, kann aber `null` enthalten. Das ist nicht dasselbe. Mit `strictNullChecks` verfolgt der Compiler beide Fälle und zwingt dich, den fehlenden Fall vor der Verwendung zu behandeln.

## `enum` und warum Unions oft gewinnen

TypeScript besitzt `enum`, doch es gehört zu den wenigen Features, die Laufzeitcode erzeugen, statt entfernt zu werden. Viele Teams bevorzugen String-Literal-Unions oder `as const`-Objekte, da sie einfacher und vollständig entfernbar sind:

```ts
const Role = {
  Admin: "admin",
  User: "user",
} as const;

type Role = (typeof Role)[keyof typeof Role]; // "admin" | "user"
```

Verwende `enum`, wenn dein Team bereits darauf standardisiert ist. Andernfalls sind Literal-Unions die leichtere Voreinstellung.

## Kurzer Selbsttest

- Wann würdest du `interface` statt `type` verwenden?
- Wie modellierst du „einen Wert, der einen von drei bekannten Zuständen besitzt“?
- Was ist der Unterschied zwischen einer optionalen und einer nullable Eigenschaft?
- Warum vermeiden viele Codebasen `enum`?
