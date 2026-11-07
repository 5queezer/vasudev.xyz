---
title: "12 — Herramientas y pruebas"
description: "La cadena de herramientas cotidiana de TypeScript: gestores de paquetes, tsc como puerta de control, ESLint y Prettier, Vitest y las reglas de lint que evitan los errores más comunes."
weight: 12
type: "guide"
build:
  list: local
  render: always
translationHash: "ff3f6ff5086bbb5cfe3a7788e9a45c8a"
---

# 12 — Herramientas y pruebas

Las herramientas son el lugar donde antes se siente como en casa un ingeniero con experiencia, porque las preocupaciones ya son conocidas: gestión de dependencias, linting, formato, comprobación de tipos y pruebas. Esta es la correspondencia específica para TypeScript.

## Gestores de paquetes

`npm` se incluye con Node y es la opción predeterminada segura. `pnpm` se utiliza mucho por su velocidad y por su distribución estricta y eficiente en disco de las dependencias, y muchos equipos lo adoptan como estándar. `yarn` también sigue siendo habitual. Son en gran medida intercambiables para el trabajo diario. El archivo de bloqueo (`package-lock.json`, `pnpm-lock.yaml` o `yarn.lock`) garantiza instalaciones reproducibles, así que debes incluirlo en el repositorio.

Las dependencias se dividen en `dependencies` (necesarias durante la ejecución) y `devDependencies` (necesarias solo para compilar y probar). El propio TypeScript, los paquetes `@types/*` que solo contienen tipos, los linters y los ejecutores de pruebas pertenecen a `devDependencies`.

## tsc como puerta de comprobación de tipos

Incluso si un empaquetador o ejecutor compila el código, ejecuta el comprobador de tipos por separado en CI:

```bash
tsc --noEmit
```

Es el equivalente de una comprobación de compilación. Detecta errores de tipos sin producir archivos. Conviértelo en un paso obligatorio de CI. Los errores de tipos deben hacer fallar la compilación, no llegar a producción.

## Linting y formato

- **ESLint** con `typescript-eslint` es el linter estándar. Detecta errores que el sistema de tipos no encuentra, y las reglas conscientes de los tipos pueden usar información de tipos para realizar comprobaciones más profundas.
- **Prettier** da formato al código para que el estilo nunca sea tema de revisión. Muchos equipos lo ejecutan mediante ESLint o como paso independiente.
- **Biome** es una herramienta única y más reciente que realiza rápidamente tanto linting como formato, y está ganando adopción como alternativa al dúo ESLint y Prettier.

Conviene activar pronto estas reglas de lint porque detectan los errores señalados en esta guía:

- `no-floating-promises`: marca Promises sin `await` que se tragan los errores.
- `no-explicit-any`: te conduce hacia `unknown` y tipos reales.
- `no-misused-promises`: detecta cuándo se pasa una función asíncrona donde se espera una síncrona.

## Pruebas

- **Vitest** es el ejecutor de pruebas moderno habitual. Es rápido, tiene una API compatible con Jest y gestiona TypeScript y ESM con poca configuración. Una opción predeterminada sólida para proyectos nuevos.
- **Jest** es la alternativa veterana y sigue estando en todas partes, así que conviene reconocer su API.
- **Playwright** es el estándar para pruebas de navegador de extremo a extremo.

Una prueba de Vitest tiene este aspecto:

```ts
import { describe, it, expect } from "vitest";
import { add } from "./math";

describe("add", () => {
  it("sums two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

Los conceptos de prueba se trasladan directamente desde cualquier lenguaje que conozcas: preparar, actuar y comprobar. Simula los límites. Prueba el comportamiento, no la implementación. La única parte nueva es la API del ejecutor.

## Una nota sobre la confianza basada en tipos

Dos hábitos elevan de inmediato tu nivel básico de calidad. Primero, mantén `strict` activado y `tsc --noEmit` en verde. Segundo, trata `any`, `as` y `!` como recursos que debes justificar, porque cada uno marca un lugar donde has anulado al compilador. Una base de código con pocos de esos recursos y con límites validados es una base donde los tipos realmente significan algo.

## Autoevaluación rápida

- ¿Por qué ejecutar `tsc --noEmit` en CI si un empaquetador ya compila el código?
- ¿Cuál es la diferencia entre `dependencies` y `devDependencies`?
- ¿Qué tres reglas de lint evitan los errores más comunes de asincronía y tipado?
- ¿Cuál es el ejecutor de pruebas moderno predeterminado y a qué API se parece?
