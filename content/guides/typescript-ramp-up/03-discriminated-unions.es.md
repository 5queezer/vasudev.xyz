---
title: "03 — Uniones discriminadas y exhaustividad"
description: "Las uniones discriminadas son la forma idiomática de modelar estados, resultados y eventos en TypeScript, haciendo que el compilador exija tratar cada caso."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "e850ca21725a512d2c4ade7689832d6e"
---

# 03 — Uniones discriminadas y exhaustividad

Si conoces los enums de Rust o los tipos suma de un lenguaje funcional, esto te resultará familiar. Las uniones discriminadas son la herramienta de modelado más importante de TypeScript y el lugar donde el sistema de tipos demuestra su valor.

## El patrón

Una unión discriminada es una unión de tipos de objetos que comparten un campo literal, el discriminante. El compilador utiliza ese campo para estrechar el tipo dentro de un `switch` o un `if`.

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

Dentro de `case "ok"`, TypeScript sabe que existe `r.value` y que no existe `r.message`. El campo discriminante (`kind` en este caso; sirve cualquier nombre) hace posible ese narrowing.

## Modelar el estado asíncrono

Este patrón sustituye banderas booleanas dispersas como `isLoading`, `isError` y `data`. En vez de cuatro booleanos que pueden contradecirse, modela los estados que realmente existen:

```ts
type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };
```

Ahora no se puede representar un estado imposible como «cargando, con datos y además con error». Es la misma disciplina que modelar máquinas de estados, expresada mediante tipos.

## Comprobación exhaustiva

Quieres que el compilador haga fallar el build cuando añadas una variante y olvides tratarla. El patrón consiste en una aserción `never` en la rama por defecto:

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

Si más adelante añades `{ kind: "triangle"; base: number; height: number }` a `Shape` sin añadir un caso, la asignación a `never` no compilará. El compilador te señalará cada lugar que necesita actualizarse. Es uno de los patrones de mayor valor del lenguaje. Úsalo para cualquier unión sobre la que hagas `switch`.

## Por qué importa en una entrevista

Elegir una unión discriminada con comprobación exhaustiva indica que piensas en hacer irrepresentables los estados no válidos. Es una prueba concreta de soltura con el sistema de tipos y algo que un revisor sénior de TypeScript valora.

## Prueba rápida

- ¿Qué hace que una unión sea «discriminada» y no una unión normal?
- ¿Cómo funciona el narrowing dentro de un `switch` sobre el discriminante?
- ¿Cómo te obliga la asignación a `never` a tratar todos los casos?
- ¿Por qué es mejor modelar el estado asíncrono como unión que con tres booleanos?
