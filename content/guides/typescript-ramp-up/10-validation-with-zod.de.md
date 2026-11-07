---
title: "10 — Validierung an der Systemgrenze mit Zod"
description: "Da Typen zur Laufzeit entfernt werden, validierst du externe Eingaben mit einer Schemabibliothek. Zod ist die gängige Wahl und überführt Laufzeitprüfungen wieder in Typen."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "093743e82ccedaa640cda9306725596a"
---

# 10 — Validierung an der Systemgrenze mit Zod

Diese Seite schließt den Kreis, der auf der ersten Seite begann. Typen werden zur Laufzeit entfernt. Daher ist ein Wert aus dem Netzwerk, ein Request Body, eine Umgebungsvariable oder das Ergebnis von `JSON.parse` nicht allein deshalb vertrauenswürdig, weil eine Typannotation vorgibt, was er sein sollte. Du validierst ihn. Zod ist dafür die verbreitetste Bibliothek. Ihr entscheidender Kniff: Ein Schema liefert sowohl die Laufzeitprüfung als auch den statischen Typ.

## Das gelöste Problem

```ts
const data = JSON.parse(rawBody) as User; // a lie, not a guarantee
```

Die Assertion `as User` weist den Compiler an, nicht weiter zu prüfen. Zur Laufzeit bewirkt sie nichts. Wenn `rawBody` ungültig ist, gibt sich ein ungültiger `User` als gültig aus, und der Fehler tritt weit entfernt von seiner Ursache auf. Validierung ersetzt die Assertion durch eine echte Prüfung.

## Ein Schema definieren

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(0),
  role: z.enum(["admin", "user"]),
});
```

## Den Typ aus dem Schema ableiten

Statt ein separates `interface User` zu schreiben und synchron zu halten, leitest du den Typ aus dem Schema ab. Eine einzige Quelle der Wahrheit.

```ts
type User = z.infer<typeof UserSchema>;
// User is { id: string; email: string; age: number; role: "admin" | "user" }
```

Dieses Muster macht Zod wertvoll. Schema und Typ können nicht auseinanderlaufen, da der Typ vom Schema abgeleitet wird.

## Eingaben parsen

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

Nach erfolgreichem Parsen ist der Wert sowohl zur Laufzeit validiert als auch zur Kompilierzeit korrekt typisiert. Die Eingabe vom Typ `unknown` wurde durch eine ehrliche Prüfung zu einem bekannten `User`, nicht durch eine Assertion. Beachte, dass `safeParse` eine Discriminated Union zurückgibt, genau das Muster aus [Discriminated Unions](03-discriminated-unions.md).

## Wo du validierst

Validiere an den Grenzen deines Systems:

- Eingehende HTTP Request Bodies, Query-Parameter und Route-Parameter.
- Umgebungsvariablen beim Start, damit eine falsch konfigurierte Bereitstellung laut und früh fehlschlägt.
- Antworten von Drittanbieter-APIs, die du nicht kontrollierst.
- Alles, was aus `JSON.parse` oder einer Datei stammt.

Innerhalb deines validierten Kerns vertraust du den Typen. Bereits an einer geprüften Grenze validierte Daten werden nicht erneut validiert. Das ist dieselbe Disziplin an Vertrauensgrenzen wie in jeder anderen Sprache, ausgedrückt mit einem Werkzeug.

## Integration in Frameworks

Sowohl Hono als auch Fastify integrieren die Schemavalidierung in das Routing. Dadurch kann ein Request validiert und typisiert werden, bevor dein Handler ausgeführt wird. Fastify unterstützt JSON Schema nativ und arbeitet über Adapter mit Zod. Hono bietet Middleware für die Zod-Validierung. Das Ergebnis ist dasselbe: Wenn der Handler ausgeführt wird, ist die Eingabe validiert und typisiert.

## Kurzer Selbsttest

- Warum ist `JSON.parse(x) as User` unsicher?
- Wie hält `z.infer` deinen Typ und deine Validierung synchron?
- Worin unterscheiden sich `parse` und `safeParse`?
- An welchen Grenzen eines Services sollten Eingaben validiert werden?
