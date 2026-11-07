---
title: "03 — Trainingsdaten mit einem Teacher erzeugen"
description: "Destilliere Antworten eines stärkeren lokalen Teachers im exakten Inferenzformat, mit Oracle- und reinen Ablenkungskontexten sowie Hinweisen, die der Student nie sieht."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "06cbf6209d0c8588ddeb3928dc85b33f"
---

# 03 — Trainingsdaten mit einem Teacher erzeugen

## Kerngedanke

Jedes Trainingsbeispiel entsteht auf dieselbe Weise:

1. Ziehe eine Passage aus einem Trainingsdokument.
2. Lass den Teacher eine realistische Frage formulieren, die diese Passage beantwortet.
3. Rufe mit dem produktiven Retriever Kontext für diese Frage ab.
4. Bestimme den Fall: Oracle (Quellpassage im Kontext) oder nur Ablenkungen (Quelldokument entfernt).
5. Lass den Teacher antworten und prüfe anschließend die Antwort (siehe [Filtern](04-filtering-and-datasheet.md)).

## Eine einzige Prompt-Funktion

Die wichtigste Regel lautet: Trainings- und Inferenzprompts stammen aus derselben Funktion.

```python
def prompt(passages, question):
    sources = {f"S{n}": p for n, p in enumerate(passages, 1)}
    blocks = [passage_block(p, label) for label, p in sources.items()]
    return sources, SYSTEM, "\n\n".join(blocks) + "\n\n" + TASK + question
```

Sowohl der Datengenerator als auch der Serving-Code rufen sie auf. Der Kontext kommt aus demselben laufenden Retriever mit demselben `k`. Jede Abweichung zwischen beiden macht die Verbesserungen unbemerkt zunichte.

## Oracle- und Ablenkungsfälle

```python
def context(oracle, hits, mode, k, rng):
    if mode == "distractor":
        return [p for p in hits if p.doc_id != oracle.doc_id][:k]
    rest = [p for p in hits if not overlaps(p, oracle)][:k - 1]
    pos = rng.randrange(len(rest) + 1)          # never always first
    return rest[:pos] + [oracle] + rest[pos:]
```

Im Beispiellauf waren 80 % der Versuche Oracle- und 20 % reine Ablenkungsfälle. Reine Ablenkungsbeispiele wurden so lange erzeugt, bis mindestens 12 % der behaltenen Beispiele Enthaltungen waren. Nur Ablenkungen bedeuten nicht immer, dass sich das Modell enthalten soll. Wenn die anderen Passagen die Frage tatsächlich beantworten, ist eine Antwort korrekt.

## Hinweise für den Teacher

Der Teacher darf sehen, was der Student erschließen muss. Im Oracle-Fall erhält er etwa die Zeile „Passage S3 ist der Ursprung dieser Frage; baue die Antwort hauptsächlich darauf auf“. Im Ablenkungsfall erhält er „Keine dieser Passagen war die Quelle; antworte nur, wenn sie die Frage wirklich abdecken“. Dieser Hinweis gehört nur zum Prompt des Teachers und wird niemals im Trainingsbeispiel gespeichert.

## Einen Teacher auswählen

Ein größeres Modell derselben Familie ist ein guter Ausgangspunkt, weil sein Ausgabestil dem ähnelt, was der Student lernen kann. Im Beispiel wurde lokal `qwen3.5:9b` sowohl für einen 4B- als auch für einen 9B-Studenten verwendet. Selbstdestillation in dieselbe Modellgröße half trotzdem, weil die Filter nur die besten Antworten des Teachers behalten.

Ziehe mehr als eine Stichprobe. Im Beispiel wurde ein zweites Teacher-Sample behalten, wenn das erste die Prüfungen nicht bestand; ein Drittel der endgültigen Beispiele stammte aus diesem zweiten Versuch.

## Strukturierte Ausgabe

Fordere JSON mit einem Schema an, zum Beispiel mit `answer`, `insufficient` und `citations`. Strukturierte Ausgabe macht aus „Hat das Modell das Format eingehalten?“ eine Parse-Prüfung statt einer Regex-Vermutung und liefert ein eindeutiges Enthaltungsflag für die Evaluation.

## Häufige Fehler

- Fragen aus denselben Passagen erzeugen, auf denen evaluiert wird.
- Das Oracle immer an dieselbe Position setzen.
- Den Teacher-Hinweis in den Trainingsdaten speichern.
- Für die Daten einen anderen Retriever oder ein anderes `k` verwenden als bei der Inferenz.
