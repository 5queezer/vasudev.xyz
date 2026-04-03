---
title: "WarumAI Agents Schlaf benötigen"
date: 2026-03-28
tags: ["ai", "memory", "llm", "muninndb", "architecture"]
description: "KI-Agenten erfassen Erinnerungen, konsolidieren sie aber nie. Hier erfahren Sie, wie MuninnDBs Dream Engine aus der Neurowissenschaft leiht, um das zu beheben."
images: ["/images/dream-engine.png"]
translationHash: "1bc75a39750f262e2b285a4678a43346"
---
Ich trage zu einer kognitiven Datenbank für KI-Agenten bei, namens [MuninnDB](https://github.com/scrypster/muninndb). Sie speichert alles: Sitzungsnotizen, Projektkontext, Beobachtungen zur Arbeit und juristische Dokumentation. Nach einigen Wochen täglichen Gebrauchs stapeln sich die Einträge. Die Suche funktioniert weiterhin – die semantische Suche ist gut im Abruf. Doch der Speicher selbst verfaulte. Beinahe-duplicateinträge aus Sitzungen, die denselben Inhalt behandelten. Veraltete Fakten, die durch neuere ersetzt wurden. Kein System, um „kritischen juristischen Hinweis“ von „beiläufiger Bemerkung über Docker-Netzwerkkonfiguration“ zu unterscheiden.

Das Problem liegt nicht beim Erfassen. Jedes Speichersystem meistert das Erfassen perfekt. Das Problem ist das, was zwischen den Sitzungen passiert – und das ist gewöhnlich nichts.

**KI-Agenten sammeln Erinnerungen so, wie Sammler Zeitungen sammeln. Die Lösung ist nicht eine bessere Suche. Sie ist Schlaf.**

## Was Schlaf tatsächlich bewirkt

Die menschliche Gedächtniskonsolidierung während des Schlafs ist kein Backup-Vorgang. Sie ist ein aktiver, destruktiver Prozess. Der Hippocampus spielt jüngste Erfahrungen erneut ab, der Neocortex integriert sie in bestehende Wissensstrukturen, und das Gehirn schwächt gezielt Erinnerungen, die nicht verstärkt wurden. Sie erwachen mit weniger Erinnerungen, als Sie ins Bett gegangen sind – und genau das ist beabsichtigt.

Drei Eigenschaften sind für das Design von KI-Systemen relevant. Erstens ist die Konsolidierung selektiv – wichtige Erinnerungen werden verstärkt, Rauschen abgeschwächt. Zweitens entdeckt sie Zusammenhänge – das Gehirn verknüpft Konzepte über Disziplinen hinweg während des REM-Schlafs. Drittens löst sie Konflikte auf – widersprüchliche Erinnerungen werden beigelegt, wobei neuere oder stärker verstärkte Versionen Vorrang erhalten.

Keines der verbreiteten KI-Speichersysteme tut irgendetwas davon. Die meisten bieten bestenfalls Deduplizierung.

## Vorhabende Arbeiten

Die Idee ist nicht neu. Forschende haben sie aus mehreren Richtungen herangetastet.

Zhong et al. stellten [MemoryBank](https://arxiv.org/abs/2305.10250) (2023) vor, ein LLM-Speichersystem mit Ebbinghaus’schen Vergessenskurven – Erinnerungen verfallen über die Zeit, sofern sie nicht verstärkt werden. Das existierende ACT-R-Modell in MuninnDB baut auf dieser Grundlage auf.

Der Aufsatz „Language Models Need Sleep“ auf [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) schlug einen expliziten „Traum“-Prozess vor, um fragile Kurzzeiterinnerungen in stabiles Langzeitwissen zu übertragen – der engste theoretische Rahmen, der unserem Vorhaben entspricht.

Xies [SleepGate](https://arxiv.org/abs/2603.14517)-Framework (2026) fügte konfliktbewusste zeitliche Tagging und eine Vergiss- gate hinzu und reduzierte proaktive Interferenz von O(n) auf O(log n). Die zentrale Erkenntnis: Um Widersprüche aufzulösen, muss man *wann* etwas gelernt wurde wissen, nicht nur *was* gelernt wurde.

UndAnthropic testet [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) für Claude Code – einen Hintergrundprozess, der Speicherdateien zwischen Sitzungen konsolidiert. Er arbeitet mit flachen Textdateien. Angemessen für einen Code-Assistenten. Unzureichend für eine kognitive Datenbank.

## Die Lücke

MuninnDB hatte bereits die Erfassungsseite abgedeckt: Vektor-Einbettungen, Ebbinghaus-Verfall, Hebb’sche Assoziationslernen und ein Hintergrund-Konsolidierer, der alle 6 Stunden algorithmische Deduplizierung durchführt. Was es nicht konnte: *warum* zwei Einträge ähnlich sind, zu bewerten, Widersprüche aufzulösen oder querdomänale Verbindungen zu entdecken. Es verfügte über ein Gedächtnis, aber nicht über Schlaf.

## Die Traum-Engine

Die Traum-Engine erweitert die bestehende Konsolidierungs-Pipeline um KI-Intelligenz. Sie läuft zwischen Sitzungen – automatisch beim Serverstart (die Metapher „aufwachen“) oder manuell über die CLI ausgelöst.

### Auslöse-Tore

Bevor ein Traum ausgeführt wird, müssen zwei Bedingungen erfüllt sein: Mindestens 12 Stunden seit dem letzten Traum und mindestens 3 neue Einträge seit dem letzten Traum. Dies verhindert das ständige Umdrehen eines inaktiven Speichers. Die Tore können mit `--force` für manuelle Durchläufe umgangen werden.

### Die Pipeline

Die Traum-Engine wiederverwendet vier bestehende Konsolidierungsphasen, fügt drei neue hinzu und modifiziert eine. Phase 0 und der einstellbare Dedup-Schwellenwert wurden in [PR #306](https://github.com/scrypster/muninndb/pull/306) eingeführt. Die LLM-Phasen (2b, 4, 6) sind für ein Folge-PR konzipiert und spezifiziert.

**Phase 0 (neu, bereits released): Orientierung.** Schreibgeschützter Scan jedes Tresors. Zählt Einträge, prüft Einbettungsabdeckung, berechnet durchschnittliche Relevanz- und Stabilitätswerte, erkennt juristische Tresore. Dies baut die Karte auf, bevor irgendetwas berührt wird.

**Phase 1 (vorhanden): Replay.** Aktivitäts-Replay zur Aktualisierung der Hebb’schen Assoziationsgewichte. Unverändert.

**Phase 2 (vorhanden, modifiziert, bereits released): Deduplizierung.** Der algorithmische Dedup-Phasenablauf, jedoch mit einem differenzierten Schwellenwert. Im normalen Konsolidierungsmodus werden Einträge mit Cosinus-Ähnlichkeit ≥ 0,95 wie gehabt automatisch zusammengefügt. Im Traummodus sinkt der Schwellenwert auf 0,85. Einträge im Bereich 0,85–0,95 werden *nicht* automatisch zusammengefügt – sie werden als Beinahe-Duplicate-Cluster markiert und an die nächste Phase für LLM-Überprüfung weitergeleitet. Dies ist die entscheidende architektonische Entscheidung: Das Algorithmus überlässt die evidenten Fälle dem LLM, das die unsicheren Fälle bearbeitet.

**Phase 2b (neu, Folge-PR): LLM-Konsolidierung.** Die Beinahe-Duplicate-Cluster und alle erkannten Widersprüche werden an einen konfigurierbaren LLM gesendet. Der LLM gibt strukturiertes JSON zurück: Merge-Operationen, Widerspruchslösungen, Vorschläge für Quer-Tresor-Verbindungen, Stabilitätsempfehlungen und einen narrativen Journal-Eintrag. Der LLM verknüpft *nichts* automatisch über Tresore hinweg – er schlägt lediglich vor. Ein Mensch prüft die Vorschläge im Traum-Journal.

**Phase 3 (vorhanden): Schema-Promotion.** Unverändert.

**Phase 4 (neu, Folge-PR): Bidirektionale Stabilität.** Hier erfolgt der Verfall. Einträge mit hohem Signal (häufig abgerufen, kürzlich verstärkt über Hebb’sche Co-Aktivierung oder vom LLM empfohlen) erhalten eine Stabilitätssteigerung um 1,2×. Einträge mit niedrigem Signal (selten abgerufen, alt, niedrige Relevanz, nicht vom LLM gefördert) werden auf 0,8× abgeschwächt, mit einem Minimum von 14 Tagen – sie fallen nie unter die Standardstabilität. LLM-Empfehlungen überschreiben die regelbasierten Anpassungen. Dies modelliert denSpacing Effect: Einträge, die abgerufen werden, bleiben stark; Einträge, die nicht abgerufen werden, verblassen allmählich.

**Phase 5 (vorhanden): Transitive Inferenz.** Unverändert.

**Phase 6 (neu, Folge-PR): Traum-Journal.** Der LLM-Narrativ plus der Konsolidierungsbericht werden in einen menschenlesbaren Eintrag umgewandelt und an `~/.muninn/dream.journal.md` angehängt. Dies ist die Ausgabe, die Sie effektiv lesen. Sie erfährt, welche Verbindungen entdeckt wurden, was verstärkt wurde, was bereinigt wurde und was übersprungen wurde.

### Tresor-Vertrauensstufen

Nicht alle Tresore sind gleich, und nicht alle LLM-Anbieter sind gleich. MuninnDB erzwingt pro Tresor Vertrauensstufen:

Juristische Tresore überspringen Phase 2b komplett – sie werden niemals einem LLM vorgelegt, nicht einmal einem lokalen. Juristische Einträge bleiben Wort für Wort erhalten und werden niemals von der Konsolidierung berührt.

Arbeits- und persönliche Tresore sind auf lokales Ollama oder Anthropic’s API beschränkt. Sie werden niemals an OpenAI oder andere Anbieter weitergeleitet.

Globale und projektbezogene Tresore können jeden konfigurierten Anbieter nutzen.

Dies ist konfigurierbar, nicht hardcoded. Die Resolutions-Reihenfolge prüft zuerst Ollama (lokal, Daten verlassen die Maschine nicht), dann Anthropic, dann OpenAI soweit die Tresor-Richtlinie es erlaubt.

### Laufzeitsmodell

Die Schlaf/Aufwachen-Metapher lässt sich direkt auf den Server-Lebenszyklus übertragen. Wenn MuninnDB stoppt (`muninn stop`), schreibt es eine `dream.due`-Beipackdatei in das Datenverzeichnis. Beim Start (`muninn start`) prüft sie diese Datei und die Auslöse-Tore. Wenn beide erfüllt sind, führt sie einen Traum aus, bevor Ports geöffnet werden. Wenn der Traum eine konfigurierbare Zeitüberschreitung überschreitet (Standard: 60 Sekunden), bricht er ab und der Server startet normal. Der Server blockiert niemals unendlich lang bei einem Traum.

Für manuelle Nutzung: `muninn dream --dry-run` zeigt, was passieren würde, ohne etwas zu schreiben. Der Testdurchlauf erzeugt dennoch das vollständige Journal-Narrativ und gibt es mit einem `[DRY RUN]`-Header auf stdout aus. Dies ist essenziell für Vertrauen – Sie können exakt sehen, was die Engine tut, bevor sie etwas schreibt.

## Was ich ausgelassen habe

**Automatische Quer-Tresor-Verknüpfungsvorschläge.** Die Traum-Engine schlägt Verbindungen vor, erstellt sie jedoch nie automatisch. Ein Mensch liest das Journal und entscheidet. Vertrauen vor Automatisierung.

**Gemeinsame Speicherung zwischen mehreren Agenten.** MuninnDB ist ein Benutzer, eine Instanz. Geteilter Speicher zwischen Agenten stellt ein komplett anderes Bedrohungsszenario dar.

**Zeitliche Warnhinweise.** Der LLM könnte „Dieser API-Schlüssel läuft in 4 Tagen ab“ bemerken, aber das Abgleichen von Ablaufdaten ist eine Funktion und keine Konsolidierung. Für v1 außerhalb desScopes.

**Emotionsmodellierung.** Salienzbewertung ist ein Ersatz. Reale emotionale Gewichtung benötigt Signale, die ein textbasiertes System nicht besitzt. Aufgeschoben.

## Das Traum-Journal

Hier ist, was ein Traumdurchlauf erzeugen wird, sobald die LLM-Phasen in einem Folge-PR freigegeben wurden:

```
---
## 2026-03-28T06:00:00Z -- Traum

**Entdeckte Verbindungen:**
- Ihr Hinweis zum DNS-Timeout im k8s-Cluster teilt die gleiche
  Ursache wie der Produktionsvorfall vom 21. März. (vorgeschlagener Link)

**Verstärkt:**
- 3 Erinnerungen zu Authentifizierungsmustern verstärkt (8+ Abrufe)

**Bereinigt:**
- 2 fast-identische Notizen zu Docker-Netzwerkkonfiguration zusammengefasst
- 1 Widerspruch gelöst: Alter API-Endpunkt durch neuen ersetzt

*47 Einträge in 3 Tresoren (juristisch: 8 übersprungen) in 4,2s gescannt*
```

Jeden Morgen lesen Sie, worüber Ihr Speichersystem geträumt hat. Die Verbindungen, die es erkannte. Das Rauschen, das es bereinigte. Die Widersprüche, die es auflöste. Es ist ein Änderungsprotokoll Ihres Wissens, in Prosa verfasst. MuninnDB ist der kognitive Speicherbackend für [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige, modulare KI-Agenten-Runtime.

## Ausprobieren

Die schreibgeschützte Grundlage (Phase 0 + konfigurierbare Dedup + Dry-Run-Cli) wurde in [PR #306](https://github.com/scrypster/muninndb/pull/306) veröffentlicht und ist eingepflegt. Schreibphasen (bidirektionale Stabilität, LLM-Konsolidierung, Journal) folgen in einem separaten PR. Die vollständige Design-Spezifikation liegt im Repository unter `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni entwickelt Infrastruktur für KI-Agenten. Hrafn finden Sie unter [github.com/5queezer/hrafn](https://github.com/5queezer/hrafn). MuninnDB liegt bei [github.com/scrypster/muninndb](https://github.com/scrypster/muninndb).*