---
title: "14 — Fundamentación y referencias"
description: "Referencias autorizadas utilizadas para fundamentar la guía de TypeScript y cómo se verificaron los ejemplos de TypeScript puro."
weight: 14
type: "guide"
build:
  list: local
  render: always
translationHash: "26e2a374e84ecef95fca4a43c726ac6f"
---

# 14 — Fundamentación y referencias

Esta guía es deliberadamente compacta, por lo que omite muchos casos límite y no fija versiones de bibliotecas, ya que el ecosistema evoluciona con rapidez. Utiliza estas referencias para consultar los detalles precisos y actuales.

## Lenguaje TypeScript

- [Manual de TypeScript](https://www.typescriptlang.org/docs/handbook/intro.html) — la guía oficial del lenguaje.
- [Tipos cotidianos](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Genéricos](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Tipos de objetos](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Manipulación de tipos: keyof, mapped, conditional, infer y literales de plantilla](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Tipos de utilidad](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Referencia de tsconfig](https://www.typescriptlang.org/tsconfig/)
- [Módulos](https://www.typescriptlang.org/docs/handbook/2/modules.html)

## Entorno JavaScript y asincronía

- [MDN: Uso de Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Node.js: El bucle de eventos](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js: worker_threads](https://nodejs.org/api/worker_threads.html)
- [Node.js: Módulos ECMAScript](https://nodejs.org/api/esm.html)

## Bibliotecas backend

- [Hono](https://hono.dev/)
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Prisma](https://www.prisma.io/docs)
- [node-postgres (pg)](https://node-postgres.com/)
- [BullMQ](https://docs.bullmq.io/)

## Validación

- [Zod](https://zod.dev/)

## Frontend

- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Table](https://tanstack.com/table/latest)
- [TkDodo: TanStack Router y Query](https://tkdodo.eu/blog/tan-stack-router-and-query) — los patrones de integración de Router y Query utilizados en el capítulo 11, explicados por un mantenedor de TanStack Query.

## Herramientas y pruebas

- [typescript-eslint](https://typescript-eslint.io/)
- [Prettier](https://prettier.io/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)
- [tsx](https://tsx.is/)
- [Vite](https://vite.dev/)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)

## Verificación de los ejemplos

Los ejemplos de TypeScript puro de esta guía (los capítulos 01 a 07 sobre el sistema de tipos y el entorno de ejecución) se extrajeron a un pequeño entorno de verificación dentro del repositorio:

```text
tools/verify-ts-guide/
```

Todos los ejemplos superan la comprobación de tipos en modo `strict` sin emitir archivos. Los ejemplos con errores intencionados utilizan `// @ts-expect-error`, que el compilador valida exigiendo que la línea siguiente falle realmente. Así, los casos negativos se comprueban con el mismo rigor que los positivos.

Ejecútalo localmente con:

```bash
cd tools/verify-ts-guide
tsc --noEmit -p tsconfig.json
```

Los ejemplos se comprobaron con TypeScript 6.0.2 bajo `target: ES2022`, `module: NodeNext` y `lib: ["ES2022", "DOM"]`.

## Notas sobre la precisión

- Los ejemplos de frameworks (Hono, Fastify, Drizzle, Zod, React, TanStack y Vitest) ilustran la forma de cada biblioteca. No están fijados a una versión ni incluidos en el entorno de verificación porque sus API evolucionan. Confirma las firmas exactas en la documentación oficial enlazada arriba.
- Las bibliotecas elegidas en esta guía son opciones habituales, no las únicas válidas. Express, Prisma y Jest siguen siendo comunes y conviene reconocerlas.
- TypeScript cambia continuamente. Los valores predeterminados concretos del compilador, el conjunto de tipos de utilidad y la capacidad de los entornos para ejecutar TypeScript directamente varían entre versiones. Considera el manual oficial y la documentación de cada biblioteca como la fuente de verdad actual.
