---
title: "10 — Checkliste"
description: "Eine einseitige Checkliste für einen RAFT-Lauf – von der Retrieval-Baseline bis zum ausgelieferten Modell."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "2866042a51ba0cf9292a4b426aaace48"
---

# 10 — Checkliste

## Vor den Daten

- [ ] `hit@k` und `recall@k` mit dem Inferenz-`k` gemessen
- [ ] Eval-Set mit überprüften beantwortbaren und unbeantwortbaren Fragen
- [ ] Holdout aus den Eval-Belegen festgehalten
- [ ] Baseline-Berichte für das unveränderte Basismodell und ein stärkeres Referenzmodell
- [ ] Dokumente ausgeschlossen, die das Falsche lehren (zum Beispiel Quellen mit mehreren Sprechern)

## Daten

- [ ] eine gemeinsame Prompt-Funktion für Datenerzeugung und Inferenz
- [ ] Kontext aus dem produktiven Retriever mit dem produktiven `k`
- [ ] Oracle an zufälliger Position, Beispiele nur mit Ablenkungen enthalten
- [ ] Teacher-Hinweise verwendet und niemals gespeichert
- [ ] strukturierte Ausgabe mit explizitem Enthaltungsflag
- [ ] Filter für Zitate, wörtlichen Anteil, Enthaltungsformulierungen, falsche Verneinungen und Stimme
- [ ] Verwerfungsgründe gezählt, Datenblatt geschrieben und gelesen
- [ ] Holdout-Filter beim Export angewendet, unabhängige Leakage-Prüfung bestanden
- [ ] Validierung nach Dokument aufgeteilt

## Training

- [ ] Tokenlängen geprüft, lange Beispiele verworfen statt abgeschnitten
- [ ] Loss nur auf der Antwort des Assistant
- [ ] Checkpoints und Fortsetzen getestet
- [ ] Eval-Loss sinkt, keine Divergenz

## Export und Serving

- [ ] Adapter behalten
- [ ] Basismodell mit derselben Quantisierung und demselben Modelfile verpackt
- [ ] Serving-Wrapper führt Retrieval, Modell und Verifier gemeinsam aus
- [ ] Aufgabenmodell der Chat-Oberfläche auf ein anderes Modell gesetzt

## Evaluation

- [ ] identisches Retrieval für jedes Modell
- [ ] supported für beantwortete und alle beantwortbaren Fragen berichtet
- [ ] gepaarter Vergleich für von beiden beantwortete Fragen
- [ ] jede falsche Enthaltung gegen ihren Retrieval-Treffer geprüft
- [ ] 10 Antwortpaare von einem Menschen gelesen
- [ ] Entscheidungsregel vor dem Lauf festgeschrieben
