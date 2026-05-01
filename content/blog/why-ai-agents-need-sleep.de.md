---
title: "Warum KI-Agenten Schlaf benötigen"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
agentQuestions:
  - "Warum brauchen KI-Agenten Schlaf?"
  - "Wie funktioniert MuninnDBs Dream Engine?"
  - "Was behebt Konsolidierung in Agenten-Memory?"
series: ["Building Agents That Sleep"]
series_weight: 1
description: "KI‑Agenten erfassen Erinnerungen, konsolidieren sie jedoch nie. So leiht sich MuninnDBs Dream Engine von der Neurowissenschaft, um das zu beheben."
images: ["/images/dream-engine.png"]
aliases: ["/blog/stop-hoarding-memories-let-your-agent-sleep/"]
translationHash: "7ca50e0f736185f082a9ae3308d1ecd5"
chunkHashes: "3b0ff2655d6195a8,eef9438b5c27cddb,5d70b12018209cbb,bc19745059a2ec72,583aa6b526db12dc,9953ab1d0ae9aab0,5d64f27797af7a7f,63274f06db4f9fc5"
---
Ich trage zu einer kognitiven Datenbank für KI‑Agenten bei, genannt [MuninnDB](https://github.com/scrypster/muninndb). Sie speichert alles: Sitzungsnotizen, Projektkontexte, Arbeitsbeobachtungen, rechtliche Dokumentation. Nach ein paar Wochen täglicher Nutzung stapeln sich die Einträge. Das Auffinden funktioniert noch. Die semantische Suche ist gut im Abrufen. Aber das Repository selbst verfiel. Nahe‑Duplikate aus Sitzungen, die denselben Stoff behandelten. Veraltete Fakten, die von neueren überholt wurden. Kein System, das „kritische rechtliche Notiz“ von „flüchtigem Kommentar zu Docker‑Netzwerken“ unterscheidet.

Das Problem ist nicht die Erfassung. Jedes Gedächtnissystem sichert die Erfassung. Das Problem ist, was zwischen den Sitzungen passiert – und das ist meist nichts.

**KI‑Agenten sammeln Erinnerungen, wie Sammler Zeitungen horten. Die Lösung ist nicht bessere Suche. Sie ist Schlaf.**
## What sleep actually does

Human memory consolidation during sleep is not backup. It is an active, destructive process. The hippocampus replays recent experiences, the neocortex integrates them into existing knowledge structures, and the brain actively weakens memories that did not get reinforced. You wake up with fewer memories than you went to sleep with, and that is the point.

Three properties matter for AI system design. First, consolidation is selective. Important memories get strengthened, noise gets weakened. Second, it discovers connections. The brain links concepts across domains during REM sleep. Third, it resolves conflicts. Contradictory memories get adjudicated, with more recent or more reinforced versions winning.

No mainstream AI memory system does any of this. Most do deduplication at best.
## Prior art

Die Idee ist nicht neu. Forscher haben sie aus mehreren Richtungen untersucht.

Zhong et al. stellten [MemoryBank](https://arxiv.org/abs/2305.10250) (2023) vor, ein LLM‑Speichersystem mit Ebbinghaus‑Vergessenskurven, die Erinnerungen im Laufe der Zeit verfallen lassen, sofern sie nicht verstärkt werden. Das bestehende ACT‑R‑Modell von MuninnDB baut auf dieser Grundlage auf.

Das Papier *Language Models Need Sleep* auf [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) schlug einen expliziten „Dreaming“-Prozess vor, um fragile Kurzzeit‑Erinnerungen in stabiles Langzeit‑Wissen zu überführen. Dies ist die theoretisch dichteste Rahmung dessen, was wir bauen.

Xies [SleepGate](https://arxiv.org/abs/2603.14517)‑Framework (2026) fügte konfliktbewusste zeitliche Tagging‑ und eine Forgetting‑Gate‑Komponente hinzu, wodurch proaktive Interferenz von O(n) auf O(log n) reduziert wurde. Die zentrale Erkenntnis: Man muss wissen, *wann* etwas gelernt wurde, um Widersprüche zu lösen, nicht nur *was* gelernt wurde.

Und Anthropic testet [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) für Claude Code, einen Hintergrundprozess, der Speicherdateien zwischen Sitzungen konsolidiert. Er funktioniert mit flachen Textdateien. Angemessen für einen Codierungsassistenten, aber nicht ausreichend für eine kognitive Datenbank.
## The gap

MuninnDB hatte bereits die Erfassungsseite abgedeckt: Vektor‑Einbettungen, Ebbinghaus‑Verfall, hebbische Assoziations‑Lernverfahren und einen Hintergrund‑Konsolidierungs‑Worker, der alle 6 Stunden algorithmisch dedupliziert. Was es nicht konnte: darüber nachzudenken, *warum* zwei Einträge ähnlich sind, Widersprüche aufzulösen oder bereichsübergreifende Verbindungen zu entdecken. Es hatte ein Gedächtnis. Es hatte keinen Schlaf.
## The Dream Engine

The Dream Engine erweitert die bestehende Konsolidierungspipeline um LLM‑Intelligenz. Sie läuft zwischen Sitzungen, wird automatisch beim Server‑Start (die Metapher des „Aufwachens“) oder manuell über die CLI ausgelöst.

### Trigger‑Gates

Zwei Bedingungen müssen beide erfüllt sein, bevor ein Traum läuft: mindestens 12 Stunden seit dem letzten Traum und mindestens 3 neue Einträge seit dem letzten Traum. Das verhindert unnötiges Arbeiten bei einem inaktiven Store. Die Gates können mit `--force` für manuelle Läufe umgangen werden.

### Die Pipeline

![Dream Engine pipeline showing phases 0 through 6, with legal vaults branching to skip LLM phases](/images/dream-pipeline-inline.svg)

The Dream Engine verwendet vier vorhandene Konsolidierungsphasen, fügt drei neue hinzu und ändert eine. Phase 0 und der konfigurierbare Dedup‑Schwellwert wurden in [PR #306](https://github.com/scrypster/muninndb/pull/306) ausgeliefert. Die LLM‑Phasen (2b, 4, 6) sind für ein Folge‑PR konzipiert und spezifiziert.

**Phase 0 (neu, ausgeliefert): Orient.** Read‑only‑Scan jedes Vaults. Zählt Einträge, prüft Embedding‑Abdeckung, berechnet durchschnittliche Relevanz‑ und Stabilitätswerte, erkennt legale Vaults. Das baut die Karte, bevor irgendetwas berührt wird.

**Phase 1 (bestehend): Replay.** Aktivierungs‑Replay für Hebbian‑Assoziations‑Gewichts‑Updates. Unverändert.

**Phase 2 (bestehend, modifiziert, ausgeliefert): Dedup.** Die algorithmische Dedup‑Phase, jedoch mit geteiltem Schwellenwert. Im normalen Konsolidierungsmodus werden Einträge mit Kosinus‑Ähnlichkeit ≥ 0,95 wie bisher automatisch zusammengeführt. Im Traum‑Modus fällt der Schwellenwert auf 0,85. Einträge im Bereich 0,85‑0,95 werden *nicht* automatisch zusammengeführt. Stattdessen werden sie als Near‑Duplicate‑Cluster markiert und an die nächste Phase zur LLM‑Prüfung weitergeleitet. Das ist die zentrale architektonische Entscheidung: Das Algorithmus‑System behandelt die offensichtlichen Fälle, das LLM die mehrdeutigen.

**Phase 2b (neu, ein Folge‑PR): LLM Consolidation.** Die Near‑Duplicate‑Cluster und alle erkannten Widersprüche werden an ein konfiguriertes LLM gesendet. Das LLM liefert strukturiertes JSON: Merge‑Operationen, Widerspruchs‑Auflösungen, Vorschläge für Cross‑Vault‑Verbindungen, Stabilitäts‑Empfehlungen und einen narrativen Journal‑Eintrag. Das LLM verlinkt nichts automatisch über Vaults hinweg. Es schlägt nur vor. Ein Mensch prüft die Vorschläge im Traum‑Journal.

**Phase 3 (bestehend): Schema Promotion.** Unverändert.

**Phase 4 (neu, ein Folge‑PR): Bidirectional Stability.** Hier findet das Vergessen statt. Hoch‑Signal‑Einträge (häufig abgerufen, kürzlich durch Hebbian‑Ko‑Aktivierung verstärkt oder vom LLM empfohlen) erhalten einen Stabilitäts‑Boost von 1,2 ×. Niedrig‑Signal‑Einträge (selten abgerufen, alt, geringe Relevanz, nicht vom LLM gefördert) werden auf 0,8 × abgeschwächt, mit einer Untergrenze von 14 Tagen, das heißt, sie fallen nie unter die Standard‑Stabilität. LLM‑Empfehlungen setzen die regelbasierte Anpassung außer Kraft. Das modelliert den Spacing‑Effekt: Abrufene Einträge bleiben stark, nicht‑abgerufene verblassen allmählich.

**Phase 5 (bestehend): Transitive Inference.** Unverändert.

**Phase 6 (neu, ein Folge‑PR): Dream Journal.** Die LLM‑Narrative plus der Konsolidierungs‑Report werden zu einem menschenlesbaren Eintrag formatiert und an `~/.muninn/dream.journal.md` angehängt. Das ist die Ausgabe, die du tatsächlich liest. Sie sagt dir, welche Verbindungen entdeckt, welche gestärkt, welche bereinigt und welche übersprungen wurden.

### Vault‑Trust‑Tiers

Nicht alle Vaults sind gleich und nicht alle LLM‑Anbieter sind gleich. MuninnDB erzwingt Trust‑Tiers pro Vault:

Legale Vaults überspringen Phase 2b komplett. Sie werden nie an irgendein LLM gesendet, nicht einmal an ein lokales. Legale Einträge werden wortwörtlich erhalten und nie von der Konsolidierung berührt.

Arbeits‑ und Privat‑Vaults sind auf lokale Ollama‑ oder Anthropic‑APIs beschränkt. Sie werden nie an OpenAI oder andere Anbieter gesendet.

Globale und Projekt‑Vaults können jeden konfigurierten Anbieter nutzen.

Das ist konfiguriert, nicht hart kodiert. Die Auflösungs‑Reihenfolge prüft zuerst Ollama (lokal, keine Daten verlassen die Maschine), dann Anthropic, dann OpenAI, sofern die Vault‑Richtlinie es erlaubt.

### Runtime‑Model

Die Schlaf/‑Wach‑Metapher mappt direkt auf den Server‑Lebenszyklus. Wenn MuninnDB stoppt (`muninn stop`), schreibt es eine `dream.due`‑Sidecar‑Datei ins Datenverzeichnis. Beim Neustart (`muninn start`) prüft es die Datei und die Trigger‑Gates. Wenn beide passen, läuft ein Traum, bevor Ports geöffnet werden. Überschreitet der Traum ein konfigurierbares Timeout (Standard 60 Sekunden), wird er abgebrochen und der Server startet normal. Der Server blockiert niemals unbegrenzt auf einen Traum.

Für den manuellen Gebrauch: `muninn dream --dry-run` zeigt, was passieren würde, ohne etwas zu schreiben. Der Dry‑Run erzeugt immer noch die vollständige Journal‑Narrative und gibt sie mit einem `[DRY RUN]`‑Header auf stdout aus. Das ist essenziell für das Vertrauen. Du kannst exakt sehen, was die Engine tun würde, bevor du sie schreiben lässt.
## Was ich weggelassen habe

**Automatisches Verlinken von Cross‑Vault‑Vorschlägen.** Die Dream Engine schlägt Verbindungen vor, erstellt sie aber nie automatisch. Ein Mensch liest das Journal und entscheidet. Vertrauen vor Automatisierung.

**Speichern von Gedächtnisinhalten über mehrere Agenten hinweg.** MuninnDB ist ein Benutzer, eine Instanz. Gemeinsamer Speicher über Agenten hinweg ist ein völlig anderes Bedrohungsmodell.

**Zeitliche Benachrichtigungen.** Das LLM könnte bemerken „diese API‑Schlüssel läuft in 4 Tagen ab“, aber das Verfolgen von Ablaufdaten ist ein Feature, keine Konsolidierung. Nicht im Umfang von v1 enthalten.

**Emotionsmodellierung.** Salienz‑Scoring ist ein Ersatz. Echte emotionale Gewichtung erfordert Signale, die ein textbasiertes System nicht hat. Aufgeschoben.
## Das Traumjournal

Hier ist, was ein Traumlauf erzeugt, sobald die LLM‑Phasen in einem Folge‑PR ausgeliefert werden:

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

Jeden Morgen liest du, wovon dein Gedächtnissystem geträumt hat. Die Verbindungen, die es bemerkt hat. Das Rauschen, das es bereinigt hat. Die Widersprüche, die es aufgelöst hat. Es ist ein Änderungsprotokoll für dein Wissen, geschrieben in Prosa. MuninnDB ist das kognitive Gedächtnis‑Backend für [Hrafn](https://github.com/5queezer/hrafn), eine leichte, modulare KI‑Agent‑Runtime.
## Probieren Sie es aus

Das schreibgeschützte Fundament (Phase 0 + konfigurierbare Deduplizierung + Dry‑Run‑CLI) wurde in [PR #306](https://github.com/scrypster/muninndb/pull/306) bereitgestellt und ist gemergt. Schreibphasen (bidirektionale Stabilität, LLM‑Konsolidierung, Journal) folgen in einem separaten PR. Die vollständige Designspezifikation befindet sich im Repository unter `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni baut KI‑Agenten‑Infrastruktur. [Hrafn](https://github.com/5queezer/hrafn) ist die Runtime. [MuninnDB](https://github.com/scrypster/muninndb) ist das Gedächtnis.*