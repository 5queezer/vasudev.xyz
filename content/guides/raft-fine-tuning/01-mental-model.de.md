---
title: "01 — Mentales Modell: Was RAFT lehrt und was nicht"
description: "RAFT bringt einem Modell bei, abgerufenen Kontext zu verwenden. Es vermittelt keine neuen Fakten; dieser Unterschied entscheidet, ob sich der Aufwand lohnt."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "920afc25145ddfc240d8f88d9c07544d"
---

# 01 — Mentales Modell: Was RAFT lehrt und was nicht

## Kerngedanke

Es gibt drei Möglichkeiten, ein Modell Fragen zu deinen Dokumenten beantworten zu lassen:

| Ansatz | Was sich ändert | Stärken | Schwächen |
|---|---|---|---|
| RAG | der Prompt (abgerufene Passagen) | aktuelle Fakten, Zitate | Stil, schlechte Passagen ignorieren |
| Fine-Tuning mit Dokumenten | die Gewichte | Stil, Fachvokabular | Fakten veralten, keine Zitate |
| RAFT | die Gewichte, trainiert mit RAG-Prompts | Kontext verwenden, sich enthalten, Stil | benötigt weiterhin gutes Retrieval |

RAFT ist Fine-Tuning für die RAG-Aufgabe selbst. Jedes Trainingsbeispiel besteht aus einer Frage, einer Menge abgerufener Passagen und der Antwort, die ein gutes Modell daraus geben würde.

> RAFT bringt dem Modell bei, was es mit Kontext tun soll. Die Fakten bleiben im Retriever.

## Die zwei Arten von Beispielen

**Oracle-Beispiele.** Die Passage, aus der die Frage stammt, befindet sich im Kontext und steht an einer zufälligen Position zwischen Ablenkungen. Das Modell lernt, sie zu finden und daraus zu antworten.

**Beispiele nur mit Ablenkungen.** Jede Passage aus dem Quelldokument wird entfernt. Oft lautet die richtige Antwort nun „das wird nicht behandelt“, und das Modell lernt, dies zu sagen, statt aus der ähnlichsten Passage zu antworten.

Ohne die zweite Art wird ein feinjustiertes Modell immer dann selbstsicher falsch, wenn das Retrieval scheitert.

## Was sich in der Praxis ändert

Im Beispiellauf zeigte der Vergleich eines mit RAFT feinjustierten Modells mit seinem unveränderten Basismodell bei identischem Retrieval:

- Die faktische Stützung blieb gleich (69 % gegenüber 69 % der beantwortbaren Fragen bei 9B).
- Die wörtliche Wiederverwendung von Formulierungen aus den Quellen stieg deutlich (bei 9B von 0,35 auf 0,57, bei 4B von 0,20 auf 0,60).
- Die korrekte Enthaltung bei unbeantwortbaren Fragen verbesserte sich (bei 9B von 0,85 auf 0,92).
- Falsche Enthaltungen bei beantwortbaren Fragen wurden häufiger (bei 9B von 2,9 % auf 5,8 %).

Dieses Muster ist typisch. RAFT ist das richtige Werkzeug, wenn dir wichtig ist, wie das Modell Kontext verwendet: Grounding, Zitierdisziplin, Enthaltung und Ausdrucksweise. Es ist das falsche Werkzeug, wenn dem Basismodell schlicht die Schlussfolgerungsfähigkeit oder das Wissen für eine Antwort fehlt.

## Wann RAFT nicht geeignet ist

- Dein Retrieval liegt meistens daneben. Verbessere zuerst das Retrieval, denn RAFT trainiert das Modell darauf, dem Kontext zu vertrauen.
- Ein besserer Prompt erreicht das Ziel bereits. Miss zuerst das Basismodell mit diesem Prompt (siehe [Vor dem Training](02-before-you-train.md)).
- Du brauchst neue Fakten im Modell. Dafür eignen sich fortgesetztes Pretraining oder einfaches RAG, nicht RAFT.

## Häufige Fehler

- Genauigkeitsgewinne erwarten, obwohl das Retrieval der Engpass ist.
- Nur mit Oracle-Beispielen trainieren.
- Erfolg anhand des Eval-Loss statt anhand einer aufgabenbezogenen Evaluation gegen das Basismodell beurteilen.
