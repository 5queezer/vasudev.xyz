---
title: "08 — Gegen das Basismodell evaluieren"
description: "Identisches Retrieval für jedes Modell, Kennzahlen, die Wissen von Stil trennen, ein gepaarter Vergleich und die Untersuchung jeder falschen Enthaltung."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "bd476faf26096b28676e9bb9caae09dc"
---

# 08 — Gegen das Basismodell evaluieren

## Kerngedanke

Die Frage lautet nicht „Ist das RAFT-Modell gut?“, sondern „Ist es unter exakt denselben Bedingungen besser als das unveränderte Basismodell, und auf welche Weise?“

## Identische Bedingungen

Führe jedes Modell auf demselben Eval-Set mit denselben abgerufenen Passagen pro Frage aus. Im Beispiel waren `hit@10` (0,738) und `recall@10` für alle Modelle identisch, sodass jeder Unterschied allein vom Modell stammte.

## Kennzahlen, die Wissen von Stil trennen

| Kennzahl | Berechnet durch | Was sie zeigt |
|---|---|---|
| Faktische Stützung (`supported`) | Bewertungsmodell | wird die Antwort durch die Passagen gestützt? |
| Abdeckung der Kernaussagen (`key-point coverage`) | Bewertungsmodell | wie viel der Referenzantwort ist enthalten? |
| Gültigkeit der Zitate (`citation validity`) | Code | kommen die Zitate in ihren Passagen vor? |
| Präzision der Zitate (`citation precision`) | Bewertungsmodell | stützen die Zitate die zugehörigen Sätze? |
| Korrekte Enthaltung (`correct abstention`) | Code | enthält sich bei unbeantwortbaren Fragen |
| Falsche Enthaltung (`false abstention`) | Code | enthält sich bei beantwortbaren Fragen |
| Wörtlicher Anteil (`verbatim share`) | Code | wie viel der Formulierung stammt aus der Quelle? |
| Stil (`style`) | Bewertungsmodell | klingt nach dem Autor der Quelle (1 bis 5)? |

Berichte die faktische Stützung sowohl für beantwortete Fragen als auch für alle beantwortbaren Fragen. Ein Modell, das sich häufiger enthält, sieht bei der ersten Kennzahl besser und bei der zweiten schlechter aus.

## Beispielergebnisse

| Kennzahl | RAFT-9B | Base-9B | RAFT-4B | Base-4B |
|---|---|---|---|---|
| Faktische Stützung (alle beantwortbaren) | 69 % | 69 % | 64 % | 64 % |
| Abdeckung der Kernaussagen | 0,50 | 0,46 | 0,48 | 0,44 |
| Präzision der Zitate | 0,63 | 0,55 | 0,63 | 0,61 |
| Korrekte Enthaltung | 0,92 | 0,85 | 0,85 | 0,85 |
| Falsche Enthaltung | 5,8 % | 2,9 % | 9,7 % | 2,9 % |
| Wörtlicher Anteil | 0,57 | 0,35 | 0,60 | 0,20 |
| Stil (1 bis 5) | 3,66 | 2,36 | 3,80 | 2,09 |

Die faktische Stützung änderte sich nicht. Ausdrucksweise und Enthaltung schon.

## Gepaarter Vergleich

Vergleiche nur die Fragen, die beide Modelle beantwortet haben. Bei 9B waren das 97 Fragen: faktische Stützung 71 gegenüber 70 und Abdeckung 0,53 gegenüber 0,48. Gepaarte Werte entfernen den Effekt unterschiedlicher Enthaltungsraten.

## Jede falsche Enthaltung untersuchen

Liste jede falsche Enthaltung mit ihrem Retrieval-Treffer auf. Im Beispiel waren 5 der 6 falschen Enthaltungen von RAFT-9B Fragen mit `hit@10 = 0`. Die Antwort befand sich nicht im Kontext; Enthaltung war daher die ehrliche Reaktion. Nur eine war ein echter Verlust. Ohne diese Prüfung wirkt die Regression dreimal schlimmer, als sie ist.

## Verzerrung durch das Bewertungsmodell

Wenn das Bewertungsmodell zugleich das Lehrmodell ist, bevorzugt es Antworten, die wie seine eigenen klingen. Nutze nach Möglichkeit codeberechnete Kennzahlen (Gültigkeit, wörtlicher Anteil, Enthaltung), lies selbst 10 Antwortpaare und verwende bei wichtigen Ergebnissen ein Bewertungsmodell aus einer anderen Modellfamilie.

## Entscheidungsregel

Lege vor der Evaluation fest, was als schlechter gilt. Die Regel im Beispiel war einfach: Stoppen und neu bewerten, wenn RAFT insgesamt schlechter als das Basismodell ist. Das war nicht der Fall; daher wurde das Modell ausgeliefert und der Trade-off bei falschen Enthaltungen dokumentiert.

## Häufige Fehler

- Modelle mit verschiedenen Retrieval-Läufen vergleichen.
- Nur einen Wert zur faktischen Stützung berichten.
- Einem Bewertungsmodell vertrauen, das zugleich das Lehrmodell ist.
