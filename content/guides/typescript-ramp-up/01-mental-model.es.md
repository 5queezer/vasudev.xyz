---
title: "01 — Modelo mental: qué es TypeScript y qué no es"
description: "TypeScript es una capa de tipos estructural y eliminable sobre JavaScript. Entender qué permanece en tiempo de ejecución es el cambio más importante para un ingeniero con experiencia."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "3541f14af821e01d010850158f330ba9"
---

# 01 — Modelo mental: qué es TypeScript y qué no es

## Idea central

TypeScript es JavaScript con un sistema de tipos estático añadido en tiempo de compilación. El compilador comprueba los tipos y después los elimina. El programa que se ejecuta es JavaScript puro.

Si vienes de un lenguaje en el que los tipos existen en tiempo de ejecución, este es el mayor cambio:

> Los tipos son una herramienta de compilación para detectar errores y describir intenciones. No están presentes cuando se ejecuta el código.

## Los tipos se eliminan

Esto compila y, en tiempo de ejecución, las anotaciones de tipo simplemente desaparecen:

```ts
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

No existe reflexión sobre `string` en tiempo de ejecución. No puedes preguntar «¿este valor es de tipo `User`?» consultando al sistema de tipos, porque el tipo deja de existir cuando se ejecuta el código. Tú mismo compruebas las formas en tiempo de ejecución, normalmente con una biblioteca de validación en los límites del programa (consulta [Validación en el límite con Zod](10-validation-with-zod.md)).

Por eso no puedes confiar en un valor solo porque su tipo diga que es un `User`. Si procede de la red, de un archivo o de `JSON.parse`, el tipo es una afirmación, no una garantía. Valida las entradas que no sean de confianza.

## El sistema de tipos es estructural

TypeScript utiliza tipado estructural. Dos tipos son compatibles si sus formas lo son, independientemente de sus nombres o relaciones declaradas.

```ts
interface Point {
  x: number;
  y: number;
}

function printPoint(p: Point) {
  console.log(p.x, p.y);
}

// No "implements Point" needed. The shape matches, so this is accepted.
const location = { x: 1, y: 2, label: "home" };
printPoint(location);
```

Si vienes de Java o C#, esta es la sorpresa. No se exige `implements` para la compatibilidad normal. Un valor encaja en un tipo cuando tiene la forma correcta.

## `strict` es el lenguaje real

Desarrolla siempre con el modo `strict` activado. Sin él, `null` y `undefined` se cuelan en todos los tipos y el compilador deja de protegerte. La versión interesante y útil de TypeScript es la estricta. Todos los ejemplos de esta guía suponen:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

La opción más importante dentro de `strict` es `strictNullChecks`. Cuando está activada, `string` no incluye `null` ni `undefined`. Debes escribir `string | null` si un valor puede estar ausente, y el compilador te obliga a tratar ese caso.

## Lo que se transfiere desde otros lenguajes

Ya dominas las partes difíciles. La programación asíncrona, el diseño de API, las capas, las pruebas, el modelado de datos y la observabilidad se transfieren directamente. Aquí estás aprendiendo:

- cómo describir datos con el sistema de tipos,
- cómo se comporta el runtime de JavaScript,
- qué bibliotecas suele elegir el ecosistema.

## Qué evitar al principio

- Evita `any`. Desactiva la comprobación de tipos para ese valor y se propaga silenciosamente. Prefiere `unknown` cuando realmente todavía no conoces un tipo (consulta [Narrowing](06-narrowing-and-guards.md)).
- No trates los tipos como garantías en tiempo de ejecución. Valida en los límites.
- Evita la programación sofisticada a nivel de tipos hasta que los tipos ordinarios te resulten naturales.
- No desactives `strict` para hacer desaparecer los errores.

## Prueba rápida

Has asimilado el modelo mental cuando puedes explicar:

- Por qué no se puede inspeccionar un tipo de TypeScript en tiempo de ejecución.
- Por qué un objeto literal puede satisfacer una `interface` sin `implements`.
- Por qué todavía necesitas validación en tiempo de ejecución para entradas externas.
- Qué cambia `strictNullChecks` en el tipo `string`.
