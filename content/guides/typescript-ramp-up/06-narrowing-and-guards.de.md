---
title: "06 — Narrowing: unknown, any und Type Guards"
description: "Wie TypeScript Typen durch den Kontrollfluss eingrenzt, warum unknown besser als any ist und wie benutzerdefinierte Type Guards und Assertions entstehen."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "e369fa582d07e59769aa80157877a789"
---

# 06 — Narrowing: unknown, any und Type Guards

Durch Narrowing verfeinert der Compiler einen breiten Typ zu einem spezifischeren, während er deinem Kontrollfluss folgt. Wer sich hier sicher fühlt, empfindet den Strict Mode als angenehm statt lästig.

## `any` oder `unknown`

`any` nimmt einen Wert vollständig aus der Typprüfung heraus. Alles ist damit erlaubt, und es infiziert unbemerkt alles, was es berührt. Vermeide es.

`unknown` ist der sichere oberste Typ. Du kannst ihm alles zuweisen, ihn aber erst verwenden, nachdem du ihn auf etwas Konkretes eingegrenzt hast. Für externe Eingaben ist genau das erwünscht.

```ts
function parse(input: unknown) {
  // input.toUpperCase();  // error, unknown is not yet a string
  if (typeof input === "string") {
    return input.toUpperCase(); // ok, narrowed to string
  }
  return null;
}
```

Faustregel: Wenn du einen Typ noch nicht kennst, verwende `unknown` und grenze ihn anschließend ein. Reserviere `any` für echte Auswege und isoliere es.

## Narrowing durch Kontrollfluss

Der Compiler grenzt Typen anhand deiner Prüfungen automatisch ein.

```ts
function len(x: string | string[]): number {
  if (typeof x === "string") {
    return x.length;        // x: string here
  }
  return x.length;          // x: string[] here
}
```

Nützliche Narrowing-Operatoren:

- `typeof x === "string"` für primitive Typen.
- `Array.isArray(x)` für Arrays.
- `x instanceof Date` für Klasseninstanzen.
- `"field" in x`, um eine Eigenschaft zu prüfen.
- `x === null` oder `x == null` (Letzteres erfasst auch `undefined`).

```ts
function getId(x: { id: string } | null): string {
  if (x === null) {
    return "anonymous";
  }
  return x.id; // narrowed to the object type
}
```

## Benutzerdefinierte Type Guards

Wenn das Narrowing eigene Logik erfordert, schreibst du eine Funktion, deren Rückgabetyp ein Type Predicate in der Form `value is Type` ist.

```ts
interface Cat {
  meow(): void;
}

function isCat(animal: unknown): animal is Cat {
  return typeof animal === "object"
    && animal !== null
    && "meow" in animal;
}

function handle(animal: unknown) {
  if (isCat(animal)) {
    animal.meow(); // narrowed to Cat
  }
}
```

Der Rückgabetyp `animal is Cat` sagt dem Compiler, dass ein Ergebnis von `true` bedeutet, dass das Argument eine `Cat` ist. So bringen Validierungsbibliotheken und eigene Helfer dem Compiler Laufzeitprüfungen bei. Beachte, dass der Compiler deinem Predicate vertraut. Ist deine Prüfung falsch, ist auch der Typ falsch. Halte Guards deshalb ehrlich.

## Assertion Functions

Eine verwandte Form wirft einen Fehler, statt ein Boolean zurückzugeben. Das eignet sich für Invarianten.

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function use(value: string | null) {
  assert(value !== null, "value must be set");
  return value.toUpperCase(); // value narrowed to string after the assert
}
```

## Die Non-Null Assertion und warum du sie vermeiden solltest

Der postfixe Operator `!` sagt dem Compiler: „Vertrau mir, das ist nicht null.“ Er entfernt `null` und `undefined` ohne jede Laufzeitprüfung aus dem Typ.

```ts
const el = document.getElementById("app")!; // claims non-null, unchecked
```

Manchmal ist er gerechtfertigt, doch jedes `!` ist eine Stelle, an der du den Compiler überstimmt hast. Bevorzuge eine echte Prüfung oder eine Assertion Function. Betrachte eine sich ausbreitende `!`-Gewohnheit als Warnsignal.

## Kurzer Selbsttest

- Warum ist `unknown` für externe Eingaben sicherer als `any`?
- Nenne vier Möglichkeiten, wie der Compiler eine Union eingrenzt.
- Schreibe einen Type Guard mit einem `value is Type`-Predicate.
- Welches Risiko birgt die Non-Null Assertion `!`?
