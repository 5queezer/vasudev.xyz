---
title: "09 — Backend Stack: Node, Hono or Fastify, Drizzle, Postgres"
description: "A modern TypeScript backend that maps onto patterns you already know: an HTTP framework, a typed query layer with Drizzle, and PostgreSQL."
weight: 9
type: "guide"
build:
  list: local
  render: always
---

# 09 — Backend Stack: Node, Hono or Fastify, Drizzle, Postgres

If you have built services in another language, the architecture transfers directly. You are mapping familiar concepts onto specific TypeScript libraries. The code snippets below are illustrative of the shape of each tool. Confirm exact signatures against the current docs linked in [Grounding and References](14-grounding-and-references.md), since these libraries evolve.

## Choosing an HTTP Framework

Two strong modern choices:

- **Hono**: small, fast, built on web-standard `Request` and `Response`, and runs across Node, Bun, Deno, and edge runtimes. A good default for new services and for portability.
- **Fastify**: mature, plugin-rich, Node-focused, with a large ecosystem and built-in schema-based validation and serialization. A good default for a conventional Node service.

Express is still everywhere and worth recognizing, but for a new strict-TypeScript service, Hono or Fastify give you a better typed experience. If you know FastAPI or a similar framework, the routing and middleware mental model carries over.

A minimal Hono service:

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

The handler signature, the context object, and middleware composition will feel familiar from other frameworks. The main thing to learn is the specific API surface.

## The Data Layer: Drizzle ORM

Drizzle is a TypeScript-first query layer for SQL databases. You define your schema in TypeScript, and queries are typed against it. It stays close to SQL rather than hiding it, which suits engineers who already think in SQL.

Define a table:

```ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Query it, with the result types inferred from the schema:

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

`found` is typed as an array of row objects matching the table, with no manual mapping. Drizzle also ships `drizzle-kit` for generating and running SQL migrations from your schema.

If you prefer a more full-featured ORM with a declarative schema language and a managed migration workflow, Prisma is the other mainstream choice. Drizzle gives you closer-to-SQL control. Prisma gives you more abstraction. Either is a defensible pick.

## PostgreSQL

Postgres is the default relational database in this ecosystem. The architectural concerns are the same ones you already know: indexing, transactions, connection pooling, and migrations. Drizzle exposes transactions and parameterized queries so you keep the safety and control you expect. Use a connection pool (`pg`'s `Pool`) rather than a connection per request.

## Background Jobs

For work that should not run in the request path, the common pattern is a queue backed by Redis, such as BullMQ, with a separate worker process consuming jobs. This is the same producer and consumer split you would build elsewhere. Keep CPU-heavy or slow work off the HTTP event loop, as covered in [Async and Concurrency](07-async-and-concurrency.md).

## Putting It Together

A typical request flow looks like: framework route handler, validate the input (next page), call a service function, run a typed Drizzle query against Postgres, and return a JSON response. Every layer is one you have built before. The work is wiring the specific libraries, not relearning backend design.

## Quick Self-Test

- When would you pick Hono over Fastify, and vice versa?
- How does Drizzle give you typed query results without manual mapping?
- What is the trade-off between Drizzle and Prisma?
- Where do background jobs belong, and why not in the request handler?
