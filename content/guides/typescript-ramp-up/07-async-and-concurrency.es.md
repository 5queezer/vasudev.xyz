---
title: "07 — Async y concurrencia"
description: "Promises, async/await, el event loop de un solo hilo, concurrencia estructurada con combinadores de Promise y el lugar de los worker threads."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "91c221ff13423e6b842452ab1fec5f45"
---

# 07 — Async y concurrencia

Ya entiendes la programación asíncrona. Esta página trata sobre cómo la expresan JavaScript y TypeScript y en qué se diferencia su modelo de ejecución de los hilos.

## El modelo de ejecución

JavaScript ejecuta tu código en un solo hilo con un event loop. Tu propio código no sufre desalojo preventivo. Una función se ejecuta hasta terminar antes de que se seleccione la siguiente tarea. La concurrencia surge al ceder el control en puntos `await` y dejar que la E/S termine en segundo plano, no al ejecutar tu JavaScript en paralelo.

Consecuencias prácticas:

- No aparecen carreras de datos sobre variables compartidas dentro de tu propio código síncrono, porque mientras se ejecuta no corre nada más.
- Un bucle síncrono largo bloquea todo, incluso que el servidor acepte nuevas solicitudes. Mantén el trabajo intensivo de CPU fuera de la ruta de las solicitudes.
- El paralelismo real para trabajo de CPU requiere worker threads o procesos separados, descritos al final.

## Promises y async/await

Un `Promise<T>` es un valor que se resolverá en un `T` o será rechazado con un error. `async`/`await` es la sintaxis que usarás casi siempre.

```ts
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as User;
}
```

Una función `async` siempre devuelve un `Promise`. El utility type `Awaited<T>` lo desenvuelve cuando necesitas el tipo resuelto.

## Los errores simplemente se lanzan

Existe un único canal de errores. Una promesa rechazada aparece como un error lanzado en el `await`, así que se trata con `try`/`catch`.

```ts
try {
  const user = await getUser("1");
} catch (err) {
  // err is typed as unknown in strict mode
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

En TypeScript moderno el valor capturado es `unknown`, por lo que debes estrecharlo antes de usarlo. Es la misma disciplina de narrowing de la página anterior.

El fallo asíncrono más frecuente es una promesa flotante: llamar a una función asíncrona sin esperarla, de modo que los errores desaparecen. Activa la regla de lint `no-floating-promises` para detectarlas (consulta [Herramientas y pruebas](12-tooling-and-testing.md)).

## Ejecutar trabajo de forma concurrente

Para ejecutar al mismo tiempo trabajo asíncrono independiente, inicia las promesas y espéralas juntas. No uses `await` dentro de un bucle cuando sus iteraciones sean independientes.

```ts
// Sequential, slow: each await waits for the previous.
const a = await getUser("1");
const b = await getUser("2");

// Concurrent: both requests are in flight at once.
const [c, d] = await Promise.all([getUser("1"), getUser("2")]);
```

Los combinadores:

- `Promise.all` se resuelve cuando todos tienen éxito y rechaza ante el primer fallo.
- `Promise.allSettled` espera a todos e informa de cada resultado, sea éxito o fallo.
- `Promise.race` se completa en cuanto lo hace la primera promesa.
- `Promise.any` se resuelve con el primer éxito y solo rechaza si todos fallan.

## Cancelación con AbortController

Las promesas de JavaScript no son cancelables por sí solas. El mecanismo estándar es `AbortController`, aceptado por `fetch` y muchas API.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const res = await fetch("/slow", { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

## Paralelismo de CPU

Cuando de verdad necesitas varios núcleos para trabajo intensivo de CPU, Node proporciona `worker_threads` y el navegador ofrece Web Workers. Ejecutan contextos de JavaScript separados y se comunican mediante mensajes, no con memoria mutable compartida (salvo la excepción limitada de `SharedArrayBuffer`). En la mayoría de los servicios backend, la solución es mantener el trabajo pesado fuera del event loop, no añadir hilos.

## Prueba rápida

- ¿Por qué un bucle síncrono largo bloquea un servidor Node entero?
- ¿Cuándo usas `Promise.all` y cuándo `Promise.allSettled`?
- ¿Por qué el error capturado es `unknown` y cómo lo manejas?
- ¿Cómo cancelas un `fetch` en curso?
