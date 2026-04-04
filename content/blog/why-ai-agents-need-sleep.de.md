---
title: "Warum KI-Agenten Schlaf brauchen"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
description: "KI-Agenten speichern Erinnerungen, konsolidieren sie aber nie. So nutzt MuninnDB's Dream Engine Erkenntnisse aus der Neurowissenschaft, um das zu beheben."
images: ["/images/dream-engine.png"]
translationHash: "aff3bf970bc1e9e4c4fb6cd6ef0dd437"
---
Ich trage zu einer kognitiven Datenbank für KI-Agenten namens [MuninnDB](https://github.com/scrypster/muninndb) bei. Sie speichert alles: Sitzungsnotizen, Projektkontext, Arbeitsbeobachtungen, rechtliche Dokumentation. Nach ein paar Wochen täglicher Nutzung häufen sich die Einträge. Das Wiederfinden funktioniert noch -- semantische Suche ist stark beim Retrieval. Aber der Speicher selbst verfiel. Fast doppelte Einträge von Sitzungen, die denselben Inhalt behandelten. Veraltete Fakten, die von neueren abgelöst wurden. Kein System, um „kritische rechtliche Hinweise“ von „beiläufigen Bemerkungen über Docker-Netzwerke“ zu unterscheiden.

Das Problem ist nicht die Erfassung. Jedes Speichersystem beherrscht die Erfassung. Das Problem ist, was zwischen den Sitzungen passiert -- und das ist meistens nichts.

**KI-Agenten häufen Erinnerungen so an, wie Menschen mit Hoarding-Verhalten Zeitungen sammeln. Die Lösung ist nicht eine bessere Suche. Es ist Schlaf.**

## Was Schlaf tatsächlich bewirkt

Die Konsolidierung menschlicher Erinnerungen im Schlaf ist kein Backup. Es ist ein aktiver, destruktiver Prozess. Der Hippocampus spielt kürzliche Erfahrungen ab, der Neokortex integriert sie in bestehende Wissensstrukturen und das Gehirn schwächt aktiv Erinnerungen ab, die nicht verstärkt wurden. Man wacht mit weniger Erinnerungen auf, als man eingeschlafen ist, und genau das ist der Punkt.

Drei Eigenschaften sind für das Design von KI-Systemen entscheidend. Erstens ist Konsolidierung selektiv -- wichtige Erinnerungen werden gestärkt, Rauschen geschwächt. Zweitens entdeckt sie Verbindungen -- das Gehirn verknüpft Konzepte über Domänen hinweg während des REM-Schlafs. Drittens löst sie Konflikte -- widersprüchliche Erinnerungen werden abgewogen, wobei neuere oder stärker verstärkte Versionen gewinnen.

Kein gängiges KI-Speichersystem macht auch nur eines davon. Die meisten betreiben bestenfalls Deduplizierung.

## Bisherige Arbeiten

Die Idee ist nicht neu. Forscher nähern sich ihr bereits aus verschiedenen Richtungen.

Zhong et al. stellten [MemoryBank](https://arxiv.org/abs/2305.10250) (2023) vor, ein LLM-Speichersystem mit Ebbinghaus-Vergessenskurven -- Erinnerungen verblassen mit der Zeit, es sei denn, sie werden verstärkt. Das bestehende ACT-R-Modell von MuninnDB baut auf diesem Fundament auf.

Das Paper „Language Models Need Sleep“ auf [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) schlug einen expliziten „Dreaming“-Prozess vor, um fragile Kurzzeitgedanken in stabiles Langzeitwissen zu überführen -- die theoretischste Annäherung an das, was wir bauen.

Xies [SleepGate](https://arxiv.org/abs/2603.14517)-Framework (2026) fügte konfliktbewusstes zeitliches Tagging und ein Vergessens-Gate hinzu, wodurch proaktive Interferenzen von O(n) auf O(log n) reduziert werden. Die zentrale Erkenntnis: Man muss wissen, *wann* etwas gelernt wurde, um Widersprüche aufzulösen, nicht nur, *was* gelernt wurde.

Und Anthropic testet [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) für Claude Code -- einen Hintergrundprozess, der Speicherdateien zwischen Sitzungen konsolidiert. Es arbeitet auf reinen Textdateien. Angemessen für einen Programmierassistenten. Nicht ausreichend für eine kognitive Datenbank.

## Die Lücke

Die Erfassungsseite hatte MuninnDB bereits abgedeckt: Vector-Embeddings, Ebbinghaus-Verfall, Hebbsches Assoziationslernen und ein Hintergrund-Worker für die Konsolidierung, der alle 6 Stunden algorithmische Deduplizierung durchführt. Was es nicht konnte: schlussfolgern, *warum* zwei Einträge ähnlich sind, Widersprüche auflösen oder domänenübergreifende Verbindungen entdecken. Es hatte ein Gedächtnis. Es hatte keinen Schlaf.

## Die Dream Engine

Die Dream Engine erweitert die bestehende Konsolidierungspipeline um LLM-Intelligenz. Sie läuft zwischen Sitzungen -- automatisch beim Serverstart ausgelöst (die Metapher des „Aufwachens“) oder manuell über die CLI.

### Trigger-Gates

Zwei Bedingungen müssen erfüllt sein, bevor ein Dream abläuft: mindestens 12 Stunden seit dem letzten Dream und mindestens 3 seitdem neu geschriebene Einträge. Dies verhindert unnötige Verarbeitungslasten bei einem inaktiven Speicher. Die Gates können mit `--force` für manuelle Ausführungen umgangen werden.

### Die Pipeline

Die Dream Engine verwendet vier bestehende Konsolidierungsphasen wieder, fügt drei neue hinzu und modifiziert eine. Phase 0 und der konfigurierbare Dedup-Schwellenwert wurden in [PR #306](https://github.com/scrypster/muninndb/pull/306) ausgeliefert. Die LLM-Phasen (2b, 4, 6) sind entworfen und spezifiziert für einen nachfolgenden PR.

**Phase 0 (neu, ausgeliefert): Orientierung.** Read-only-Scan jedes Vaults. Zählt Einträge, prüft Embedding-Abdeckung, berechnet durchschnittliche Relevanz- und Stabilitätswerte, erkennt rechtliche Vaults. Damit wird die Karte gebaut, bevor etwas angefasst wird.

**Phase 1 (bestehend): Replay.** Aktivierungs-Replay für die Aktualisierung von Hebbschen Assoziationsgewichten. Unverändert.

**Phase 2 (bestehend, modifiziert, ausgeliefert): Deduplizierung.** Die algorithmische Dedup-Phase, jedoch mit einem geteilten Schwellenwert. Im normalen Konsolidierungsmodus werden Einträge mit einer Cosinus-Ähnlichkeit >= 0,95 wie bisher automatisch zusammengeführt. Im Dream-Modus sinkt der Schwellenwert auf 0,85. Einträge im Bereich 0,85–0,95 werden *nicht* automatisch zusammengeführt -- sie werden als Nahezu-Duplikat-Cluster markiert und zur Überprüfung durch das LLM an die nächste Phase weitergeleitet. Dies ist die zentrale Architekturentscheidung: Der Algorithmus kümmert sich um die offensichtlichen Fälle, das LLM um die mehrdeutigen.

**Phase 2b (neu, Folge-PR): LLM-Konsolidierung.** Die Nahezu-Duplikat-Cluster und etwaige erkannte Widersprüche werden an ein konfiguriertes LLM gesendet. Das LLM gibt strukturiertes JSON zurück: Zusammenführungsvorgänge, Widerspruchslösungen, Vorschläge für Cross-Vault-Verbindungen, Stabilitätsempfehlungen und einen narrativen Journal-Eintrag. Das LLM verknüpft nichts automatisch über Vaults hinweg -- es schlägt nur vor. Ein Mensch prüft die Vorschläge im Dream Journal.

**Phase 3 (bestehend): Schema-Promotion.** Unverändert.

**Phase 4 (neu, Folge-PR): Bidirektionale Stabilität.** Hier findet das Vergessen statt. Hochsignal-Einträge (häufig abgerufen, kürzlich durch hebbsche Koaktivierung verstärkt oder vom LLM empfohlen) erhalten einen Stabilitätsboost von 1,2x. Niedersignal-Einträge (selten abgerufen, alt, geringe Relevanz, nicht vom LLM befördert) werden auf 0,8x abgeschwächt, mit einer Untergrenze von 14 Tagen -- sie fallen nie unter die Standardstabilität. LLM-Empfehlungen setzen die regelbasierten Anpassungen außer Kraft. Dies modelliert den Spacing-Effekt: Einträge, die abgerufen werden, bleiben stark, andere verblassen allmählich.

**Phase 5 (bestehend): Transitive Inferenz.** Unverändert.

**Phase 6 (neu, Folge-PR): Dream Journal.** Die LLM-Narration plus der Konsolidierungsbericht werden zu einem menschlich lesbaren Eintrag formatiert und an `~/.muninn/dream.journal.md` angehängt. Dies ist die Ausgabe, die Sie tatsächlich lesen. Sie zeigt, welche Verbindungen entdeckt wurden, was gestärkt, was aufgeräumt und was übersprungen wurde.

### Vault-Vertrauensstufen

Nicht alle Vaults sind gleich und nicht alle LLM-Anbieter sind gleich. MuninnDB erzwingt Vertrauensstufen pro Vault:

Rechtliche Vaults überspringen Phase 2b vollständig -- sie werden niemals an ein LLM gesendet, nicht einmal an ein lokales. Rechtliche Einträge werden wortgetreu bewahrt und nie von der Konsolidierung angefasst.

Work- und persönliche Vaults sind auf lokales Ollama oder die API von Anthropic beschränkt. Sie werden niemals an OpenAI oder andere Anbieter gesendet.

Globale und Projekt-Vaults können jeden konfigurierten Anbieter nutzen.

Dies ist konfigurierbar, nicht hardcodiert. Die Auflösungsreihenfolge prüft zuerst Ollama (lokal, keine Daten verlassen die Maschine), dann Anthropic, dann OpenAI, wo es die Vault-Richtlinie erlaubt.

### Laufzeitmodell

Die Schlaf-/Wach-Metaphorik bildet direkt den Server-Lebenszyklus ab. Wenn MuninnDB stoppt (`muninn stop`), schreibt es eine `dream.due`-Sidecar-Datei im Datenverzeichnis. Beim erneuten Start (`muninn start`) prüft es die Datei und die Trigger-Gates. Sind beide erfüllt, läuft ein Dream, bevor Ports geöffnet werden. Überschreitet der Dream ein konfigurierbares Timeout (Standard 60 Sekunden), bricht er ab und startet normal. Der Server blockiert nie unbegrenzt wegen eines Dreams.

Für die manuelle Nutzung: `muninn dream --dry-run` zeigt, was passieren würde, ohne etwas zu schreiben. Der Dry-Run generiert trotzdem die vollständige Journal-Narration und gibt sie mit einem `[DRY RUN]`-Header auf stdout aus. Das ist entscheidend für Vertrauen -- man kann genau sehen, was die Engine tun würde, bevor man sie schreiben lässt.

## Was ich ausgelassen habe

**Automatisches Verknüpfen von Cross-Vault-Vorschlägen.** Die Dream Engine schlägt Verbindungen vor, erstellt sie aber nie automatisch. Ein Mensch liest das Journal und entscheidet. Vertrauen vor Automatisierung.

**Speicherfreigabe für mehrere Agenten.** MuninnDB ist ein Benutzer, eine Instanz. Geteilter Speicher über Agenten hinweg ist ein völlig anderes Threat-Model.

**Zeitliche Warnungen.** Das LLM könnte bemerken: „Dieser API-Schlüssel läuft in 4 Tagen ab“, aber das Verfolgen von Ablaufdaten ist ein Feature, keine Konsolidierung. Für v1 nicht vorgesehen.

**Emotionsmodellierung.** Das Salience-Scoring ist nur ein Proxy. Echte emotionale Gewichtung braucht Signale, die ein textbasiertes System nicht hat. Zurückgestellt.

## Das Dream Journal

Hier ist, was ein Dream-Run produzieren wird, sobald die LLM-Phasen in einem Folge-PR ausgeliefert werden:

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

Jeden Morgen lesen Sie, wovon Ihr Speichersystem geträumt hat. Welche Verbindungen es erkannt hat. Welches Rauschen es bereinigt hat. Welche Widersprüche es aufgelöst hat. Es ist ein Changelog für Ihr Wissen, in Prosa geschrieben. MuninnDB ist das kognitive Speicher-Backend für [Hrafn](https://github.com/5queezer/hrafn), eine leichte, modulare KI-Agenten-Laufzeitumgebung.

## Ausprobieren

Das Read-only-Fundament (Phase 0 + konfigurierbare Dedup + Dry-Run-CLI) wurde in [PR #306](https://github.com/scrypster/muninndb/pull/306) ausgeliefert und ist gemerged. Schreibphasen (bidirektionale Stabilität, LLM-Konsolidierung, Journal) folgen in einem separaten PR. Die vollständige Design-Spezifikation liegt im Repo unter `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni entwickelt KI-Agenten-Infrastruktur. Hrafn ist unter [github.com/5queezer/hrafn](https://github.com/5queezer/hrafn) zu finden. MuninnDB ist unter [github.com/scrypster/muninndb](https://github.com/scrypster/muninndb) verfügbar.*