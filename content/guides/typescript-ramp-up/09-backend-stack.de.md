---
title: "09 — Backend-Stack: Node, Hono oder Fastify, Drizzle, Postgres"
description: "Ein moderner TypeScript-Backend-Stack, der bekannte Muster abbildet: ein HTTP-Framework, eine typisierte Abfrageschicht mit Drizzle und PostgreSQL."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "7f4f0e76559fc963585b6b17d6ce8a64"
---

# 09 — Backend-Stack: Node, Hono oder Fastify, Drizzle, Postgres

Wenn du bereits Services in einer anderen Sprache gebaut hast, lässt sich die Architektur direkt übertragen. Du ordnest vertraute Konzepte konkreten TypeScript-Bibliotheken zu. Die folgenden Codeausschnitte veranschaulichen die Form der jeweiligen Werkzeuge. Prüfe die genauen Signaturen anhand der aktuellen Dokumentation in [Fundierung und Referenzen](14-grounding-and-references.md), da sich diese Bibliotheken weiterentwickeln.

## Auswahl eines HTTP-Frameworks

Zwei starke moderne Optionen:

- **Hono**: klein, schnell, auf den Webstandards `Request` und `Response` aufgebaut und unter Node, Bun, Deno sowie in Edge-Laufzeitumgebungen ausführbar. Eine gute Standardwahl für neue Services und Portabilität.
- **Fastify**: ausgereift, reich an Plug-ins und auf Node ausgerichtet, mit großem Ökosystem sowie integrierter schemabasierter Validierung und Serialisierung. Eine gute Standardwahl für einen klassischen Node-Service.

Express ist weiterhin allgegenwärtig und sollte dir bekannt sein. Für einen neuen Service mit strengem TypeScript bieten Hono oder Fastify jedoch eine besser typisierte Erfahrung. Wenn du FastAPI oder ein ähnliches Framework kennst, kannst du das mentale Modell für Routing und Middleware übertragen.

Ein minimaler Hono-Service:

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

Die Handler-Signatur, das Kontextobjekt und die Zusammenstellung der Middleware werden dir aus anderen Frameworks vertraut vorkommen. Du musst vor allem die konkrete API-Oberfläche lernen.

## Die Datenschicht: Drizzle ORM

Drizzle ist eine TypeScript-zentrierte Abfrageschicht für SQL-Datenbanken. Du definierst dein Schema in TypeScript, und Abfragen werden dagegen typisiert. Es bleibt nah an SQL, statt es zu verstecken, was Entwicklern entgegenkommt, die bereits in SQL denken.

Eine Tabelle definieren:

```ts
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Eine Abfrage, deren Ergebnistypen aus dem Schema abgeleitet werden:

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

`found` ist als Array von Zeilenobjekten typisiert, die der Tabelle entsprechen, ohne manuelles Mapping. Drizzle liefert außerdem `drizzle-kit`, um aus deinem Schema SQL-Migrationen zu erzeugen und auszuführen.

Wenn du ein umfangreicheres ORM mit deklarativer Schemasprache und verwaltetem Migrations-Workflow bevorzugst, ist Prisma die andere verbreitete Wahl. Drizzle bietet dir eine SQL-nähere Kontrolle. Prisma bietet mehr Abstraktion. Beide Entscheidungen lassen sich gut begründen.

## PostgreSQL

Postgres ist die Standardwahl für relationale Datenbanken in diesem Ökosystem. Die architektonischen Fragen sind dieselben, die du bereits kennst: Indizes, Transaktionen, Connection Pooling und Migrationen. Drizzle stellt Transaktionen und parametrisierte Abfragen bereit, sodass Sicherheit und Kontrolle erhalten bleiben. Verwende einen Connection Pool (den `Pool` von `pg`) statt einer Verbindung pro Request.

## Hintergrundjobs

Für Arbeit, die nicht im Request-Pfad laufen soll, ist das gängige Muster eine Redis-gestützte Queue wie BullMQ und ein separater Worker-Prozess, der Jobs verarbeitet. Das ist dieselbe Aufteilung in Produzent und Konsument, die du auch anderswo bauen würdest. Halte CPU-intensive oder langsame Arbeit vom HTTP-Event-Loop fern, wie unter [Async und Nebenläufigkeit](07-async-and-concurrency.md) beschrieben.

## Zusammenspiel der Komponenten

Ein typischer Request-Ablauf sieht so aus: Der Route Handler des Frameworks validiert die Eingabe (nächste Seite), ruft eine Service-Funktion auf, führt eine typisierte Drizzle-Abfrage gegen Postgres aus und gibt eine JSON-Antwort zurück. Jede dieser Schichten hast du schon einmal gebaut. Die Arbeit besteht darin, die konkreten Bibliotheken zu verbinden, nicht Backend-Design neu zu lernen.

## Kurzer Selbsttest

- Wann würdest du Hono statt Fastify wählen und wann umgekehrt?
- Wie liefert Drizzle typisierte Abfrageergebnisse ohne manuelles Mapping?
- Welcher Zielkonflikt besteht zwischen Drizzle und Prisma?
- Wohin gehören Hintergrundjobs, und warum nicht in den Request Handler?
