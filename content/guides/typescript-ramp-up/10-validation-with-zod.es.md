---
title: "10 — Validación en los límites con Zod"
description: "Como los tipos se eliminan en tiempo de ejecución, debes validar las entradas externas con una biblioteca de esquemas. Zod es la opción habitual y vuelve a conectar las comprobaciones de ejecución con los tipos."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "093743e82ccedaa640cda9306725596a"
---

# 10 — Validación en los límites con Zod

Esta página cierra el círculo que comenzó en la primera. Los tipos se eliminan en tiempo de ejecución, por lo que no puedes confiar en un valor que llega de la red, el cuerpo de una petición, una variable de entorno o `JSON.parse` solo porque una anotación de tipo diga qué debería ser. Debes validarlo. Zod es la biblioteca más común para hacerlo y su truco principal es que un único esquema proporciona tanto la comprobación en tiempo de ejecución como el tipo estático.

## El problema que resuelve

```ts
const data = JSON.parse(rawBody) as User; // a lie, not a guarantee
```

La aserción `as User` indica al compilador que deje de comprobar. No hace nada durante la ejecución. Si `rawBody` tiene una forma incorrecta, tendrás un `User` inválido haciéndose pasar por uno válido, y el fallo aparecerá mucho más lejos. La validación sustituye la aserción por una comprobación real.

## Definir un esquema

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0),
  role: z.enum(["admin", "user"]),
});
```

## Derivar el tipo del esquema

En lugar de escribir un `interface User` separado y mantenerlo sincronizado, infieres el tipo a partir del esquema. Una sola fuente de verdad.

```ts
type User = z.infer<typeof UserSchema>;
// User is { id: string; email: string; age: number; role: "admin" | "user" }
```

Este es el patrón que hace que Zod merezca la pena. El esquema y el tipo nunca pueden divergir porque el tipo se deriva del esquema.

## Interpretar la entrada

```ts
// Throws a ZodError if invalid.
const user = UserSchema.parse(rawInput);

// Returns a discriminated result instead of throwing.
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  // result.data is a fully typed User
} else {
  // result.error describes what failed
}
```

Después de un análisis correcto, el valor está validado durante la ejecución y correctamente tipado durante la compilación. La entrada `unknown` se ha convertido en un `User` conocido mediante una comprobación honesta, no mediante una aserción. Observa que `safeParse` devuelve una unión discriminada, exactamente el patrón de [Uniones discriminadas](03-discriminated-unions.md).

## Dónde validar

Valida en los límites de tu sistema:

- Cuerpos de peticiones HTTP entrantes, parámetros de consulta y parámetros de ruta.
- Variables de entorno al arrancar, para que un despliegue mal configurado falle de forma clara y temprana.
- Respuestas de API de terceros que no controlas.
- Todo lo que proceda de `JSON.parse` o de un archivo.

Dentro de tu núcleo validado, confías en los tipos. No vuelves a validar datos que ya cruzaron un límite comprobado. Es la misma disciplina de límites de confianza que aplicas en cualquier lenguaje, expresada con una herramienta.

## Integración con frameworks

Tanto Hono como Fastify integran la validación de esquemas en el enrutamiento, de modo que una petición puede validarse y tiparse antes de que se ejecute el manejador. Fastify admite JSON Schema de forma nativa y funciona con Zod mediante adaptadores. Hono tiene middleware para validación con Zod. El resultado es el mismo: cuando se ejecuta el manejador, la entrada ya está validada y tipada.

## Autoevaluación rápida

- ¿Por qué no es seguro `JSON.parse(x) as User`?
- ¿Cómo mantiene `z.infer` sincronizados el tipo y la validación?
- ¿Cuál es la diferencia entre `parse` y `safeParse`?
- ¿Qué límites de un servicio deben validar la entrada?
