---
title: "14 — Fundierung und Referenzen"
description: "Maßgebliche Referenzen, auf denen der TypeScript-Leitfaden beruht, sowie die Prüfung der reinen TypeScript-Beispiele."
weight: 14
type: "guide"
build:
  list: local
  render: always
translationHash: "26e2a374e84ecef95fca4a43c726ac6f"
---

# 14 — Fundierung und Referenzen

Dieser Leitfaden ist bewusst kompakt. Er lässt daher viele Sonderfälle aus und legt keine Bibliotheksversionen fest, da sich das Ökosystem schnell bewegt. Nutze diese Quellen für genaue und aktuelle Details.

## TypeScript-Sprache

- [TypeScript-Handbuch](https://www.typescriptlang.org/docs/handbook/intro.html) — der offizielle Sprachleitfaden.
- [Alltägliche Typen](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Objekttypen](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Typmanipulation: keyof, mapped, conditional, infer, Template Literals](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [tsconfig-Referenz](https://www.typescriptlang.org/tsconfig/)
- [Module](https://www.typescriptlang.org/docs/handbook/2/modules.html)

## JavaScript-Laufzeit und Asynchronität

- [MDN: Promises verwenden](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Node.js: Der Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Node.js: worker_threads](https://nodejs.org/api/worker_threads.html)
- [Node.js: ECMAScript-Module](https://nodejs.org/api/esm.html)

## Backend-Bibliotheken

- [Hono](https://hono.dev/)
- [Fastify](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Prisma](https://www.prisma.io/docs)
- [node-postgres (pg)](https://node-postgres.com/)
- [BullMQ](https://docs.bullmq.io/)

## Validierung

- [Zod](https://zod.dev/)

## Frontend

- [React](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Table](https://tanstack.com/table/latest)
- [TkDodo: TanStack Router und Query](https://tkdodo.eu/blog/tan-stack-router-and-query) — die in Kapitel 11 verwendeten Integrationsmuster für Router und Query, beschrieben von einem Maintainer von TanStack Query.

## Werkzeuge und Tests

- [typescript-eslint](https://typescript-eslint.io/)
- [Prettier](https://prettier.io/)
- [Biome](https://biomejs.dev/)
- [Vitest](https://vitest.dev/)
- [Jest](https://jestjs.io/)
- [Playwright](https://playwright.dev/)
- [tsx](https://tsx.is/)
- [Vite](https://vite.dev/)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)

## Prüfung der Beispiele

Die reinen TypeScript-Beispiele dieses Leitfadens (die Kapitel 01 bis 07 zu Typsystem und Laufzeit) wurden in ein kleines Prüfgerüst im Repository extrahiert:

```text
tools/verify-ts-guide/
```

Jedes Beispiel durchläuft die Typprüfung im `strict`-Modus ohne Ausgabe. Die absichtlichen Fehlerbeispiele verwenden `// @ts-expect-error`. Der Compiler prüft dabei, ob die folgende Zeile tatsächlich fehlschlägt. Dadurch werden die negativen Fälle genauso streng geprüft wie die positiven.

Lokal ausführen:

```bash
cd tools/verify-ts-guide
tsc --noEmit -p tsconfig.json
```

Die Beispiele wurden mit TypeScript 6.0.2 unter `target: ES2022`, `module: NodeNext` und `lib: ["ES2022", "DOM"]` geprüft.

## Hinweise zur Genauigkeit

- Die Framework-Beispiele (Hono, Fastify, Drizzle, Zod, React, TanStack, Vitest) veranschaulichen die Form der jeweiligen Bibliothek. Sie sind weder auf eine Version festgelegt noch im Prüfgerüst enthalten, weil sich ihre APIs weiterentwickeln. Prüfe die genauen Signaturen anhand der oben verlinkten offiziellen Dokumentation.
- Die in diesem Leitfaden gewählten Bibliotheken sind verbreitete Standardoptionen, aber nicht die einzig gültigen. Express, Prisma und Jest sind weiterhin häufig und sollten dir bekannt sein.
- TypeScript ist ein bewegliches Ziel. Bestimmte Compiler-Standards, die Menge der Utility Types und die Laufzeitunterstützung für die direkte Ausführung von TypeScript ändern sich mit neuen Versionen. Betrachte das offizielle Handbuch und die Dokumentation der jeweiligen Bibliothek als aktuelle Quelle der Wahrheit.
