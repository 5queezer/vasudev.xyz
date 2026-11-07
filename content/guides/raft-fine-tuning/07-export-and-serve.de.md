---
title: "07 — Export und Serving"
description: "Führe den Adapter zusammen, quantisiere zu GGUF, registriere das Modell und ein identisch verpacktes Basismodell in Ollama und stelle die gesamte Pipeline hinter einem OpenAI-kompatiblen Endpunkt bereit."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "abb81678409882260e0adeda396ec4cc"
---

# 07 — Export und Serving

## Kerngedanke

Ein feinjustiertes Modell ist nur die Hälfte des Produkts. Die andere Hälfte ist die Pipeline darum herum: Retrieval, Prompt-Funktion und Zitat-Verifier. Stelle alles gemeinsam bereit.

## Exportschritte

1. Führe den LoRA-Adapter mit 16 Bit in die Basisgewichte zusammen.
2. Konvertiere zu GGUF und quantisiere, zum Beispiel zu `Q4_K_M`.
3. Registriere das Modell mit einem Modelfile.

```text
FROM /abs/path/to/models/raft-4b/model-Q4_K_M.gguf
RENDERER qwen3.5
PARSER qwen3.5
PARAMETER temperature 1
PARAMETER top_k 20
PARAMETER top_p 0.95
PARAMETER presence_penalty 1.5
```

Der `FROM`-Pfad muss absolut sein. Ein relativer Pfad wird als Modellname gelesen, und `ollama create` scheitert mit einer irreführenden Fehlermeldung.

## Das Basismodell identisch verpacken

Exportiere für einen fairen Vergleich das unveränderte Basismodell mit exakt denselben Schritten, derselben Quantisierung und demselben Modelfile. Andernfalls vergleichst du RAFT mit einem anders quantisierten oder anders templatisierten Modell und lernst nichts daraus.

## Speicherplatz

Ein 9B-Modell erzeugt einen 16-Bit-Merge (etwa 18 GB), ein BF16-GGUF (etwa 17 GB) und das quantisierte GGUF (etwa 5,6 GB). Ollama kopiert das GGUF bei `create` in seinen eigenen Speicher; die Zwischenprodukte können anschließend gelöscht werden. Behalte den Adapter (einige hundert MB), denn damit lässt sich alles neu erzeugen.

## Die Pipeline bereitstellen

Das Modell liefert JSON mit `[S3]`-Platzhaltern. Setze einen kleinen OpenAI-kompatiblen Server davor, der für jede Chat-Nachricht:

1. Passagen abruft,
2. mit der gemeinsamen Prompt-Funktion den Prompt erstellt,
3. das Modell mit dem JSON-Schema aufruft,
4. die Zitate prüft und die Marker umschreibt,
5. Markdown zurückgibt, in dem jede Referenz mit ihrer Quelle verlinkt ist und die Zitate darunter eingeklappt sind.

Für die meisten Chat-Oberflächen genügen zwei Endpunkte: `GET /v1/models` und `POST /v1/chat/completions`, wobei Streaming als einzelner Chunk beantwortet wird. Serialisiere Generierungen mit einem Lock, wenn die GPU geteilt wird.

## Details der Chat-Oberfläche

Chat-Oberflächen senden mehr als Fragen. Begrüßungen wie „hi“ sollten eine feste Antwort statt eines erzwungenen Zitats erhalten. Kurze Rückfragen wie „warum?“ benötigen die vorherige Frage für das Retrieval. Oberflächen erzeugen außerdem Chattitel und Tags über das ausgewählte Modell. Weise dieser Aufgabe ein anderes Modell zu, sonst durchläuft jeder Titel die gesamte Pipeline.

Open WebUI lässt jede Verbindung entweder die Chat Completions API oder die neuere Responses API verwenden. Ein Server, der nur `/v1/chat/completions` implementiert, gibt „not found“ zurück, wenn die Verbindung auf Responses eingestellt ist.

## Häufige Fehler

- Das rohe Modell ohne Verifier bereitstellen.
- Mit einem anders verpackten Basismodell vergleichen.
- Den Adapter nach dem Export löschen.
