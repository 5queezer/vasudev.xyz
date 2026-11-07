---
title: "02 — El núcleo del sistema de tipos"
description: "Alias de tipos, interfaces, uniones, intersecciones, literales y el vocabulario cotidiano con el que describes datos en TypeScript."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "4308b4ade3ae7087dd7e28981510d7ea"
---

# 02 — El núcleo del sistema de tipos

Este es el vocabulario diario. Domínalo y la mayor parte del código TypeScript se volverá legible.

## Primitivos e inferencia

Los tipos primitivos son `string`, `number`, `boolean`, `bigint`, `symbol`, `null` y `undefined`. No existen `int` ni `float`. Todos los números son `number`. Los enteros de precisión arbitraria utilizan `bigint`.

Deja que el compilador infiera cuando el tipo sea evidente. Anota los parámetros de funciones, los tipos de retorno de funciones públicas y cualquier elemento ambiguo.

```ts
const count = 3;          // inferred as number
const name = "Ada";       // inferred as string
let items: string[] = []; // annotate, otherwise inferred as any[] in some cases
```

## `type` frente a `interface`

Ambos dan nombre a un tipo. Como orientación práctica:

- Usa `interface` para formas de objetos que esperas que se implementen o amplíen, especialmente en superficies de API públicas. Las interfaces admiten la fusión de declaraciones y `extends`.
- Usa `type` para todo lo demás: uniones, intersecciones, tuplas, tipos de función, mapped types y alias de primitivos.

```ts
interface User {
  id: string;
  email: string;
}

type Id = string;
type Handler = (event: string) => void;
type Pair = [number, number];
```

Para una forma de objeto sencilla, ambos son casi intercambiables. Elige una convención por base de código. Una opción habitual es `interface` para objetos y `type` para uniones y tipos compuestos.

## Tipos unión

Una unión significa «uno de estos». Es la herramienta principal del modelado en TypeScript.

```ts
type Status = "active" | "suspended" | "deleted";

function setStatus(s: Status) {
  // s can only be one of the three strings
}
```

Las cadenas entre comillas son tipos literales. Un tipo literal es un único valor exacto usado como tipo. Las uniones de literales de cadena sustituyen a la mayoría de los enums en TypeScript idiomático.

Las uniones también modelan la opcionalidad y los fallos:

```ts
type MaybeUser = User | null;
type Parsed = { ok: true; value: number } | { ok: false; error: string };
```

La segunda forma es una unión discriminada, que veremos a continuación.

## Tipos intersección

Una intersección significa «todos estos a la vez». Combina tipos de objetos.

```ts
type Timestamps = { createdAt: Date; updatedAt: Date };
type UserRow = User & Timestamps;
// UserRow has id, email, createdAt, and updatedAt
```

Las intersecciones son útiles sobre todo para componer formas de objetos. La intersección de primitivos incompatibles produce `never`, el tipo vacío.

## Arrays, tuplas y Readonly

```ts
const ids: string[] = ["a", "b"];        // array
const point: [number, number] = [1, 2];  // fixed-length tuple
const frozen: readonly number[] = [1, 2]; // cannot be mutated through this reference
```

`readonly` solo existe en tiempo de compilación. Impide la mutación a través de esa referencia, pero no congela el objeto en tiempo de ejecución.

## Opcional y nullable

```ts
interface Config {
  host: string;
  port?: number; // optional: number | undefined
}
```

Una propiedad opcional puede faltar. Una propiedad nullable está presente, pero puede contener `null`. Son distintas. Con `strictNullChecks`, el compilador controla ambas y te obliga a tratar el caso ausente antes de usarla.

## `enum` y por qué suelen ganar las uniones

TypeScript tiene `enum`, pero es una de las pocas características que emite código en tiempo de ejecución en vez de eliminarse. Muchos equipos prefieren uniones de literales de cadena u objetos `as const` porque son más sencillos y completamente eliminables:

```ts
const Role = {
  Admin: "admin",
  User: "user",
} as const;

type Role = (typeof Role)[keyof typeof Role]; // "admin" | "user"
```

Usa `enum` si tu equipo ya lo ha adoptado como estándar. En caso contrario, las uniones literales son la opción predeterminada más ligera.

## Prueba rápida

- ¿Cuándo elegirías `interface` en lugar de `type`?
- ¿Cómo modelas «un valor que se encuentra en uno de tres estados conocidos»?
- ¿Cuál es la diferencia entre una propiedad opcional y una nullable?
- ¿Por qué muchas bases de código evitan `enum`?
