---
title: "06 — Narrowing: unknown, any y Type Guards"
description: "Cómo TypeScript estrecha tipos mediante el flujo de control, por qué unknown supera a any y cómo escribir type guards y aserciones definidos por el usuario."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "e369fa582d07e59769aa80157877a789"
---

# 06 — Narrowing: unknown, any y Type Guards

El narrowing es la forma en que el compilador refina un tipo amplio hasta otro más específico a medida que sigue el flujo de control. Sentirte cómodo aquí hace que el modo estricto resulte agradable en vez de molesto.

## `any` frente a `unknown`

`any` excluye por completo un valor de la comprobación de tipos. Permite cualquier operación y contagia silenciosamente todo lo que toca. Evítalo.

`unknown` es el tipo superior seguro. Puedes asignarle cualquier cosa, pero no puedes usarlo hasta estrecharlo a algo específico. Es exactamente lo que quieres para entradas externas.

```ts
function parse(input: unknown) {
  // input.toUpperCase();  // error, unknown is not yet a string
  if (typeof input === "string") {
    return input.toUpperCase(); // ok, narrowed to string
  }
  return null;
}
```

Regla práctica: cuando todavía no conozcas un tipo, elige `unknown` y después estréchalo. Reserva `any` para vías de escape auténticas y mantenlo aislado.

## Narrowing por flujo de control

El compilador estrecha automáticamente según las comprobaciones que escribas.

```ts
function len(x: string | string[]): number {
  if (typeof x === "string") {
    return x.length;        // x: string here
  }
  return x.length;          // x: string[] here
}
```

Operadores útiles para narrowing:

- `typeof x === "string"` para primitivos.
- `Array.isArray(x)` para arrays.
- `x instanceof Date` para instancias de clases.
- `"field" in x` para comprobar una propiedad.
- `x === null` o `x == null` (el segundo también captura `undefined`).

```ts
function getId(x: { id: string } | null): string {
  if (x === null) {
    return "anonymous";
  }
  return x.id; // narrowed to the object type
}
```

## Type Guards definidos por el usuario

Cuando el narrowing requiere lógica personalizada, escribe una función cuyo tipo de retorno sea un predicado de tipo, con la forma `value is Type`.

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

El tipo de retorno `animal is Cat` indica al compilador que un resultado `true` significa que el argumento es un `Cat`. Así enseñan al compilador las comprobaciones en tiempo de ejecución tanto las bibliotecas de validación como tus helpers. Ten en cuenta que el compilador confía en el predicado. Si la comprobación es incorrecta, el tipo también lo será; mantén los guards honestos.

## Funciones de aserción

Una forma relacionada lanza una excepción en vez de devolver un booleano. Es útil para invariantes.

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

## La aserción non-null y por qué evitarla

El operador sufijo `!` dice al compilador: «confía en mí, esto no es null». Elimina `null` y `undefined` del tipo sin realizar ninguna comprobación en tiempo de ejecución.

```ts
const el = document.getElementById("app")!; // claims non-null, unchecked
```

En ocasiones está justificado, pero cada `!` es un lugar donde has desautorizado al compilador. Prefiere una comprobación real o una función de aserción. Considera una costumbre creciente de usar `!` como un mal olor.

## Prueba rápida

- ¿Por qué `unknown` es más seguro que `any` para entradas externas?
- Nombra cuatro formas en que el compilador estrecha una unión.
- Escribe un type guard con un predicado `value is Type`.
- ¿Cuál es el riesgo de la aserción non-null `!`?
