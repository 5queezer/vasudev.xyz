---
title: "09 — Eine GPU für das größere Modell mieten"
description: "Was hochgeladen werden muss, wie du die Kosten abschätzt und welche betrieblichen Fallen bei unbeaufsichtigtem Cloud-Training lauern: langsame Mirrors, stille Watcher und an einen Host gebundene Volumes."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "01534b867288dfd114c54338964ab88e"
---

# 09 — Eine GPU für das größere Modell mieten

## Kerngedanke

Wenn das größere Modell nicht auf deine Karte passt, miete nur für den Trainingslauf eine. Erzeuge Daten, exportiere und evaluiere weiterhin lokal und lade so wenig wie möglich hoch.

## Nur das Nötigste hochladen

Im Beispiel wurde ein 15-MB-Paket hochgeladen: Trainingsskript, festgeschriebene Requirements-Datei, Run-Skript sowie Trainings- und Validierungs-JSONL. Keine Datenbank, kein Audio, keine Schlüssel. Der Pod lud das Basismodell selbst herunter. Vor dem Upload bestätigte ein unabhängiges Skript, dass keine Passage aus einem Holdout- oder ausgeschlossenen Dokument stammte.

Wenn die Daten Material enthalten, das du nicht veröffentlichen würdest, wähle die eigenen Rechenzentren eines Anbieters (zum Beispiel RunPod Secure Cloud) statt Community-Hosts.

## Kosten abschätzen

Skaliere von einem lokalen Lauf. Das 4B-Modell benötigte lokal 2 h 49 min. Das 9B-Modell braucht etwa doppelt so viel Rechenleistung, und eine 48-GB-Workstation-Karte ist etwas schneller als eine 16-GB-Consumer-Karte; 3 bis 4 Stunden waren daher eine vernünftige Schätzung. Der tatsächliche Lauf dauerte 3 h 35 min bei etwa einem Dollar pro Stunde. Plane für einen fehlgeschlagenen Start das Doppelte der erwarteten Zeit ein.

## Das Run-Skript langweilig halten

```bash
set -euo pipefail
export HF_HOME=${HF_HOME:-$PWD/.hf}          # model cache on the persistent volume
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-train.txt
python train.py check
python train.py train --min-free-gb 30
python train.py export --stage merge
```

Schreibe jede lokal verwendete Version fest. Lege den Hugging-Face-Cache auf dem persistenten Volume ab, nicht auf der Container-Platte. Starte mit `nohup`, damit der Prozess einen SSH-Abbruch übersteht.

## Fallen

**Langsame Mirrors.** Der erste Pod im Beispiel lud PyTorch mit 140 KB/s. Wenn die Installation nicht nach wenigen Minuten fertig ist, lösche den Pod und probiere eine andere Region oder einen anderen GPU-Typ.

**Stille Watcher.** Ein Watcher, der den Pod über SSH prüft, darf nicht vom Exit-Code seines letzten Befehls abhängen:

```bash
st=$(ssh "$POD" 'pgrep -f "^bash run.sh" && echo RUNNING; grep -q Error run.log && echo ERROR; true')
```

Ohne das abschließende `true` liefert `grep` bei einem gesunden Log Exit-Code 1, jede Prüfung sieht wie ein Verbindungsfehler aus und der fertige Pod läuft im Leerlauf weiter. Im Beispiel kostete das drei ungenutzte GPU-Stunden. Teste den Watcher gegen einen simulierten „fertig“-Zustand, bevor du schlafen gehst.

**An einen Host gebundene Volumes.** Ein gestoppter Pod behält sein Volume auf der physischen Maschine; zum Neustart muss eine GPU auf genau dieser Maschine frei sein. Sorge dafür, dass der Job als letzten Schritt seine Ergebnisse an einen anderen Ort überträgt (Object Storage, Netzwerk-Volume, eigener Server), statt darauf zu warten, dass sie abgeholt werden.

**Eine Deadline.** Plane als unabhängiges Sicherheitsnetz einen Stopp zu einer festen Uhrzeit, unabhängig vom Watcher.

## Sauber abschließen

Lade die Ergebnisse herunter, vergleiche die Prüfsummen mit dem Pod und beende danach Pod und Volume endgültig. Stoppen reicht nicht, denn ein gestopptes Volume verursacht weiterhin Kosten.

## Häufige Fehler

- Das gesamte Projekt statt eines Pakets hochladen.
- Nicht festgeschriebene Abhängigkeiten auf dem Pod.
- Ergebnisse nur von einem stoppbaren Pod abholen, statt sie wegzuschieben.
