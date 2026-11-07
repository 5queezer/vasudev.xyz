---
title: "01 — Mentales Modell: Was TypeScript ist und was nicht"
description: "TypeScript ist eine strukturelle, entfernbare Typschicht über JavaScript. Zu verstehen, was zur Laufzeit erhalten bleibt, ist für erfahrene Entwickler die wichtigste Umstellung."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "3541f14af821e01d010850158f330ba9"
---

# 01 — Mentales Modell: Was TypeScript ist und was nicht

## Die Kernidee

TypeScript ist JavaScript mit einem statischen Typsystem, das zur Kompilierzeit ergänzt wird. Der Compiler prüft deine Typen und entfernt sie anschließend. Das ausgeführte Programm ist reines JavaScript.

Wenn du aus einer Sprache kommst, in der Typen zur Laufzeit existieren, ist dies die größte Umstellung:

> Typen sind ein Werkzeug zur Kompilierzeit, das Fehler erkennt und Absichten beschreibt. Sie sind bei der Ausführung deines Codes nicht vorhanden.

## Typen werden entfernt

Dies lässt sich kompilieren; zur Laufzeit sind die Typannotationen einfach verschwunden:

```ts
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

Zur Laufzeit gibt es keine Reflexion über `string`. Du kannst das Typsystem nicht fragen: „Ist dieser Wert vom Typ `User`?“, denn nach dem Start des Programms existiert dieser Typ nicht mehr. Formen prüfst du zur Laufzeit selbst, üblicherweise mit einer Validierungsbibliothek an den Grenzen deines Programms (siehe [Validierung an der Grenze mit Zod](10-validation-with-zod.md)).

Deshalb kannst du einem Wert nicht allein deshalb vertrauen, weil sein Typ `User` lautet. Stammt er aus dem Netzwerk, einer Datei oder aus `JSON.parse`, ist der Typ eine Behauptung, keine Garantie. Validiere nicht vertrauenswürdige Eingaben.

## Das Typsystem ist strukturell

TypeScript verwendet strukturelle Typisierung. Zwei Typen sind kompatibel, wenn ihre Formen kompatibel sind, unabhängig von ihren Namen oder den deklarierten Beziehungen.

```ts
interface Point {
  x: number;
  y: number;
}

function printPoint(p: Point) {
  console.log(p.x, p.y);
}

// No "implements Point" needed. The shape matches, so this is accepted.
const location = { x: 1, y: 2, label: "home" };
printPoint(location);
```

Wenn du aus Java oder C# kommst, ist das die Überraschung. Für die gewöhnliche Kompatibilität ist kein `implements` erforderlich. Ein Wert passt zu einem Typ, wenn er die richtige Form besitzt.

## `strict` ist die eigentliche Sprache

Entwickle immer mit aktiviertem `strict`-Modus. Ohne ihn schleichen sich `null` und `undefined` in jeden Typ ein, und der Compiler schützt dich nicht mehr. Die interessante und nützliche Variante von TypeScript ist die strikte. Alle Beispiele in diesem Leitfaden setzen Folgendes voraus:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Die wichtigste Option innerhalb von `strict` ist `strictNullChecks`. Ist sie aktiviert, enthält `string` weder `null` noch `undefined`. Wenn ein Wert fehlen kann, musst du `string | null` schreiben, und der Compiler zwingt dich, diesen Fall zu behandeln.

## Was du aus anderen Sprachen mitbringst

Die schwierigen Teile beherrschst du bereits. Asynchrone Programmierung, API-Design, Schichten, Tests, Datenmodellierung und Observability lassen sich übertragen. Was du hier lernst, ist:

- wie du Daten mit dem Typsystem beschreibst,
- wie sich die JavaScript-Laufzeit verhält,
- auf welche Bibliotheken das Ökosystem zurückgreift.

## Was du anfangs vermeiden solltest

- Vermeide `any`. Es deaktiviert die Typprüfung für diesen Wert und breitet sich unbemerkt aus. Verwende `unknown`, wenn du einen Typ tatsächlich noch nicht kennst (siehe [Narrowing](06-narrowing-and-guards.md)).
- Behandle Typen nicht als Laufzeitgarantien. Validiere an der Systemgrenze.
- Vermeide raffinierte Typprogrammierung, bevor sich gewöhnliche Typen natürlich anfühlen.
- Deaktiviere `strict` nicht, nur damit Fehlermeldungen verschwinden.

## Kurzer Selbsttest

Du hast das mentale Modell verstanden, wenn du Folgendes erklären kannst:

- Warum ein TypeScript-Typ zur Laufzeit nicht untersucht werden kann.
- Warum ein gewöhnliches Objektliteral ein `interface` ohne `implements` erfüllen kann.
- Warum externe Eingaben weiterhin zur Laufzeit validiert werden müssen.
- Was `strictNullChecks` am Typ `string` verändert.
