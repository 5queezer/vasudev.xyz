---
title: "05 — Zitate gehören in den Code"
description: "Lass das Modell Passagen-IDs und wörtliche Zitate angeben, prüfe die Zitate anschließend und erzeuge Zeitstempel und Links im Code."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "d49115201aadd8cc5b5a69488817fbf7"
---

# 05 — Zitate gehören in den Code

## Kerngedanke

Ein Modell, das selbst Zeitstempel, Seitenzahlen oder URLs schreibt, wird irgendwann eine plausible Angabe erfinden. Gib dem Modell nur Auswahlmöglichkeiten, die du prüfen kannst.

> Das Modell wählt eine Passagen-ID und kopiert ein Zitat. Code prüft das Zitat und schreibt die Referenz.

## Der Vertrag

Das Modell antwortet mit Markern wie `[S3]` und einer Zitatliste:

```json
{
  "answer": "Start where you already are every day [S2].",
  "insufficient": false,
  "citations": [{"source": "S2", "quote": "the easiest place to practice is the coffee shop you already walk into every morning"}]
}
```

Das Zitat muss ein zusammenhängender Abschnitt von 8 bis 40 Wörtern aus der Passage sein. Keine Paraphrase, keine Auslassungspunkte.

## Der Verifier

Für jedes Zitat sucht der Code den Text in der Passage (ohne Beachtung von Großschreibung, Zeichensetzung und Leerraum), ordnet ihn Zeitstempeln auf Wortebene zu und schreibt den Marker um:

```python
for c in out["citations"]:
    p = sources.get(c["source"])
    span = p and locate_quote(p, c["quote"])
    if not span:
        invalid += 1                    # marker gets removed from the answer
        continue
    refs[c["source"]] = f"#{p.doc_id} {clock(span.start)}"
answer = MARKERS.sub(lambda m: f"[{refs[m[1]]}]" if m[1] in refs else "", out["answer"])
```

Die Zitatgültigkeit beträgt dadurch konstruktionsbedingt 1,00. Jede Referenz in einer Antwort verweist auf tatsächlich vorhandene Wörter.

## Zitate anpassen

Kleine Modelle zitieren häufig 6 oder 45 Wörter oder verbinden zwei Sätze. Statt solche Antworten zu verwerfen, passe die Zitate an: Kürze ein zu langes Zitat, verlängere ein kurzes innerhalb des Transkripts oder reduziere es auf den längsten wörtlichen Abschnitt. In den Beispieldaten enthielt etwa die Hälfte der Beispiele mindestens ein angepasstes Zitat. Nutze dieselbe Anpassung bei der Inferenz, damit Training und Serving übereinstimmen.

## Was Gültigkeit nicht abdeckt

Ein geprüftes Zitat existiert. Es stützt aber nicht zwangsläufig den Satz, an dem es hängt. Miss das separat als Zitierpräzision mit einem Judge (siehe [Evaluieren](08-evaluating.md)). Die Beispielmodelle erreichten dort 0,63; das ist die ehrliche Kennzahl für diese Lücke.

## Konsequenz für das Serving

Die rohe Modellausgabe ist JSON mit `[S3]`-Platzhaltern und damit für eine Chat-Oberfläche nutzlos. Du brauchst einen schlanken Server, der pro Nachricht Retrieval, Modell und Verifier ausführt und fertiges Markdown zurückgibt (siehe [Export und Serving](07-export-and-serve.md)).

## Häufige Fehler

- Das Modell Zeitstempel oder URLs erzeugen lassen.
- Angepasste Zitate im Training verwerfen, sie bei der Inferenz aber anpassen – oder umgekehrt.
- Zitatgültigkeit mit Zitatqualität gleichsetzen.
