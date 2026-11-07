---
title: "05 — Mapped, Conditional und Utility Types"
description: "Das Werkzeugset auf Typebene: eingebaute Utility Types, ihre Konstruktion mit Mapped Types und Conditional Types mit infer für Fälle, die Utilities nicht abdecken."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "9316c31ea147b4d94ce09371e3785e32"
---

# 05 — Mapped, Conditional und Utility Types

Dieser Teil wirkt von außen einschüchternd, besteht aber größtenteils aus wenigen Mustern, sobald du sie kennst. Die eingebauten Utility Types wirst du täglich verwenden; eigene Mapped oder Conditional Types schreibst du gelegentlich.

## Eingebaute Utility Types, die du wirklich verwendest

Sie werden mit TypeScript ausgeliefert. Lerne zuerst diese vier.

```ts
interface User {
  id: string;
  email: string;
  name: string;
}

type PartialUser = Partial<User>;        // all properties optional
type UserPreview = Pick<User, "id" | "name">; // only id and name
type UserWithoutId = Omit<User, "id">;   // every property except id
type UsersById = Record<string, User>;   // { [key: string]: User }
```

- `Partial<T>` macht jede Eigenschaft optional. Das ist häufig bei Update-Payloads nützlich.
- `Pick<T, K>` behält nur die genannten Schlüssel.
- `Omit<T, K>` entfernt die genannten Schlüssel.
- `Record<K, V>` erzeugt einen Objekttyp mit Schlüsseln vom Typ `K` und Werten vom Typ `V`.

Weitere verbreitete Typen sind `Required<T>`, `Readonly<T>`, `ReturnType<T>`, `Parameters<T>`, `Awaited<T>` und `NonNullable<T>`. Greife auf einen Utility Type zurück, bevor du einen eigenen schreibst. Sie decken die meisten Anforderungen ab.

## Mapped Types

Ein Mapped Type transformiert jede Eigenschaft eines bestehenden Typs. So sind `Partial` und `Readonly` intern implementiert; du kannst eigene Varianten schreiben.

```ts
type Optional<T> = {
  [K in keyof T]?: T[K];
};
// Optional<User> is the same as Partial<User>
```

`[K in keyof T]` iteriert über die Schlüssel. `T[K]` ist der Werttyp des jeweiligen Schlüssels. Füge Modifikatoren wie `?` (optional) oder `readonly` hinzu oder entferne sie mit `-?` und `-readonly`.

```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

Ein praktisches Beispiel, das ausgewählte Felder nullable macht:

```ts
type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};
```

## Conditional Types

Ein Conditional Type wählt anhand einer Beziehung zwischen zwei Typen. Die Syntax ähnelt einem ternären Ausdruck.

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
```

Die eigentliche Stärke zeigt sich mit `infer`, das einen Typ innerhalb eines Treffers erfasst. So funktioniert `ReturnType`:

```ts
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R = MyReturnType<() => number>; // number
```

`infer R` bedeutet: „Binde den jeweiligen Rückgabetyp an `R` und verwende ihn.“ Du wirst `infer` häufiger lesen als schreiben. Wenn du es erkennst, verlieren fortgeschrittene Bibliothekstypen ihren Schrecken.

## Template Literal Types

String Literal Types lassen sich wie Template Strings zusammensetzen. Das eignet sich für typisierte Ereignisnamen und Routen.

```ts
type Event = "click" | "hover";
type Handler = `on${Capitalize<Event>}`; // "onClick" | "onHover"
```

## Wie tief solltest du einsteigen?

Für die meisten Senior-Interviews und den Großteil realen Codes brauchst du Sicherheit mit den eingebauten Utilities, Erfahrung beim Lesen von Mapped und Conditional Types und die Fähigkeit, einen einfachen Mapped Type zu schreiben. Tiefgehende Metaprogrammierung auf Typebene ist ein Spezialgebiet. Für den Anfang reicht es, ihre Existenz zu kennen und sie lesen zu können. Lass dich von extremen Beispielen nicht glauben machen, dies sei der Alltag. Das ist es nicht.

## Kurzer Selbsttest

- Was tun `Partial`, `Pick`, `Omit` und `Record` jeweils?
- Schreibe einen Mapped Type, der jede Eigenschaft `readonly` macht.
- Was bewirkt `infer` in einem Conditional Type?
- Wann solltest du einen eingebauten Utility Type verwenden, statt einen eigenen Typ zu schreiben?
