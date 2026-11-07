---
title: "13 — Abschlussprojekt und Positionierung im Bewerbungsgespräch"
description: "Ein Full-Stack-Projekt, das den gesamten Stack abdeckt, sowie die Frage, wie erfahrene Entwickler aus einem anderen Ökosystem ihre TypeScript-Kompetenz darstellen sollten."
weight: 13
type: "guide"
build:
  list: local
  render: always
translationHash: "bf59b21a81e1a77243af79e320132b14"
---

# 13 — Abschlussprojekt und Positionierung im Bewerbungsgespräch

Der schnellste Weg, alles aus diesem Leitfaden zu festigen, ist ein Projekt, das jede Schicht berührt. Anschließend stellst du deine vorhandene Erfahrung ehrlich dar.

## Ein Full-Stack-Projekt bauen

Wähle eine Domäne, die du bereits verstehst, damit du deine Energie in TypeScript und nicht in den Problemraum steckst. Ein Bewerbungs-Tracker, ein persönliches CRM, ein Issue Tracker oder eine Leseliste eignen sich gleichermaßen. Baue das Projekt mit dem Standard-Stack:

**React mit TanStack Query und Router, TypeScript im Strict Mode, Hono für die API, PostgreSQL mit Drizzle, Zod für die Validierung und Vitest für Tests.**

Strebe einen Funktionsumfang an, der jedes Muster erzwingt:

1. Einige zusammenhängende Entitäten, damit du Beziehungen in Drizzle modellierst.
2. Abläufe zum Erstellen und Aktualisieren, damit du Mutations und optimistische Updates schreibst.
3. Eine Listenansicht mit Paginierung oder Filterung, damit du Queries mit passenden Schlüsseln versiehst.
4. Validierte Request Bodies und eine validierte Umgebungskonfiguration, damit Zod eine tragende Rolle spielt.
5. Ein Board oder Statusfeld, damit du eine Discriminated Union für den Zustand verwendest.
6. Eine Testsuite und ein grünes `tsc --noEmit` in der CI.

Das Ziel ist kein poliertes Produkt. Du sollst die Muster jeder Seite dieses Leitfadens eigenhändig geschrieben haben. Nach einem solchen Projekt steht die Syntax nicht mehr im Mittelpunkt deines Denkens.

## Den eigenen Hintergrund darstellen

Wenn du bereits Produktionssysteme in anderen Sprachen baust, lautet die ehrliche Einordnung: Du bist ein Senior Engineer, der eine weitere Sprache lernt, kein Anfänger. Die übertragbaren Fähigkeiten sind die teuren: asynchrone Programmierung, API-Design, Architektur, Tests, Datenmodellierung, Observability und Kommunikation. Sie werden beim Sprachwechsel nicht zurückgesetzt. Du ergänzt das TypeScript-Typsystem und die Vertrautheit mit dem Ökosystem, was Tage bis Wochen und nicht Jahre erfordert.

Bei einem Bewerbungsgespräch für eine Senior-TypeScript-Rolle wiegen bisherige Tiefe in Systemarbeit, Infrastruktur, Protokollen oder Sicherheit und das Ausliefern echter Software normalerweise schwerer als die Fähigkeit, die genaue Syntax eines komplexen Conditional Types abzurufen. Diese Syntax lässt sich an einem Wochenende lernen. Urteilsvermögen nicht.

Daraus folgen zwei praktische Punkte. Erstens: Verkaufe dich nicht unter Wert, indem du deine Erfahrung enger darstellst, als sie ist. Wenn dein Portfolio nach Backend- und Plattform-Engineering aussieht, präsentiere dich entsprechend, statt dich automatisch in eine Junior-Rolle einzuordnen. Zweitens: Untermauere diese Einordnung inhaltlich. Sprich sicher über die Typsystemmuster aus diesem Leitfaden und verweise auf dein Abschlussprojekt. Selbstvertrauen zusammen mit einem funktionierenden Artefakt ist überzeugender als beides für sich.

## Themen, die du besprechen können solltest

Vor einem Bewerbungsgespräch solltest du natürlich über Folgendes sprechen können:

- Warum Typen entfernt werden und weshalb Grenzen trotzdem validiert werden.
- Discriminated Unions und Exhaustiveness anhand eines echten Beispiels.
- Generics mit Constraints und wann du sie nicht verwenden solltest.
- Das asynchrone Modell und der häufige Fehler eines Floating Promise.
- Server State im Vergleich zu Client State sowie Caching und Invalidierung in TanStack Query.
- Deine Werkzeuge: Strict Mode, Type-Checking-Gate, Linting und Tests.

Wenn diese Dinge selbstverständlich sind und deine breitere Engineering-Erfahrung echt ist, bist du bereit.

## Kurzer Selbsttest

- Deckt dein Abschlussprojekt jedes Muster dieses Leitfadens ab?
- Kannst du erklären, warum sich deine bisherige Erfahrung auf eine Senior-TypeScript-Rolle übertragen lässt?
- Kannst du jeden Punkt der obigen Liste ohne Notizen besprechen?
