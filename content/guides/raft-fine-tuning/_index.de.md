---
title: "Leitfaden für RAFT-Fine-Tuning"
description: "Ein praktischer Weg von einer funktionierenden RAG-Pipeline zu einem kleinen lokalen Modell, das mit RAFT feinjustiert ist: Daten, Filtern, Training, Auslieferung und eine ehrliche Evaluation."
date: 2026-11-03
guideTags: ["llm", "rag", "fine-tuning"]
type: "guide"
build:
  list: local
  render: always
translationHash: "698ccc9a1b103ce9258c785c9083d34e"
---

# Leitfaden für RAFT-Fine-Tuning

Eine kompakte Anleitung für alle, die schon eine Retrieval-Pipeline haben und ein kleines lokales Modell wollen, das aus abgerufenen Passagen besser antwortet als ein Basismodell mit gutem Prompt.

RAFT (Retrieval-Augmented Fine-Tuning) trainiert ein Modell auf Fragen mit abgerufenen Passagen, einige relevant, andere nur Ablenkung. So lernt es, aus der richtigen Passage zu antworten, den Rest zu ignorieren und es offen zu sagen, wenn nichts passt. Das Training selbst ist ein gewöhnlicher LoRA-Lauf. Die Arbeit steckt in den Daten, den Prüfungen und der Evaluation, und darum geht es auf diesen Seiten.

Das durchgehende Beispiel ist ein echtes Projekt: rund 870 transkribierte Videos eines einzelnen Creators, ein lokaler Retrieval-Dienst und Qwen3.5-Modelle mit 4B und 9B, die darauf trainiert sind, in der Ich-Form des Creators zu antworten, mit einem geprüften Zitat für jeden Satz. Das 4B-Modell hat auf einer 16-GB-Consumer-GPU trainiert, das 9B-Modell auf einer gemieteten 48-GB-Karte. Was bei diesem Lauf schiefging, steht im Begleitartikel [Mein erstes RAFT-Fine-Tuning auf einer geteilten 16-GB-GPU](/de/blog/mein-erstes-raft-fine-tuning-auf-einer-geteilten-16-gb-gpu-7-stolperfallen-die-im-paper-fehlen/).

## So nutzt du diese Anleitung

Lies die Seiten der Reihe nach. Jede beantwortet vier Fragen:

1. Welches Problem löst dieser Schritt?
2. Was ist die Standardwahl?
3. Was geht still kaputt, wenn du ihn überspringst?
4. Wie prüfst du, dass er funktioniert hat?

## Was wirklich neu ist

Wer schon RAG-Systeme gebaut hat, kennt das meiste. Nur wenige Ideen sind RAFT-spezifisch:

- Das Modell lernt aus Kontexten mit Ablenkungspassagen und aus Kontexten, in denen die Antwort ganz fehlt.
- Trainingsbeispiele müssen genau das Prompt-Format der Inferenz verwenden, gebaut vom selben Retriever.
- Ein stärkeres Lehrermodell darf beim Generieren Hinweise sehen, die das Schülermodell nie sieht.
- Der Gewinn liegt vor allem darin, wie das Modell den Kontext nutzt und wie es klingt, nicht darin, was es weiß.

## Empfohlener Weg

### Phase 1: Grundlagen

1. [Mental Model: What RAFT Teaches and What It Does Not](01-mental-model.md)
2. [Before You Train: Retrieval, Eval Set and Holdout](02-before-you-train.md)

### Phase 2: Daten

3. [Generating Training Data with a Teacher](03-generating-data.md)
4. [Filtering and the Datasheet](04-filtering-and-datasheet.md)
5. [Citations Belong in Code](05-citations-in-code.md)

### Phase 3: Modell

6. [Training a LoRA Adapter](06-training-lora.md)
7. [Export and Serving](07-export-and-serve.md)

### Phase 4: Nachweis

8. [Evaluating Against the Base Model](08-evaluating.md)
9. [Renting a GPU for the Bigger Model](09-renting-a-gpu.md)
10. [Checklist](10-checklist.md)
11. [Grounding and References](11-grounding-and-references.md)

## Der schnellste praktische Plan

Eine konzentrierte Woche reicht für einen ersten Lauf, wenn dein Retrieval schon funktioniert.

- Tag 1: Eval-Set, Holdout und Ausgangswerte für das untrainierte Modell.
- Tag 2 und 3: Datengenerierung mit Filtern, dann das Datenblatt lesen und die Filter nachschärfen.
- Tag 4: ein kleines Modell trainieren und exportieren.
- Tag 5: gegen das Basismodell mit identischem Retrieval evaluieren und aufschreiben, was sich geändert hat.

## Standard-Stack

Wenn du nicht weißt, wo du anfangen sollst, nimm diese Kombination:

**Qwen3.5 4B + Unsloth BF16 LoRA + TRL SFTTrainer mit Loss nur auf der Antwort + GGUF Q4_K_M + Ollama, mit einem lokalen Lehrermodell für die Datengenerierung.**

Sie passt auf eine 16-GB-GPU, trainiert in wenigen Stunden und lässt jedes Transkript auf deinem Rechner.

## Grundlage

Das ist ein Praxisleitfaden aus einem vollständigen Lauf, kein Literaturüberblick. Die Zahlen stammen aus diesem Lauf und werden bei deinen Daten anders aussehen. Paper, Bibliotheksdokumentation und Versionshinweise stehen unter [Grounding and References](11-grounding-and-references.md).
