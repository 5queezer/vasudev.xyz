---
title: "02 — Vor dem Training: Retrieval, Eval-Set und Holdout"
description: "Miss das Retrieval, erstelle ein Eval-Set mit Holdout und protokolliere die Ausgangswerte des unveränderten Modells, bevor du ein einziges Trainingsbeispiel erzeugst."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "acb7b42ba107ee9a2a71cb597b986a87"
---

# 02 — Vor dem Training: Retrieval, Eval-Set und Holdout

## Kerngedanke

Du kannst nicht feststellen, ob RAFT geholfen hat, wenn du deinen Ausgangspunkt nicht kennst. Drei Dinge müssen vor den Trainingsdaten existieren: ein gemessener Retriever, ein Eval-Set und ein Holdout, der die Evaluation ehrlich hält.

## 1. Retrieval messen

RAFT trainiert das Modell darauf, aus dem erhaltenen Kontext zu antworten. Wenn die richtige Passage selten in diesem Kontext liegt, kann kein Fine-Tuning das beheben.

Miss `hit@k` (liegt irgendeine richtige Passage unter den ersten k?) und `recall@k` für deine Evaluationsfragen mit demselben `k`, das du bei der Inferenz verwenden wirst. Im Beispiellauf betrug `hit@10` 0,738; bei etwa einem Viertel der Fragen war die Antwort also nie im Kontext. Diese Zahl erklärt später die meisten „falschen“ Enthaltungen.

## 2. Ein Eval-Set erstellen

Schreibe oder erzeuge Fragen mit einer Referenzantwort, den Kernaussagen, die eine gute Antwort enthalten muss, und den Belegstellen in deinem Korpus. Nimm absichtlich unbeantwortbare Fragen auf. Das Beispielset enthielt 129 überprüfte Fragen: 103 beantwortbare und 26 unbeantwortbare.

Die Fragen sollten die Arten abdecken, die dir wichtig sind. Im Beispiel wurden Faktenfragen, episodenübergreifende Fragen mit zwei benötigten Quellen und Zuordnungsfragen („Was sagt er zu X?“) verwendet.

## 3. Einen Holdout festschreiben

Jedes Dokument, auf das sich ein Evaluationsbeleg bezieht, kommt in ein Holdout-Set. Nichts daraus darf im Training vorkommen – weder als Quelle noch als Ablenkung.

```python
def usable(examples, holdout: set):
    return [e for e in examples
            if e["file_id"] not in holdout
            and not {p["file_id"] for p in e["context"]} & holdout]
```

Wende den Filter bei der Erzeugung und erneut beim Export an, denn der Holdout kann wachsen, nachdem bereits Beispiele existieren. Führe vor dem Training eine unabhängige Prüfung der endgültigen Trainingsdateien durch.

## 4. Die Baseline aufzeichnen

Führe die gesamte Pipeline mit dem unveränderten Basismodell und mit einem stärkeren, vertrauenswürdigen Modell aus und bewerte beide. Diese Werte muss RAFT schlagen. Bewahre die Berichte auf, denn spätere Änderungen an Retrieval und Prompt machen alte Läufe unvergleichbar.

## Was ausgeschlossen werden sollte

Schließe Daten aus, die das Falsche lehren, selbst wenn reichlich davon vorhanden ist. Im Beispiellauf wurden Videos mit mehreren Sprechern (Interviews, Anrufe) vollständig ausgeschlossen, weil Transkripte ohne Sprecherkennzeichnung dem Modell beibringen würden, die Ansichten eines Gastes als die des Creators auszugeben.

## Häufige Fehler

- Unbeantwortbare Fragen auslassen und dadurch das Enthaltungsverhalten verbergen.
- Das Quelldokument zurückhalten, ohne die Ablenkungen zu prüfen.
- Mit einer Baseline vergleichen, die einen anderen Retriever oder ein anderes `k` verwendet.
