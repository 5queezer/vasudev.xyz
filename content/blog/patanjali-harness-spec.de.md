---
title: "Patanjali hattedie Filter-Spezifikation. Wir haben gerade die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Gedächtniskonsolidierung verschlechterte den Abruf. Drei Designprinzipien aus Agentengedächtnis-Benchmarks und ihre unerwarteten Parallelen in der yogischen Aufmerksamkeitstheorie."
translationHash: "5c7987fe00cfece6bc91f6a6a33bba2d"
---
Das Konsolidierungssystem von [MuninnDB](https://github.com/scrypster/muninndb) hat drei duplizierte Engramme mit Farbvarianten genau wie vorgesehen zusammengeführt (Kosinus-Ähnlichkeit >= 0,95). Die Abrufqualität verschlechterte sich. In einem 13-Engramm-Vault verschob das Entfernen der Duplikate den Normalisierungsanker und drückte relevante Ergebnisse in der Rangliste nach unten. Die Lösung war eine Guard-Clause: `MinDedupVaultSize` (Standard: 20), die die Deduplizierung in Phase 2 bei kleinen Vaults überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Problem.

Das Versagen war kein Fehler im Dedup-Algorithmus. Es war ein Versagen der *Unterscheidungsfähigkeit*: Eine valide Konsolidierungsoperation, angewendet in einem Kontext, in dem sie Schaden anrichtete. Wann konsolidieren, wann in Ruhe lassen, was zählt als Rauschen im Vergleich zum Signal. Dieses Problem hat außerhalb der Informatik eine lange Geschichte. Ich fand drei spezifische Designprinzipien in den [Yoga-Sutren](https://de.wikipedia.org/wiki/Yoga_Sutra), die sich auf empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) abbilden lassen.

**Die kontemplativen Traditionen haben ausgeklügelte Modelle der Aufmerksamkeitsfilterung entwickelt. Einige dieser Modelle generieren testbare Hypothesen, die die aktuelle Literatur zum Agentenspeichermanagement nicht liefert.**

## 1. Nicht jedes Rauschen ist gleich (Vrtti Nirodha)

Vor dem Dedup-Fehler stieß [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) auf ein grundlegenderes Problem. MuninnDBs ACT-R-Bewertung ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) setzte frische Engramme auf raw=1.0 fest, wodurch alle Abrufwerte identisch bei 0,9000 lagen. Das System konnte Signal nicht von Rauschen unterscheiden. Jeder Eintrag wirkte gleich relevant. Nach der Korrektur ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Wertebereich auf 0,18–0,90 und die korrekte Top-1-Abrufquote stieg auf 5 von 5 Anfragen. Eine uniforme Behandlung der Einträge hatte die Abrufqualität zerstört.

Meta-Harness bestätigte dasselbe Muster in einem anderen Maßstab. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) verglich drei Stufen des Informationszugriffs für den Harness-Optimizer:

| Bedingung | Median-Genauigkeit | Beste Genauigkeit |
|---|---|---|
| Nur Scores | 34,6% | 41,3% |
| Scores + LLM-Zusammenfassung | 34,9% | 38,7% |
| Vollständige Roh-Traces | 50,0% | 56,7% |

Von LLMs generierte Zusammenfassungen schnitten *schlechter* ab als reine Rohwerte (beste Genauigkeit 38,7 % vs. 41,3 %). Vollständige Roh-Traces erreichten 56,7 %. Die Zusammenfassungen komprimierten diagnostisches Signal gemeinsam mit Rauschen und zerstörten damit die Informationen, die der Optimierer benötigte. Bei der Textklassifizierung erzielte Meta-Harness 48,6 % gegenüber ACEs 40,9 % bei gleichzeitig 4-fach weniger Context-Tokens. Der entscheidende Vorteil war nicht mehr Information. Es war eine bessere *Auswahl* von Information.

Das Designprinzip: Eine unterschiedslose Behandlung von Einträgen zerstört die Abrufqualität, egal ob es sich um einheitliche Bewertung, verlustbehaftete Zusammenfassung oder undifferenzierte Deduplizierung handelt.

Yoga-Sutra 1.2 definiert Yoga als *chitta vrtti nirodha*, die Beruhigung der Schwankungen im Geistfeld. Patanjali sagt nicht „Lösche alles.“ Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Todesangst) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage). Die Praxis ist chirurgisch: Verzerrungen reduzieren, Signal bewahren. Der Bug der Score-Sättigung war das Versagen des Systems, diese Unterscheidung zu treffen. Jede Vrtti sah gleich aus.

Die Design-Implikation für MuninnDB: Verfallsuntergrenzen sollten Ergebnisse widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Versuch könnten identische Abrufquoten haben, aber einen radikal anderen Langzeitwert. Man könnte versuchen, Einträge im Voraus als Pramana oder Klesha (verifiziert vs. verzerrt) zu klassifizieren, aber diese Klassifizierung ist selbst das eigentliche Problem. Für die meisten Einträge erfordert sie semantisches Urteilsvermögen, was ein LLM im Decay-Pfad bedeuten würde, was die Konsolidierung teuer und nichtdeterministisch macht.

Der einfachere Weg: **ergebnis-markierte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die darauf folgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Schlägt die Aktion fehl, `outcome: failure`. Die Verfallsuntergrenze koppelt sich an die Erfolgsquote, nicht an eine epistemische Kategorie. Dies ist im Wesentlichen Banditen-Feedback beim Abruf, ein in der Informationswiedergewinnung wohlbekanntes Konzept, hier angewendet auf persistenten Agentenspeicher. Keine Ontologie nötig. Kein LLM in der Schleife. Man muss die Vrtti im Voraus nicht klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Speicherung formen.

---

## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei hochmoderne Speichersysteme (A-Mem, Mem0, MemoryOS) gegen naive RAG-Baselines, die einfach aus dem Rohkontext abrufen. Keines der fortschrittlichen Systeme schlug die Baselines konsistent. Der spezifische Fehlermodus: Diese Systeme konnten prozedurales Gedächtnis (Feedback-Logs, die den Systemleistungsverlauf anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen gesagt hätten, welche Erinnerungen tatsächlich nützlich waren.

MuninnDBs Benchmark #311 lieferte eine lokale Version desselben Problems. Die Deduplizierung in Phase 2 identifizierte und führte drei Duplikate mit Farbvarianten korrekt zusammen (Kosinus >= 0,95). Aber im 13-Engramm-Vault veränderte das Entfernen dieser Einträge den Normalisierungsanker. Ein nicht verknüpftes Engram wurde zum Referenzpunkt und drückte relevante Ergebnisse in der Rangliste nach unten. Eine valide Konsolidierungsoperation, uniform angewendet, verdrängte die richtige Antwort.

Böckelers [Harness-Engineering-Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Diskrepanz. Sie unterscheidet rechnerische Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferentiellen Sensoren (semantisch, teuer, probabilistisch). Dedup bei Kosinus >= 0,95 ist ein rechnerischer Prozess. Das Erkennen, wann Dedup den Abruf schädigt, erfordert ein inferentielles Urteil: „Diese Einträge sind ähnlich, aber ist ihr Entfernen in diesem Vault *sicher*?“ Kein Ähnlichkeitsschwellenwert kann das beantworten.

Die [Yoga-Sutren](https://de.wikipedia.org/wiki/Yoga_Sutra) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Furche. MuninnDB setzt dies direkt um: Einträge, die gemeinsam aktiviert werden, verstärken ihre Assoziationsgewichte. Die Sutren warnen, dass sich Samskaras potenzieren. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht-Anhaften, die Fähigkeit, starke Assoziationen loszulassen), verhärten sie zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und beginnt, das Skript abzuspulen.

Der fehlende Mechanismus ist eine explizite Hebbian'sche *Abschwächung*: nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen False-Positive-Abruf produziert. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse erzwangen bereits eine Korrektur (die `MinDedupVaultSize`-Guard). Die nächste Messung erfordert den synthetischen Vault-Generator mit gekennzeichneten Engramm-Klassen: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped und Legal-adjacent. Die präzisere Metrik ist die *Verdrängungsrate*: Wie oft drängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsches Ding abgerufen“, sondern „richtiges Ding durch habitualisierten Abruf verdrängt“. Wenn verstärkte Einträge messbare Verdrängung erzeugen, ist Vairagya als Design-Primitiv empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir überspringen die Komplexität.

---

## 3. Die Kraft der gezielten Ausgrenzung (Pratyahara)

Das überraschendste Ergebnis von Meta-Harness: Die Gewinner-Harnesses sind nicht diejenigen, die das Context-Fenster mit allem verfügbaren Material vollstopfen. Der Sieger bei der Textklassifizierung nutzt TF-IDF mit kontrastiven Paaren und Label-Priming (48,6 % Genauigkeit, 4-mal weniger Tokens als der Zweitplatzierte). Der Sieger im Mathematik-Abruf ist ein BM25-Programm mit vier Routen und lexikalischen Prädikaten. Einfache Auswahlrichtlinien. Keine exotischen Architekturen. Das Ändern des Harnesses um ein festes LLM herum erzeugt beim selben Benchmark eine 6-fache Leistungsdifferenz.

Böckeler fasst es als „Qualität nach links halten“ zusammen: Je früher man filtert, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre rechnerischen Leitplanken (Linter, Schemata, CLAUDE.md-Regeln) verhindern, dass ganze Informationskategorien überhaupt das Modell erreichen. Die `MinDedupVaultSize`-Guard aus PR #359 ist dasselbe Prinzip, angewendet auf die Konsolidierung: Anstatt auf jedem Vault eine Deduplizierung durchzuführen und zu hoffen, dass das Modell die degradierten Ergebnisse handhabt, lernte das System, die Deduplizierung in kleinen Vaults *nicht anzuwenden*. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Posts argumentierte, dass das Memory-Trait-Interface Ablehnungs-Metadaten neben den Ergebnissen zurückgeben sollte. „Diese 3 Einträge passten, und diese 5 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip des [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga-Sutra 2.54) erklärt, warum. Pratyahara wird oft als „Sinneszurückziehung“ übersetzt, aber das ist irreführend. Es ist keine Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiterhin. Sie hören nur auf, den Geist zu jedem Reiz zu ziehen. Du entscheidest, was ins Bewusstsein tritt, anstatt auf alles zu reagieren, was eintrifft.

Wenn man dem LLM sagt: „Hier sind 5 Dinge, die ich dir bewusst vorenthalte“, hat man ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist keine Sinneszurückziehung. Das ist Sinnesstimulation mit Warnschild. Jeder, der meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten“ garantiert, dass du an den weißen Elefanten denkst. Konkret: Ablehnungserklärungen verbrauchen Tokens (was dem Meta-Harness-Ergebnis widerspricht, dass einfache Harnesses gewinnen) und verleiten das Modell, den Filter infrage zu stellen („Warum wurde X ausgeschlossen? Vielleicht brauche es doch“). Nicht-essentieller Kontext verschlechtert die Modellleistung, selbst wenn er technisch korrekt ist, und Ausschluss-Metadaten sind per Definition für die aktuelle Aufgabe nicht essentiell.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Das Benchmark-Harness sieht alles.** Das Memory-Trait-Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abruf-Implementierung protokolliert die vollständige Entscheidung intern: Was wurde zurückgegeben, was wurde ausgeschlossen, warum und was tat der Agent als Nächstes. Das Benchmark verzehrt die Logs. Der Agent verzehrt die Einträge.

A trace entry looks like this:

```json
{
  "query": "OAuth token refresh pattern for MCP server",
  "retrieved": ["entry_041", "entry_187", "entry_203"],
  "excluded": [
    {"id": "entry_089", "reason": "hebbian_weight_below_threshold", "score": 0.42},
    {"id": "entry_312", "reason": "ebbinghaus_decayed", "score": 0.31}
  ],
  "agent_action": "implemented_refresh_flow",
  "outcome": "success"
}
```

Der Agent sieht `excluded` nie. Das Benchmark-Harness sieht alles. Wenn `entry_089` die richtige Antwort war und herausgefiltert wurde, weil sein Hebbian'sches Gewicht niedrig war, zeigt sich das im Trace, und die nächste Iteration der Abruf-Richtlinie kann sich anpassen.

In Böckelers Taxonomie: Das Memory Trait ist eine rechnerische Leitplanke (es bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein rechnerischer Sensor (es beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *dem gefilterten System ist die Ausgrenzung bewusst*. Es ist bewusstes Filtern im Sinne von *dem Designer ist es bewusst*, durch die Trace-Logs, sodass sich die nächste Iteration des Filters verbessert. Das Bewusstsein gehört dem Harness-Engineer, der die Traces liest, nicht dem Agenten, der die Anfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedische Körperschichten: physisch, energetisch, mental, urteilsfähig, Wonne) eine Hierarchie von grob zu subtil, wobei das Subtile „höher“ ist. Harness-Engineering kennt keine solche Wertordnung. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM-as-Judge. Böckeler weist explizit darauf hin, dass rechnerische Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferentielle Kontrollen teuer und probabilistisch sind. In der Praxis will man die „grobe“ Schicht *maximieren*, nicht transzendieren. Das Importieren der Kosha-Hierarchie ins Harness-Design würde dazu führen, dass man zu viel in inferentielle Kontrollen und zu wenig in deterministische investiert. Das Gegenteil von dem, was funktioniert.

Zweitens zielt die yogische Praxis auf die Befreiung aus dem Zyklus konditionierter Reaktion ab. Die Agentenarchitektur zielt auf eine *effektive* konditionierte Reaktion ab. Man will, dass der Agent zuverlässige Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet das Loslassen *aller* Anhaftungen. Im Harness-Engineering bedeutet es das Loslassen *falscher* Anhaftungen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Das Importieren des gesamten soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung dadurch erreicht, dass er sich weigert, überhaupt etwas abzurufen. Nicht hilfreich.

---

## Was das nicht ist

Das ist kein „altes Wissen validiert meine Architektur.“ Der kausale Pfeil läuft in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion ausgeklügelte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agentenspeicherforschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering am selben Problem: Wie verwaltet ein begrenztes System unbegrenzten Informationsfluss?

Das ist auch nicht der erste Versuch an dieser Schnittstelle. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) von Ghosh und Ghosh und dessen Nachfolger Maṇḍūkya-APO bilden vedische Bewusstseinszustände (die vier Zustände der Māṇḍūkya Upaniṣad: Wachsein, Träumen, Tiefschlaf, transzendent) auf einen Wach-Schlaf-Konsolidierungszyklus für RL-Agenten ab, formalisiert mit Kategorientheorie. Die architektonische Intuition ist solide und die Abbildung ernsthaft. Aber beide Papers sind explizit konzeptionelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht durchgeführt. Die Lücke zwischen „vorgeschlagenem Rahmenwerk“ und „gemessenem Ergebnis“ ist der Ort, an dem der Großteil interdisziplinärer Arbeit stirbt. Die drei folgenden Hypothesen sind so entworfen, dass sie dort nicht sterben.

Die nützliche Frage lautet nicht „Ist Yoga für KI relevant?“, sondern „Welche spezifischen yogischen Unterscheidungen produzieren testbare Hypothesen, die aktuelle Speichersysteme nicht stellen?“

Das initiale Benchmark hat eine Frage beantwortet. Uniforme Deduplizierung in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`-Guard ([PR #359](https://github.com/scrypster/muninndb/pull/359)) hat sie korrigiert. Zwei Hypothesen bleiben offen. Ergebnis-markierter Zerfall (vrtti nirodha) erfordert den synthetischen Vault-Generator, um zu zeigen, dass einheitlicher Zerfall die Abrufqualität bei Einträgen mit unterschiedlichen Ergebnishistorien kostet. Hebbian'sche Verdrängung (vairagya) erfordert denselben Generator, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beide reduzieren sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss die Abruf-Präzision aufgeschlüsselt nach Eintragseigenschaften erfassen**: Hebbian'sches Gewicht, Zugriffshäufigkeit, Ergebnishistorie. Wenn die Daten ein Problem zeigen, sind die Lösungen einfach. Wenn nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Das Benchmark-Harness erfasst die vollständige Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Engineer schon.

Keines davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen als Engineering-Heuristiken ernst zu nehmen und zu messen, ob sie den Agenten-Abruf bei realistischen Workloads verbessern. Das initiale Benchmark erzwang eine Design-Änderung. Der synthetische Vault-Generator entscheidet über den Rest.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, rechnerisch, inferentiell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirischer Nachweis, dass Harness-Änderungen 6-fache Leistungsunterschiede erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), der engste Stand der Technik, der Vedanta auf Agentenarchitektur abbildet (konzeptionell, noch keine Benchmarks). Yoga-Sutren 1.2-1.16, das Aufmerksamkeitsfilterungsmodell, das all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), die Korrektur der Score-Sättigung. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Dedup-Guard. [Hrafn](https://github.com/5queezer/hrafn), die Runtime, die auf einem 10-Dollar-Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine leichte Agenten-Runtime in Rust. Vorheriger Beitrag: [Warum KI-Agenten Schlaf brauchen](/blog/why-ai-agents-need-sleep/).*