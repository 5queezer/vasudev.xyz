---
title: "07 — Async und Concurrency"
description: "Promises, async/await, der Single-Thread-Event-Loop, strukturierte Nebenläufigkeit mit Promise-Kombinatoren und die Rolle von Worker Threads."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "91c221ff13423e6b842452ab1fec5f45"
---

# 07 — Async und Concurrency

Asynchrone Programmierung verstehst du bereits. Auf dieser Seite geht es darum, wie JavaScript und TypeScript sie ausdrücken und wo sich das Laufzeitmodell von Threads unterscheidet.

## Das Laufzeitmodell

JavaScript führt deinen Code in einem einzelnen Thread mit einem Event Loop aus. Dein eigener Code wird nicht präemptiv unterbrochen. Eine Funktion läuft bis zum Ende, bevor die nächste Aufgabe ausgewählt wird. Nebenläufigkeit entsteht, indem du an `await`-Punkten die Kontrolle abgibst und I/O im Hintergrund abschließen lässt, nicht durch parallele Ausführung deines JavaScripts.

Die praktischen Folgen:

- Innerhalb deines eigenen synchronen Codes entstehen keine Data Races auf gemeinsamen Variablen, weil währenddessen nichts anderes ausgeführt wird.
- Eine lange synchrone Schleife blockiert alles, einschließlich der Annahme neuer Anfragen durch den Server. Halte CPU-intensive Arbeit aus dem Request-Pfad heraus.
- Echte Parallelität für CPU-Arbeit benötigt Worker Threads oder separate Prozesse, die am Ende behandelt werden.

## Promises und async/await

Ein `Promise<T>` ist ein Wert, der zu einem `T` aufgelöst oder mit einem Fehler abgelehnt wird. `async`/`await` ist die Syntax, die du fast immer verwenden wirst.

```ts
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as User;
}
```

Eine `async`-Funktion gibt immer ein `Promise` zurück. Der Utility Type `Awaited<T>` packt es aus, wenn du den aufgelösten Typ benötigst.

## Fehler werden einfach geworfen

Es gibt einen einzigen Fehlerkanal. Ein abgelehntes Promise erscheint beim `await` als geworfener Fehler und wird deshalb mit `try`/`catch` behandelt.

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

In modernem TypeScript hat der abgefangene Wert den Typ `unknown`; grenze ihn vor der Verwendung ein. Das ist dieselbe Narrowing-Disziplin wie auf der vorherigen Seite.

Der häufigste asynchrone Fehler ist ein Floating Promise: Eine asynchrone Funktion wird ohne `await` aufgerufen, sodass Fehler verschwinden. Aktiviere die Lint-Regel `no-floating-promises`, um dies zu erkennen (siehe [Tooling und Tests](12-tooling-and-testing.md)).

## Arbeit nebenläufig ausführen

Um unabhängige asynchrone Arbeit gleichzeitig auszuführen, startest du die Promises und wartest gemeinsam auf sie. Verwende kein `await` in einer Schleife, wenn deren Durchläufe unabhängig sind.

```ts
// Sequential, slow: each await waits for the previous.
const a = await getUser("1");
const b = await getUser("2");

// Concurrent: both requests are in flight at once.
const [c, d] = await Promise.all([getUser("1"), getUser("2")]);
```

Die Kombinatoren:

- `Promise.all` wird aufgelöst, wenn alle erfolgreich sind, und beim ersten Fehler abgelehnt.
- `Promise.allSettled` wartet auf alle und meldet jedes Ergebnis, Erfolg oder Fehler.
- `Promise.race` wird abgeschlossen, sobald das erste Promise abgeschlossen ist.
- `Promise.any` wird beim ersten Erfolg aufgelöst und nur abgelehnt, wenn alle fehlschlagen.

## Abbruch mit AbortController

JavaScript-Promises lassen sich nicht von sich aus abbrechen. Der Standardmechanismus ist `AbortController`, den `fetch` und viele APIs akzeptieren.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const res = await fetch("/slow", { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

## CPU-Parallelität

Wenn du für CPU-intensive Arbeit wirklich mehrere Kerne benötigst, bietet Node `worker_threads`, während Browser Web Workers bereitstellen. Sie führen getrennte JavaScript-Kontexte aus und kommunizieren über Nachrichten statt über gemeinsam veränderbaren Speicher (mit der engen Ausnahme von `SharedArrayBuffer`). Für die meisten Backend-Dienste lautet die Antwort, schwere Arbeit vom Event Loop fernzuhalten, statt Threads einzusetzen.

## Kurzer Selbsttest

- Warum blockiert eine lange synchrone Schleife einen gesamten Node-Server?
- Wann verwendest du `Promise.all`, wann `Promise.allSettled`?
- Warum ist ein abgefangener Fehler `unknown`, und wie behandelst du ihn?
- Wie brichst du ein laufendes `fetch` ab?
