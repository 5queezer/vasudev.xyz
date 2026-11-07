---
title: "04 — Genéricos y restricciones"
description: "Genéricos en TypeScript, restricciones con extends, parámetros de tipo predeterminados y cómo fluye la inferencia por las funciones genéricas."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "f6403deb16b7c8cbad679bfea40e4b84"
---

# 04 — Genéricos y restricciones

Los genéricos te resultarán familiares si los conoces de otro lenguaje. La sintaxis es parecida a la de Java, C# y Rust. Las diferencias principales son el tipado estructural y la intensidad con la que TypeScript infiere por ti los argumentos de tipo.

## Genéricos básicos

Una función o un tipo genérico recibe uno o más parámetros de tipo.

```ts
function identity<T>(value: T): T {
  return value;
}

const a = identity("hello"); // T inferred as string, a: string
const b = identity(42);      // T inferred as number, b: number
```

Rara vez pasas los argumentos de tipo de forma explícita. La inferencia suele deducirlos a partir de la llamada.

```ts
function first<T>(items: T[]): T | undefined {
  return items[0];
}

const x = first([1, 2, 3]); // x: number | undefined
```

Observa el tipo de retorno `T | undefined`. Indexar un array puede producir `undefined` y, con una configuración estricta, debes tenerlo en cuenta.

## Restricciones con `extends`

Una restricción dice «T debe tener al menos esta forma». Te permite usar propiedades dentro del cuerpo genérico sin que la función deje de ser general.

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");        // ok, strings have length
longest([1, 2], [3, 4, 5]);  // ok, arrays have length
// longest(1, 2);            // error, number has no length
```

En `T extends Bar`, `extends` significa «asignable a», no herencia de clases. Es un límite estructural.

## Restringir a claves

`keyof` produce una unión con los nombres de las propiedades de un objeto. Combinado con una restricción, ofrece un acceso a propiedades con seguridad de tipos, un ejemplo clásico:

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "1", age: 30 };
const age = getProp(user, "age"); // age: number
// getProp(user, "missing");      // error, not a key of user
```

`T[K]` es un tipo de acceso indexado. Es el tipo de la propiedad llamada `K` en `T`. El trío formado por `keyof`, la restricción `K extends keyof T` y `T[K]` es uno de los patrones genéricos más habituales que leerás y escribirás.

## Parámetros de tipo predeterminados

Los parámetros de tipo pueden tener valores predeterminados, útiles para contenedores configurables y clientes de API.

```ts
interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

const r1: ApiResponse = { status: 200, body: "anything" };       // T is unknown
const r2: ApiResponse<{ id: string }> = { status: 200, body: { id: "1" } };
```

## Cuándo no usar genéricos

Los genéricos sirven para código que es realmente paramétrico respecto a un tipo. Si una función solo acepta un tipo concreto, no la hagas genérica. El abuso de genéricos produce firmas difíciles de leer sin aportar beneficios. Una única unión concreta suele ser más clara que un genérico con tres restricciones.

## Prueba rápida

- ¿Qué significa `extends` en una restricción genérica?
- Escribe de memoria la firma con seguridad de tipos de `getProp`.
- ¿Qué produce `keyof T` y qué es `T[K]`?
- ¿Cuándo no debería ser genérica una función?
