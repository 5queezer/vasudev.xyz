---
title: "05 — Mapped Types, Conditional Types y Utility Types"
description: "Las herramientas a nivel de tipos: utility types integrados, cómo se construyen con mapped types y conditional types con infer para los casos que no cubren las utilidades."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "9316c31ea147b4d94ce09371e3785e32"
---

# 05 — Mapped Types, Conditional Types y Utility Types

Esta es la parte que parece intimidante desde fuera, pero se reduce en gran medida a unos pocos patrones cuando los conoces. Usarás los utility types integrados a diario y escribirás tus propios mapped o conditional types de vez en cuando.

## Utility Types integrados que realmente usarás

Se incluyen con TypeScript. Aprende primero estos cuatro.

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

- `Partial<T>` hace opcionales todas las propiedades. Es habitual en payloads de actualización.
- `Pick<T, K>` conserva solo las claves nombradas.
- `Omit<T, K>` elimina las claves nombradas.
- `Record<K, V>` construye un tipo de objeto con claves `K` y valores `V`.

Otros habituales son `Required<T>`, `Readonly<T>`, `ReturnType<T>`, `Parameters<T>`, `Awaited<T>` y `NonNullable<T>`. Busca un utility type antes de escribir el tuyo. Cubren la mayoría de las necesidades.

## Mapped Types

Un mapped type transforma cada propiedad de un tipo existente. Así se implementan internamente `Partial` y `Readonly`, y puedes escribir los tuyos.

```ts
type Optional<T> = {
  [K in keyof T]?: T[K];
};
// Optional<User> is the same as Partial<User>
```

`[K in keyof T]` recorre las claves. `T[K]` es el tipo de valor de cada clave. Añade modificadores como `?` (opcional) o `readonly`, o elimínalos con `-?` y `-readonly`.

```ts
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};
```

Un ejemplo práctico que hace nullable algunos campos:

```ts
type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};
```

## Conditional Types

Un conditional type elige entre dos tipos en función de una relación. La sintaxis imita un ternario.

```ts
type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"
```

La verdadera potencia llega con `infer`, que captura un tipo dentro de una coincidencia. Así funciona `ReturnType`:

```ts
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R = MyReturnType<() => number>; // number
```

`infer R` dice: «sea cual sea el tipo de retorno, vincúlalo a `R` y úsalo». Leerás `infer` con más frecuencia de la que lo escribirás, pero reconocerlo elimina el misterio de los tipos avanzados de bibliotecas.

## Template Literal Types

Los tipos literales de cadena pueden componerse como template strings. Son útiles para nombres de eventos y rutas tipados.

```ts
type Event = "click" | "hover";
type Handler = `on${Capitalize<Event>}`; // "onClick" | "onHover"
```

## Hasta dónde profundizar

Para la mayoría de las entrevistas sénior y del código real necesitas soltura con las utilidades integradas, comodidad al leer mapped y conditional types y capacidad para escribir un mapped type sencillo. La metaprogramación profunda a nivel de tipos es una especialidad. Para empezar basta con saber que existe y poder leerla. No dejes que los ejemplos más extremos te hagan pensar que esta es la experiencia cotidiana. No lo es.

## Prueba rápida

- ¿Qué hacen `Partial`, `Pick`, `Omit` y `Record`?
- Escribe un mapped type que convierta todas las propiedades en `readonly`.
- ¿Qué hace `infer` en un conditional type?
- ¿Cuándo deberías usar una utilidad integrada en lugar de escribir tu propio tipo?
