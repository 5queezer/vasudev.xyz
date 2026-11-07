---
title: "04 — Generics und Constraints"
description: "Generics in TypeScript, Constraints mit extends, Standard-Typparameter und der Inferenzfluss durch generische Funktionen."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "f6403deb16b7c8cbad679bfea40e4b84"
---

# 04 — Generics und Constraints

Generics werden dir vertraut vorkommen, wenn du sie aus einer anderen Sprache kennst. Die Syntax ähnelt Java, C# und Rust. Die wichtigsten Unterschiede liegen in der strukturellen Typisierung und darin, wie konsequent TypeScript Typargumente für dich inferiert.

## Einfache Generics

Eine generische Funktion oder ein generischer Typ erhält einen oder mehrere Typparameter.

```ts
function identity<T>(value: T): T {
  return value;
}

const a = identity("hello"); // T inferred as string, a: string
const b = identity(42);      // T inferred as number, b: number
```

Typargumente gibst du nur selten explizit an. Die Inferenz ermittelt sie normalerweise aus dem Aufruf.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const x = first([1, 2, 3]); // x: number | undefined
```

Beachte den Rückgabetyp `T | undefined`. Ein Array-Zugriff kann `undefined` ergeben, und unter strikten Einstellungen berücksichtigst du das.

## Constraints mit `extends`

Ein Constraint sagt: „T muss mindestens diese Form besitzen.“ Damit kannst du im generischen Funktionskörper Eigenschaften verwenden und die Funktion trotzdem allgemein halten.

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");        // ok, strings have length
longest([1, 2], [3, 4, 5]);  // ok, arrays have length
// longest(1, 2);            // error, number has no length
```

In `T extends Bar` bedeutet `extends` „zuweisbar an“, nicht Klassenvererbung. Es ist eine strukturelle Grenze.

## Auf Schlüssel beschränken

`keyof` erzeugt eine Union aus den Eigenschaftsnamen eines Objekts. Zusammen mit einem Constraint entsteht daraus ein typsicherer Eigenschaftszugriff, ein klassisches Beispiel:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "1", age: 30 };
const age = getProp(user, "age"); // age: number
// getProp(user, "missing");      // error, not a key of user
```

`T[K]` ist ein Indexed Access Type. Er beschreibt den Typ der Eigenschaft `K` auf `T`. Dieses Trio aus `keyof`, dem Constraint `K extends keyof T` und `T[K]` gehört zu den häufigsten generischen Mustern, die du lesen und schreiben wirst.

## Standard-Typparameter

Typparameter können Standardwerte besitzen. Das ist nützlich für konfigurierbare Container und API-Clients.

```ts
interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

const r1: ApiResponse = { status: 200, body: "anything" };       // T is unknown
const r2: ApiResponse<{ id: string }> = { status: 200, body: { id: "1" } };
```

## Wann du keine Generics verwenden solltest

Generics sind für Code gedacht, der tatsächlich parametrisch über einen Typ ist. Wenn eine Funktion nur einen konkreten Typ annimmt, mache sie nicht generisch. Zu viele Generics erzeugen schwer lesbare Signaturen ohne Nutzen. Eine einzelne konkrete Union ist oft verständlicher als ein Generic mit drei Constraints.

## Kurzer Selbsttest

- Was bedeutet `extends` in einem generischen Constraint?
- Schreibe die typsichere `getProp`-Signatur aus dem Gedächtnis.
- Was erzeugt `keyof T`, und was ist `T[K]`?
- Wann sollte eine Funktion nicht generisch sein?
