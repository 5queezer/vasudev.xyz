---
title: "Warum KI-Agenten Schlafbenötigen"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
series: ["Building Agents That Sleep"]
series_weight: 1
description: "KI-Agenten erfassen Erinnerungen, aber konsolidieren sie nie. So nutzt MuninnDB's Dream Engine Erkenntnisse aus der Neurowissenschaft, um das zu beheben."
images: ["/images/dream-engine.png"]
translationHash: "b75e9cdaf12611ec7a2836d5eade77e1"
chunkHashes: "3b0ff2655d6195a8,eef9438b5c27cddb,5d70b12018209cbb,bc19745059a2ec72,67081ad65a291da7,9953ab1d0ae9aab0,5d64f27797af7a7f,2f9893eca2e24d8d"
---
Ich trage zu einer kognitiven Datenbank für KI‑Agenten bei, die [MuninnDB](https://github.com/scrypster/muninndb) heißt. Sie speichert alles: Sitzungsnotizen, Projektergebnisse, Arbeitsbeobachtungen, rechtliche Dokumentationen. Nach einigen Wochen täglicher Nutzung häufen sich die Einträge. Das Auffinden von Dingen funktioniert immer noch. Semantische Suche ist gut beim Abrufen. Aber der Datenspeicher faule dahin. Nahezu‑duplizierte Einträge aus Sitzungen, die dasselbe Thema abdeckten. Veraltete Fakten wurden von neueren überschlagen. Kein System, um „kritische rechtliche Notiz“ von „abwegigem Hinweis zu Docker‑Netzwerken“ zu unterscheiden.

**KI‑Agenten häufen Erinnerungen, genau wie Sammler Zeitungen anhäufen. Die Lösung ist nicht die bessere Suche. Es ist Schlaf.**
## What sleepactually does

Die Gedächtniskonsolidierung während des Schlafs ist kein Backup. Es ist ein aktiver, zerstörerischer Prozess. Der Hippocampus wiederholt kürzliche Erfahrungen, der Neocortex integriert sie in bestehende Wissensstrukturen, und das Gehirn schwächt Erinnerungen, die nicht gestärkt wurden, aktiv ab. Man wacht mit weniger Erinnerungen auf, als man eingeschlafen ist, und das ist der Punkt.

Drei Eigenschaften sind für das KI‑Systemdesign wichtig. Erstens ist die Konsolidierung selektiv. Wichtige Erinnerungen werden gestärkt, Rauschen wird abgeschwächt. Zweitens entdeckt sie Verbindungen. Das Gehirn verknüpft Konzepte über verschiedene Bereiche während des REM‑Schlafs. Drittens löst es Konflikte. Konfliktuelle Erinnerungen werden entschieden, wobei neuere oder stärker verstärkte Versionen siegen.

Kein Mainstream‑KI‑Gedächtnissystem macht das. Die meisten tun bestenfalls Deduplizierung.
## Vorarbeiten

Die Idee ist nichtneu. Forscher haben sie aus mehreren Richtungen untersucht.

Zhong et al. führten [MemoryBank](https://arxiv.org/abs/2305.10250) (2023) ein, ein LLM‑Speichersystem mit Ebbinghaus‑Vergessenskurven, das Erinnerungen über Zeit abschwächt, sofern sie nicht verstärkt werden. MuninnDB's bestehendes ACT‑R‑Modell baut darauf auf.

Der Artikel „Language Models Need Sleep“ auf [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) schlug einen expliziten „Dreaming“-Prozess vor, um fragile Kurzzeit‑Erinnerungen in stabile Langzeitwissen zu überführen. Dies ist das *nächste* theoretische Gerüst, das wir entwickeln.

Xie's [SleepGate](https://arxiv.org/abs/2603.14517) Framework (2026) fügte konfliktbewusste zeitliche Tagging und eine Vergessensschranke hinzu, reduzierte proaktive Interferenz von O(n) auf O(log n). Der zentrale Gedanke: Man muss *wann* etwas gelernt wurde, um Widersprüche zu lösen, nicht nur *was* gelernt wurde.

Und Anthropic testet [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) für Claude Code, einen Hintergrundprozess, der Speicherdateien zwischen Sitzungen konsolidiert. Er funktioniert mit flachen Textdateien. Das ist für einen Programmierassistenten ausreichend. Nicht ausreichend für ein kognitives Datenbanksystem.
## Die Lücke

MuninnDB hatte bereits die Erfassungseite abgedeckt: Vektoreinbettungen, Ebbinghaus decay, Hebbian association learning und ein Hintergrundkonsolidierungs‑Worker, der alle 6 Stunden algorithmisches Dedup ausführt. Was sie nicht konnte: Gründe dafür zu ergründen, warum zwei Einträge ähnlich sind, Widersprüche zu lösen oder Querbereichsverbindungen zu entdecken. Sie hatte ein Gedächtnis. Sie hatte keinen Schlaf.
## Der Traum-Engine

Der Traum-Engine erweitert die bestehende Konsolidierungspipeline um LLM‑Intelligenz. Sie läuft zwischen Sessions, wird automatisch beim Serverstart ausgelöst (das „Aufwachen“-Metapher) oder manuell über die CLI.

### Trigger‑Gates

Zwei Bedingungen müssen beide erfüllt sein, bevor ein Traum ausgeführt wird: mindestens 12 Stunden seit dem letzten Traum und mindestens 3 neue Einträge, die seit dem letzten Traum geschrieben wurden. Dies verhindert das churning an einem inactiven Store. Die Gates können mit `--force` für manuelle Ausführungen umgangen werden.

### Die Pipeline

Der Traum-Engine wiederverwendet vier bestehende Konsolidierungs‑Phasen, fügt drei neue hinzu und modifiziert eine. Phase 0 und die konfigurierbare Dedup‑Schwellwert‑Option, die in [PR #306](https://github.com/scrypster/muninnndb/pull/306) shipped ist. Die LLM‑Phasen (2b, 4, 6) wurden für einen Follow‑Up‑PR konzipiert und spezifiziert.

**Phase 0 (neu, bereitgestellt): Orient.** Nur‑Lese‑Scan jedes Vaults. Anzahl der Einträge zählen, Embedding‑Abdeckung prüfen, durchschnittliche Relevanz‑ und Stabilitätswerte berechnen, rechtliche Vaults erkennen. Dadurch wird die Karte erstellt, bevor etwas verändert wird.

**Phase 1 (existierend): Replay.** Aktivierungs‑Replay für Hebbian‑Assoziationsgewicht‑Updates. Unchanged.

**Phase 2 (existierend, geändert, bereitgestellt): Dedup.** Der algorithmische Dedup‑Phase, aber mit einer gesplitten Schwellwert‑Option. Im normalen Konsolidierungs‑Modus werden Einträge mit einem Kosinus‑Ähnlichkeitswert ≥ 0,95 wie zuvor automatisch zusammengeführt. Im Traum‑Modus sinkt die Schwellwert‑grenze auf 0,85. Einträge im Bereich 0,85‑0,95 werden *nicht* automatisch zusammengeführt. Stattdessen werden sie als Near‑Duplicate‑Cluster markiert und an die nächste Phase zur LLM‑Überprüfung weitergeleitet. Dieser architektonische Entscheid ist der Schlüssel: Lass den Algorithmus die offensichtlichen Fälle behandeln, lass die LLM die unklaren Fälle behandeln.

**Phase 2b (neu, ein Follow‑Up‑PR): LLM‑Konsolidierung.** Die Near‑Duplicate‑Cluster und alle erkannten Widersprüche werden an einen konfigurierten LLM weitergeleitet. Das LLM gibt strukturiertes JSON zurück: Merge‑Operationen, Widerspruchsauflösungen, Vorschläge für Quer‑Vault‑Verbindungen, Stabilitätsempfehlungen und ein narrativer Journal‑Eintrag. Das LLM verlinkt nichts automatisch über Vaults hinweg. Es schlägt nur vor. Ein Mensch prüft die Vorschläge im Traum‑Journal.

**Phase 3 (existierend): Schema‑Promotion.** Unchanged.

**Phase 4 (neu, ein Follow‑Up‑PR): Bidirektionale Stabilität.** Hier happens das Vergessen. High‑Signal‑Einträge (häufig zugegriffen, kürzlich durch Hebbian‑Ko‑Aktivierung verstärkt oder vom LLM empfohlen) erhalten einen Stabilitäts‑Boost von 1,2‑fach. Low‑Signal‑Einträge (selten zugegriffen, alt, niedrige Relevanz, nicht vom LLM empfohlen) werden auf 0,8‑fach reduziert, mit einem Floor von 14 Tagen, wodurch sie nie unter die Standard‑Stabilität fallen. LLM‑Empfehlungen überschreiben die regelbasierten Anpassungen. Dies modelliert die Streuungs‑Wirkung: Aufgenommen Einträge bleiben stark, nicht aufgenommene Einträge verblassen allmählich.

**Phase 5 (existierend): Transitive Schlussfarung.** Unchanged.

**Phase 6 (neu, ein Follow‑Up‑PR): Traum‑Journal.** Die LLM‑Narrative plus der Konsolidierungsbericht werden zu einem lesbaren Eintrag formatiert und an `~/.muninn/dream.journal.md` angehängt. Dies ist die Ausgabe, die du tatsächlich liest. Sie sagt dir, welche Verbindungen entdeckt wurden, was gestärkt wurde, was bereinigt wurde und was übersprungen wurde.

### Vault‑Vertrauens‑Tiers

Nicht alle Vaults sind gleich und nicht alle LLM‑Anbieter sind gleich. MuninnDB enforce (t) trust tiers pro Vault:

- Legal vaults überspringen Phase 2b komplett. Sie werden keiner LLM, sogar einer lokalen, zugeführt. Rechtliche Einträge werden unverändert erhalten und nie von der Konsolidierung berührt.
- Work‑ und Personal‑Vaults sind auf lokale Ollama oder Anthropic's API beschränkt. Sie werden nie an OpenAI oder andere Anbieter gesendet.
- Global‑ und Projekt‑Vaults können jeden konfigurierten Anbieter nutzen.

Dies ist konfigurierbar, nicht hardcodiert. Die Auflösungs‑Reihenfolge prüft zuerst Ollama (lokal, keine Daten verlassen die Maschine), dann Anthropic, dann OpenAI, sofern die Vault‑Richtlinie es zulässt.

### Laufzeit‑Modell

Die Schlaf/Wach‑Metapher passt direkt zum Server‑Lebenszyklus. Wenn MuninnDB stoppt (`muninn stop`), schreibt es eine `dream.due` Sidecar‑Datei im Datenverzeichnis. Wenn es startet (`muninn start`), prüft es die Datei und die Trigger‑Gates. Sind beide erfüllt, wird ein Traum ausgeführt, bevor Ports geöffnet werden. Wenn der Traum eine konfigurierbare Timeout‑Grenze (Standard 60 Sekunden) überschreitet, wird er abgebrochen und der normale Start erfolgt. Der Server blockiert nie unendlich lange auf einem Traum.

Für manuelle Nutzung: `muninn dream --dry-run` zeigt, was ohne Schreibvorgänge geschehen würde. Der Dry‑Run generiert trotzdem die vollständige Journal‑Narrative und gibt sie an stdout mit einem `[DRY RUN]`‑Header aus. Dies ist essenziell für Vertrauen. Du kannst genau sehen, was die Engine tun würde, bevor du ihr das Schreiben erlaubst.
**Auto‑verlinkungenüber Vaults.** Der Dream Engine schlägt Verknüpfungen vor, aber er erstellt sie nie automatisch. Ein Mensch liest das Tagebuch und entscheidet. Vertrauen vor Automatisierung.

**Gemeinsames Speicher für Multi‑Agenten.** MuninnDB ist nur ein Benutzer, nur eine Instanz. Gemeinsamer Speicher zwischen Agenten ist ein völlig unterschiedliches Bedrohungsmodell.

**Zeitbasierte Warnungen.** Das LLM könnte bemerken „dieser API key verfällt in 4 Tagen“, aber das Verfolgen von Ablaufdaten ist eine Funktion, keine Konsolidierung. Für v1 nicht vorgesehen.

**Emotionale Modellierung.** Salience‑Scoring ist ein Ersatz. Echte emotionale Gewichtung benötigt Signale, die ein textbasiertes System nicht hat. Aufgeschoben.
## Das Traumtagebuch

Hier ist, was ein Traumlauf erzeugen wird, sobald die LLM‑Phasen in einer Folger‑PR bereitgestellt sind:

```
---
## 2026-03-28T06:00:00Z -- Dream

**Connections discovered:**
- Your note about DNS timeout in the k8s cluster shares the same
  root cause as the prod incident from March 21. (suggested link)

**Strengthened:**
- 3 memories about auth patterns reinforced (accessed 8+ times)

**Cleaned up:**
- Merged 2 near-duplicate notes about Docker networking
- Resolved 1 contradiction: old API endpoint superseded by new one

*Scanned 47 entries across 3 vaults (legal: 8 skipped) in 4.2s*
```

Jeden Morgen liest du, was dein Gedächtnissystem geträumt hat. Die Verbindungen, die es bemerkt hat. Das Rauschen, das es aufräumt. Die Widersprüche, die es gelöst hat. Es ist ein Changelog für dein Wissen, geschrieben in Prosa. MuninnDB ist das kognitive Gedächtnis‑Backend für [Hrafn](https://github.com/5queezer/hrafn), ein leichtgewichtiges, modulares KI‑Agenten‑Runtime.
## Tryit

The read-only foundation (Phase 0 + configurable dedup + dry-run CLI) shipped in [PR #306](https://github.com/scrypster/muninndb/pull/306) and is merged. Write phases (bidirectional stability, LLM consolidation, journal) follow in a separate PR. The full design spec lives in the repo at `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni builds AI agent infrastructure. [Hrafn](https://github.com/5queezer/hrafn) is the runtime. [MuninnDB](https://github.com/scrypster/muninndb) is the memory.*

*The cover image for this post was generated by AI.*