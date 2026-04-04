---
title: "Warum KI-Agenten Schlaf brauchen"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
description: "KI‑Agentenerfassen Erinnerungen, aber sie konsolidieren sie nie. Hier ist, wie MuninnDB's Dream Engine Inspiration aus der Neurowissenschaft nutzt, um das zu beheben."
images: ["/images/dream-engine.png"]
translationHash: "f2542bbbb3a50216f597e1b14f4de464"
---
Ich arbeite an einer kognitiven Datenbank für KI-Agenten namens [MuninnDB](https://github.com/scrypster/muninndb). Sie speichert alles: Sitzungsnotizen, Projektkontexte, Arbeitsbeobachtungen, rechtliche Dokumentation. Nach einigen Wochen täglicher Nutzung häufen sich die Einträge. Das Wiederfinden funktioniert noch – die semantische Suche ist beim Abruf zuverlässig. Aber der Speicher selbst verfiel. Nahezu duplizierte Einträge aus Sitzungen, die dieselben Themen abdeckten. Veraltete Fakten, die von neueren überholt wurden. Kein System, um „kritische rechtliche Hinweise“ von „beiläufigen Bemerkungen über Docker-Netzwerke“ zu unterscheiden.

Das Problem liegt nicht an der Erfassung. Jedes Speichersystem beherrscht die Erfassung. Das Problem ist das, was zwischen den Sitzungen passiert – und das ist in der Regel nichts.

**KI-Agenten häufen Erinnerungen an, wie Hoarder Zeitungen horten. Die Lösung ist keine bessere Suche. Sie ist Schlaf.**

## Was Schlaf wirklich bewirkt

Die menschliche Gedächtniskonsolidierung während des Schlafs ist kein Backup. Es ist ein aktiver, destruktiver Prozess. Der Hippocampus spielt kürzliche Erfahrungen erneut ab, der Neokortex integriert sie in bestehende Wissensstrukturen, und das Gehirn schwächt aktiv Erinnerungen, die nicht verstärkt wurden. Man wacht mit weniger Erinnerungen auf, als man eingeschlafen ist, und genau das ist der Sinn dahinter.

Drei Eigenschaften sind für das Design von KI-Systemen entscheidend. Erstens ist die Konsolidierung selektiv – wichtige Erinnerungen werden gestärkt, Rauschen wird abgeschwächt. Zweitens erkennt sie Zusammenhänge – das Gehirn verknüpft Konzepte domänenübergreifend während des REM-Schlafs. Drittens löst sie Konflikte – widersprüchliche Erinnerungen werden abgewogen, wobei neuere oder stärker verstärkte Versionen gewinnen.

Kein gängiges KI-Speichersystem macht etwas davon. Die meisten führen bestenfalls eine Deduplizierung durch.

## Bisherige Ansätze

Die Idee ist nicht neu. Forscher nähern sich ihr bereits aus verschiedenen Richtungen.

Zhong et al. stellten [MemoryBank](https://arxiv.org/abs/2305.10250) (2023) vor, ein LLM-Speichersystem mit Ebbinghaus-Vergessenskurven – Erinnerungen verblassen im Laufe der Zeit, sofern sie nicht verstärkt werden. Das bestehende ACT-R-Modell von MuninnDB baut auf diesem Fundament auf.

Das Paper „Language Models Need Sleep“ auf [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) schlug einen expliziten „Dreaming“-Prozess vor, um fragile Kurzzeitgedächtnisse in stabiles Langzeitwissen zu überführen – die theoretische Ausarbeitung, die dem, was wir entwickeln, am nächsten kommt.

Xies [SleepGate](https://arxiv.org/abs/2603.14517)-Framework (2026) fügte konfliktbewusste zeitliche Tagging und ein Vergessens-Gate hinzu, wodurch die proaktive Interferenz von O(n) auf O(log n) reduziert wurde. Die entscheidende Erkenntnis: Man muss wissen, *wann* etwas gelernt wurde, um Widersprüche aufzulösen, nicht nur, *was* gelernt wurde.

Und Anthropic testet bereits [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) für Claude Code – einen Hintergrundprozess, der Gedächtnisdateien zwischen den Sitzungen konsolidiert. Er funktioniert mit einfachen Textdateien. Für einen Coding-Assistenten vernünftig. Nicht ausreichend für eine kognitive Datenbank.

## Die Lücke

MuninnDB hatte die Erfassungsseite bereits abgedeckt: Vektor-Embeddings, Ebbinghaus-Abbau, Hebb'sches Assoziationslernen und ein Hintergrund-Worker für die Konsolidierung, der alle 6 Stunden eine algorithmische Deduplizierung durchführt. Was es nicht konnte: begründen, *warum* zwei Einträge ähnlich sind, Widersprüche auflösen oder domänenübergreifende Verbindungen entdecken. Es hatte ein Gedächtnis. Es hatte keinen Schlaf.

## Die Dream Engine

Die Dream Engine erweitert die bestehende Konsolidierungs-Pipeline um LLM-Intelligenz. Sie läuft zwischen den Sitzungen – automatisch beim Serverstart getriggert (die Metapher des „Aufwachens“) oder manuell über die CLI.

### Trigger-Gates

Zwei Bedingungen müssen beide erfüllt sein, bevor ein Dream abläuft: seit dem letzten Dream müssen mindestens 12 Stunden vergangen sein, und es müssen mindestens 3 neue Einträge seit dem letzten Dream geschrieben worden sein. Dies verhindert unnötige Last bei inaktivem Speicher. Die Gates können mit `--force` für manuelle Durchläufe umgangen werden.

### Die Pipeline

Die Dream Engine nutzt vier bestehende Konsolidierungsphasen wieder, fügt drei neue hinzu und modifiziert eine. Phase 0 und der konfigurierbare Dedup-Schwellenwert wurden mit [PR #306](https://github.com/scrypster/muninndb/pull/306) ausgeliefert. Die LLM-Phasen (2b, 4, 6) sind designt und spezifiziert für einen nachfolgenden PR.

**Phase 0 (neu, ausgeliefert): Orientierung.** Nur-Lese-Scan jedes Vaults. Einträge zählen, Embedding-Abdeckung prüfen, durchschnittliche Relevanz- und Stabilitätswerte berechnen, rechtliche Vaults erkennen. Dies erstellt die Karte, bevor etwas angefasst wird.

**Phase 1 (bestehend): Replay.** Aktivierungs-Replay für Hebb'sche Assoziations-Gewichtsaktualisierungen. Unverändert.

**Phase 2 (bestehend, modifiziert, ausgeliefert): Dedup.** Die algorithmische Dedup-Phase, aber mit einem aufgeteilten Schwellenwert. Im normalen Konsolidierungsmodus werden Einträge mit einer Kosinus-Ähnlichkeit >= 0.95 wie bisher automatisch zusammengeführt. Im Dream-Modus sinkt der Schwellenwert auf 0.85. Einträge im Bereich 0.85–0.95 werden *nicht* automatisch zusammengeführt – sie werden als Near-Duplicate-Cluster gekennzeichnet und für die LLM-Prüfung an die nächste Phase übergeben. Das ist die zentrale architektonische Entscheidung: Den Algorithmus die offensichtlichen Fälle erledigen lassen, das LLM die mehrdeutigen.

**Phase 2b (neu, folgender PR): LLM-Konsolidierung.** Die Near-Duplicate-Cluster und alle erkannten Widersprüche werden an ein konfiguriertes LLM gesendet. Das LLM gibt strukturiertes JSON zurück: Zusammenführungsoperationen, Widerspruchslösungen, Vorschläge für vaultübergreifende Verbindungen, Stabilitätsempfehlungen und einen narrativen Journal-Eintrag. Das LLM verknüpft nichts automatisch über Vaults hinweg – es schlägt nur vor. Eine Person prüft die Vorschläge im Dream-Journal.

**Phase 3 (bestehend): Schema Promotion.** Unverändert.

**Phase 4 (neu, folgender PR): Bidirektionale Stabilität.** Hier findet das Vergessen statt. High-Signal-Einträge (häufig abgerufen, kürzlich durch Hebb'sche Koaktivierung verstärkt oder vom LLM empfohlen) erhalten einen Stabilitätsbonus von 1.2x. Low-Signal-Einträge (selten abgerufen, alt, geringe Relevanz, nicht vom LLM hervorgehoben) werden auf das 0.8-fache geschwächt, mit einer Untergrenze von 14 Tagen – sie fallen nie unter die Standardstabilität. LLM-Empfehlungen überschreiben die regelbasierten Anpassungen. Dies modelliert den Spacing-Effekt: Einträge, die abgerufen werden, bleiben stark; Einträge, die es nicht werden, verblassen allmählich.

**Phase 5 (bestehend): Transitive Inferenz.** Unverändert.

**Phase 6 (neu, folgender PR): Dream Journal.** Die LLM-Narration plus der Konsolidierungsbericht werden in einen menschenlesbaren Eintrag formatiert und an `~/.muninn/dream.journal.md` angehängt. Das ist die Ausgabe, die Sie tatsächlich lesen. Sie verrät Ihnen, welche Verbindungen entdeckt wurden, was gestärkt, was aufgeräumt und was übersprungen wurde.

### Vault-Vertrauensebenen

Nicht alle Vaults sind gleich und nicht alle LLM-Anbieter sind gleich. MuninnDB erzwingt Vertrauensebenen pro Vault:

Rechtliche Vaults überspringen Phase 2b vollständig – sie werden niemals an ein LLM gesendet, nicht einmal an ein lokales. Rechtliche Einträge werden wortgetreu bewahrt und niemals von der Konsolidierung berührt.

Arbeits- und persönliche Vaults sind auf lokales Ollama oder die API von Anthropic beschränkt. Sie werden niemals an OpenAI oder andere Anbieter gesendet.

Globale und Projekt-Vaults können jeden konfigurierten Anbieter nutzen.

Dies ist konfigurierbar, nicht hardcoded. Die Auflösungsreihenfolge prüft zuerst Ollama (lokal, keine Daten verlassen die Maschine), dann Anthropic, dann OpenAI, sofern die Vault-Richtlinie dies erlaubt.

### Laufzeitmodell

Die Schlaf-/Wach-Metapher bildet direkt den Server-Lebenszyklus ab. Wenn MuninnDB stoppt (`muninn stop`), schreibt es eine `dream.due`-Sidecar-Datei im Datenverzeichnis. Bei einem erneuten Start (`muninn start`) prüft es die Datei und die Trigger-Gates. Wenn beide durchlaufen, führt es einen Dream aus, bevor es Ports öffnet. Überschreitet der Dream ein konfigurierbares Timeout (Standard: 60 Sekunden), bricht es ab und startet normal. Der Server blockiert niemals unbegrenzt auf einen Dream.

Für die manuelle Nutzung: `muninn dream --dry-run` zeigt an, was passieren würde, ohne etwas zu schreiben. Der Dry-Run generiert dennoch die vollständige Journal-Narration und gibt sie mit einem `[DRY RUN]`-Header auf stdout aus. Das ist entscheidend für das Vertrauen – Sie sehen exakt, was die Engine tun würde, bevor Sie sie schreiben lassen.

## Was ich ausgelassen habe

**Automatisches Verknüpfen von vaultübergreifenden Vorschlägen.** Die Dream Engine schlägt Verbindungen vor, erstellt sie aber niemals automatisch. Eine Person liest das Journal und entscheidet. Vertrauen vor Automatisierung.

**Speicher-Sharing zwischen mehreren Agenten.** MuninnDB ist ein Benutzer, eine Instanz. Geteilter Speicher über Agenten hinweg ist ein völlig anderes Bedrohungsmodell.

**Zeitliche Warnungen.** Das LLM könnte bemerken „dieser API-Schlüssel läuft in 4 Tagen ab“, aber das Verfolgen von Ablaufdaten ist ein Feature, keine Konsolidierung. Nicht im Umfang von v1.

**Emotionsmodellierung.** Salience-Scoring ist ein Proxy. Echte emotionale Gewichtung benötigt Signale, die ein textbasiertes System nicht besitzt. Zurückgestellt.

## Das Dream Journal

So wird ein Dream-Durchlauf aussehen, sobald die LLM-Phasen in einem folgenden PR ausgeliefert werden:

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

Jeden Morgen lesen Sie, wovon Ihr Speichersystem geträumt hat. Die Verbindungen, die es bemerkt hat. Das Rauschen, das es aufgeräumt hat. Die Widersprüche, die es gelöst hat. Es ist ein Changelog für Ihr Wissen, geschrieben in Prosa. MuninnDB ist das kognitive Speicher-Backend für [Hrafn](https://github.com/5queezer/hrafn), eine leichte, modulare AI-Agenten-Runtime.

## Ausprobieren

Das Nur-Lese-Fundament (Phase 0 + konfigurierbare Dedup + Dry-Run-CLI) wurde mit [PR #306](https://github.com/scrypster/muninndb/pull/306) ausgeliefert und ist gemergt. Die Schreibphasen (bidirektionale Stabilität, LLM-Konsolidierung, Journal) folgen in einem separaten PR. Die vollständige Design-Spezifikation befindet sich im Repository unter `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni entwickelt KI-Agenten-Infrastruktur. Hrafn ist unter [github.com/5queezer/hrafn](https://github.com/5queezer/hrafn) zu finden. MuninnDB ist unter [github.com/scrypster/muninndb](https://github.com/scrypster/muninndb) verfügbar.*