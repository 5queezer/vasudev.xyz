---
title: "09 — Stack backend: Node, Hono o Fastify, Drizzle, Postgres"
description: "Un backend TypeScript moderno que se corresponde con patrones conocidos: un framework HTTP, una capa de consultas tipada con Drizzle y PostgreSQL."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "7f4f0e76559fc963585b6b17d6ce8a64"
---

# 09 — Stack backend: Node, Hono o Fastify, Drizzle, Postgres

Si has creado servicios en otro lenguaje, la arquitectura se traslada directamente. Estás asignando conceptos conocidos a bibliotecas concretas de TypeScript. Los siguientes fragmentos de código ilustran la forma de cada herramienta. Confirma las firmas exactas en la documentación actual enlazada en [Fundamentación y referencias](14-grounding-and-references.md), ya que estas bibliotecas evolucionan.

## Elegir un framework HTTP

Dos opciones modernas y sólidas:

- **Hono**: pequeño, rápido, basado en los estándares web `Request` y `Response`, y compatible con Node, Bun, Deno y entornos edge. Una buena opción predeterminada para servicios nuevos y para conseguir portabilidad.
- **Fastify**: maduro, con muchos complementos, orientado a Node, un gran ecosistema y validación y serialización integradas basadas en esquemas. Una buena opción predeterminada para un servicio Node convencional.

Express sigue estando en todas partes y conviene reconocerlo, pero para un servicio nuevo con TypeScript estricto, Hono o Fastify ofrecen una experiencia mejor tipada. Si conoces FastAPI o un framework similar, el modelo mental de rutas y middleware se traslada directamente.

Un servicio Hono mínimo:

```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/users/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id });
});

export default app;
```

La firma del manejador, el objeto de contexto y la composición del middleware te resultarán familiares de otros frameworks. Lo principal que debes aprender es la superficie concreta de la API.

## La capa de datos: Drizzle ORM

Drizzle es una capa de consultas para bases de datos SQL diseñada en torno a TypeScript. Defines el esquema en TypeScript y las consultas se tipan con respecto a él. Se mantiene cerca de SQL en vez de ocultarlo, algo apropiado para quienes ya piensan en SQL.

Definir una tabla:

```ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Consultarla, con los tipos de resultado inferidos a partir del esquema:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const found = await db
  .select()
  .from(users)
  .where(eq(users.email, "ada@example.com"));
```

`found` está tipado como un array de objetos de fila que se corresponden con la tabla, sin mapeo manual. Drizzle también incluye `drizzle-kit` para generar y ejecutar migraciones SQL a partir del esquema.

Si prefieres un ORM más completo, con un lenguaje de esquema declarativo y un flujo de migraciones gestionado, Prisma es la otra opción mayoritaria. Drizzle ofrece un control más cercano a SQL. Prisma ofrece más abstracción. Ambas elecciones son defendibles.

## PostgreSQL

Postgres es la base de datos relacional predeterminada en este ecosistema. Las preocupaciones arquitectónicas son las mismas que ya conoces: índices, transacciones, agrupación de conexiones y migraciones. Drizzle expone transacciones y consultas parametrizadas para que mantengas la seguridad y el control esperados. Utiliza un pool de conexiones (el `Pool` de `pg`) en lugar de una conexión por petición.

## Trabajos en segundo plano

Para las tareas que no deben ejecutarse en la ruta de una petición, el patrón habitual es una cola respaldada por Redis, como BullMQ, con un proceso worker independiente que consuma los trabajos. Es la misma división entre productor y consumidor que construirías en otro entorno. Mantén el trabajo lento o intensivo en CPU fuera del bucle de eventos HTTP, como se explica en [Asincronía y concurrencia](07-async-and-concurrency.md).

## Cómo encaja todo

El flujo típico de una petición es: el manejador de ruta del framework valida la entrada (siguiente página), llama a una función de servicio, ejecuta una consulta Drizzle tipada contra Postgres y devuelve una respuesta JSON. Ya has construido cada una de estas capas. El trabajo consiste en conectar las bibliotecas concretas, no en volver a aprender diseño de backends.

## Autoevaluación rápida

- ¿Cuándo elegirías Hono en vez de Fastify y viceversa?
- ¿Cómo proporciona Drizzle resultados de consulta tipados sin mapeo manual?
- ¿Cuál es el compromiso entre Drizzle y Prisma?
- ¿Dónde deben ejecutarse los trabajos en segundo plano y por qué no en el manejador de peticiones?
