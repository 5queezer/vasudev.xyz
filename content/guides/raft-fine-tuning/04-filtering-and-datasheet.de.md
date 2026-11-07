---
title: "04 — Filtern und das Datenblatt"
description: "Nutze Rejection Sampling für die Antworten des Teachers mit expliziten Prüfungen, zähle jeden Verwerfungsgrund und lies vor dem Training ein Datenblatt."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "d0d245bd068aade2f23bf8a387d6f14d"
---

# 04 — Filtern und das Datenblatt

## Kerngedanke

Der Student lernt alles, was die behaltenen Beispiele vormachen – einschließlich der schlechten Gewohnheiten des Teachers. Das Filtern bestimmt die Qualität des Modells stärker als jeder Hyperparameter.

> Behalte nur Antworten, die du bei der Inferenz gern sehen würdest, und zähle, warum alles andere verworfen wurde.

## Ein Filterkatalog

Jede der folgenden Prüfungen existiert, weil ein frühes Sample den jeweiligen Fehler zeigte. Die Verwerfungszahlen stammen aus 7.988 Versuchen im Beispiellauf, von denen 3.012 (38 %) behalten wurden.

| Prüfung | Was sie erkennt | Verworfen |
|---|---|---|
| unbelegter Satz | eine Behauptung ohne Quellenmarker | 1.569 |
| geringer wörtlicher Anteil | Paraphrase statt der Formulierung der Quelle | 1.019 |
| formelhafte Enthaltung | dieselbe Standardfloskel für jedes „nicht behandelt“ | 875 |
| ungültiges Zitat | Zitat in der angegebenen Passage nicht gefunden | 513 |
| nicht aufgelöster Marker | Marker ohne zugehöriges Zitat | 393 |
| Marker ohne Textzitat | Quellen-ID ohne Zitat | 240 |
| abgelehnt | Antwort vollständig verweigert | 221 |
| dritte Person | „der Sprecher sagt“ statt erster Person | 77 |
| falsche Verneinung | „Darüber habe ich nicht gesprochen“, obwohl die Antwort im Kontext steht | 35 |

## Die falsche Verneinung

Der heimtückischste Fehler: In einem Oracle-Beispiel liegt die Quellpassage im Kontext, doch die Antwort beginnt mit einer Verneinung und beantwortet die Frage anschließend trotzdem. Trainierst du damit, lernt der Student, sein Wissen zu verneinen. Eine Regex auf den Antwortanfang erkennt die meisten Fälle.

```python
FALSE_DENIAL = re.compile(
    r"^(?:\w+,\s+)?I(?: (?:haven't|have not|never|don't|didn't) "
    r"(?:talk|talked|say|said|discuss|discussed|cover|covered|mention|mentioned)\b)")
```

Wende sie beim Export erneut an, denn die Filter verbessern sich, nachdem bereits Beispiele vorhanden sind.

## Das Datenblatt

Erstelle bei jedem Export ein Datenblatt neben den Daten. Es sollte Folgendes enthalten:

- Versuche, behaltene Beispiele und Behalterate
- Verwerfungsgründe, sowohl endgültige als auch „erstes Sample verworfen, zweites behalten“
- Anteile von Oracle, beantworteten Ablenkungsfällen und Enthaltungen
- Themenverteilung der Fragen
- häufigste Anfänge von Antworten und Enthaltungen
- 20 zufällige Beispiele im Volltext

Die Liste der Anfänge ist die nützlichste Zeile. Als „I haven't talked“ 189-mal als Antwortanfang erschien, war das das Signal, die Prüfung auf formelhafte Enthaltungen hinzuzufügen.

## Wie viele Daten?

Das Beispiel verwendete 2.858 Trainings- und 144 Validierungsbeispiele (Validierung nach Dokument aufgeteilt, 5 % der Dokumente). Das genügte, um Stil und Enthaltungsverhalten deutlich zu verändern. Mehr Beispiele aus derselben Verteilung helfen weniger als bessere Filter.

## Häufige Fehler

- Nur das Format filtern, nicht das Verhalten (falsche Verneinungen, dritte Person).
- Verwerfungen nicht zählen und deshalb nicht erkennen, welche Prüfung wichtig ist.
- Validierung nach Beispiel statt nach Dokument aufteilen, wodurch Passagen durchsickern.
