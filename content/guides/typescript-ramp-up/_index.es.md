---
title: "Guía rápida de TypeScript"
description: "Una introducción rápida y sólida a TypeScript moderno para ingenieros sénior que ya construyen sistemas en otros lenguajes."
date: 2026-06-04
guideTags: ["typescript", "backend", "frontend"]
type: "guide"
build:
  list: local
  render: always
translationHash: "20bf5a9bd1340cfa53d09954c8334004"
---


# Guía rápida de TypeScript

Una guía compacta para ingenieros sénior que ya crean sistemas de producción en otros lenguajes y necesitan aprender TypeScript con rapidez.

Si has puesto en producción servicios en Rust, Go, Python, Java o C#, la carencia no está en la ingeniería de software. La programación asíncrona, el diseño de API, la arquitectura, las pruebas, el modelado de datos y la observabilidad se transfieren directamente. La diferencia está en el sistema de tipos de TypeScript y su ecosistema, y esa parte se puede aprender en días, no en meses.

## Cómo utilizar esta guía

Lee las páginas en orden. Puedes recorrer rápidamente todo lo que se corresponda bien con un lenguaje que ya conoces y dedicar más tiempo a lo que no. Para cada tema, intenta responder:

1. ¿Qué problema resuelve esta característica?
2. ¿Qué prefiere el TypeScript idiomático?
3. ¿En qué se diferencia de los lenguajes que ya conozco?
4. ¿Puedo escribir un ejemplo pequeño de memoria?

## Qué es realmente nuevo

Para un ingeniero con experiencia, solo unas pocas cosas son realmente nuevas:

- Los tipos de TypeScript se eliminan en tiempo de ejecución. El sistema de tipos es una capa de compilación sobre JavaScript, no una garantía en tiempo de ejecución.
- El sistema de tipos es estructural, no nominal. La compatibilidad se basa en la forma, no en la herencia declarada.
- El sistema de tipos es inusualmente expresivo. Las uniones discriminadas, los genéricos, los tipos mapeados y los tipos condicionales permiten representar restricciones reales.
- El entorno de ejecución es JavaScript, con concurrencia mediante un bucle de eventos de un solo hilo y un único modelo de errores.

Todo lo demás consiste en familiarizarse con el ecosistema.

## Ruta recomendada

### Fase 1 — El sistema de tipos

1. [Modelo mental: qué es TypeScript y qué no es](01-mental-model.md)
2. [Fundamentos del sistema de tipos](02-type-system-core.md)
3. [Uniones discriminadas y exhaustividad](03-discriminated-unions.md)
4. [Genéricos y restricciones](04-generics-and-constraints.md)
5. [Tipos mapeados, condicionales y utilitarios](05-mapped-conditional-utility-types.md)
6. [Narrowing: unknown, any y Type Guards](06-narrowing-and-guards.md)

### Fase 2 — Lenguaje y entorno de ejecución

7. [Programación asíncrona y concurrencia](07-async-and-concurrency.md)
8. [Módulos, tsconfig y el proceso de build](08-modules-and-tsconfig.md)

### Fase 3 — TypeScript en el backend

9. [Stack de backend: Node, Hono o Fastify, Drizzle, Postgres](09-backend-stack.md)
10. [Validación en los límites con Zod](10-validation-with-zod.md)

### Fase 4 — TypeScript en el frontend

11. [Frontend: React y TanStack](11-frontend-react-tanstack.md)

### Fase 5 — Entrega y entrevista

12. [Herramientas y pruebas](12-tooling-and-testing.md)
13. [Proyecto final y preparación para entrevistas](13-capstone-and-interview.md)
14. [Fundamentación y referencias](14-grounding-and-references.md)

## Plan práctico más rápido

Un sprint enfocado de dos semanas es suficiente para afrontar bien una entrevista si el resto de tu portfolio es sólido.

- Semana 1: el sistema de tipos. Recorre las fases 1 y 2 y escribe ejemplos pequeños hasta que la sintaxis deje de sorprenderte.
- Semana 2: crea un proyecto full-stack completo de principio a fin (fases 3 y 4) y configura las herramientas.

## Stack objetivo recomendado

Si no sabes por dónde empezar, utiliza esta combinación:

**TypeScript (strict) + Node.js + Hono + Drizzle ORM + PostgreSQL + Zod + Vitest, y React + TanStack Query y Router en el frontend.**

Es moderna, está muy extendida y encaja bien con patrones que ya conoces de otros backends.

## Fundamentación

Esta es una guía rápida, no un sustituto de la documentación oficial. Los ejemplos de TypeScript puro de esta guía se comprobaron con el modo `strict`. Para consultar referencias autorizadas y notas de verificación, visita [Fundamentación y referencias](14-grounding-and-references.md).
