---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Speicherkonsolidierungverschlechterte den Abruf. Drei Gestaltungsprinzipien aus Agenten‑Gedächnis‑Benchmarks und ihre überraschenden Parallelen in der yogischen Aufmerksamkeits‑Theorie."
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "2c7f6509176cfdb3352d9e652ad15a9e"
---
Das Konsolidierungssystem von [MuninnDB](https://github.com/scrypster/muninndb) hat drei Engramm-Duplikate mit Farbvarianten genau wie vorgesehen zusammengeführt (Kosinus-Ähnlichkeit >= 0,95). Die Abrufqualität verschlechterte sich. In einem 13-Engramm-Tresor verschob die Entfernung von Duplikaten den Normalisierungsanker und drängte relevante Ergebnisse im Ranking nach unten. Der Fix bestand in einer Guard Clause: `MinDedupVaultSize` (Standardwert 20), welche die Phase-2-Deduplizierung in kleinen Tresoren überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Issue.

Der Fehler lag nicht im Dedup-Algorithmus selbst. Es war ein Mangel an *Unterscheidungsvermögen*: Eine gültige Konsolidierungsoperation wurde in einem Kontext angewendet, in dem sie Schaden anrichtete. Wann konsolidiert man, wann lässt man es unangetastet, was zählt als Rauschen und was als Signal? Dieses Problem hat eine lange Geschichte außerhalb der Informatik. Ich fand drei spezifische Designprinzipien in den [Yoga Sutras](https://de.wikipedia.org/wiki/Yogasutra), die sich auf empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) abbilden lassen.

**Die kontemplativen Traditionen haben ausgefeilte Modelle der Aufmerksamkeitsfilterung entwickelt. Einige dieser Modelle generieren testbare Hypothesen, die die aktuelle Literatur zu Agent Memory nicht liefert.**

## 1. Nicht jedes Rauschen ist gleich (Vrtti Nirodha)

Vor dem Dedup-Fehler stieß [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) auf ein grundlegenderes Problem. Das ACT-R-Scoring von MuninnDB ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) klemmte frische Engramme auf raw=1.0 fest, wodurch alle Abrufwerte identisch bei 0.9000 lagen. Das System konnte Signal nicht von Rauschen unterscheiden. Jeder Eintrag wirkte gleich relevant. Nach dem Fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich die Spannweite der Scores auf 0.18–0.90 und die korrekte Top-1-Abrufquote stieg auf 5/5 Anfragen. Die gleichförmige Behandlung von Einträgen hatte die Abrufqualität zerstört.

Meta-Harness bestätigte dasselbe Muster in einem anderen Maßstab. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) verglich drei Stufen des Informationszugriffs für den Harness-Optimierer:

| Bedingung | Median-Genauigkeit | Beste Genauigkeit |
|---|---|---|
| Nur Scores | 34,6 % | 41,3 % |
| Scores + LLM-Zusammenfassung | 34,9 % | 38,7 % |
| Vollständige Raw-Traces | 50,0 % | 56,7 % |

LLM-generierte Zusammenfassungen schnitten *schlechter* ab als reine Raw-Scores (beste Genauigkeit 38,7 % vs. 41,3 %). Vollständige Raw-Traces erreichten 56,7 %. Die Zusammenfassungen warfen diagnostische Signale zusammen mit Rauschen über Bord und zerstörten damit die Informationen, die der Optimierer benötigte. Bei der Textklassifizierung erreichte Meta-Harness 48,6 % gegenüber 40,9 % von ACE und verwendete dabei 4x weniger Kontext-Tokens. Der Schlüssel zum Erfolg waren nicht mehr Informationen. Es war eine bessere *Auswahl* der Informationen.

Das Designprinzip: Eine undifferenzierte Behandlung von Einträgen zerstört die Abrufqualität, sei es durch einheitliches Scoring, verlustbehaftete Zusammenfassungen oder undifferenzierte Deduplizierung.

Yoga Sutra 1.2 definiert Yoga als *chitta vrtti nirodha*, das Zur-Ruhe-Kommen der Schwankungen im Geistfeld. Patanjali sagt nicht „Lösche alles.“ Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Angst vor dem Tod) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, erhalte das Signal. Der Score-Sättigungs-Fehler bestand darin, dass das System diese Unterscheidung nicht treffen konnte. Jede Vritti sah gleich aus.

Die Design-Implikation für MuninnDB: Decay-Floors sollten das Ergebnis widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Aufruf können identische Abrufquoten haben, aber einen radikal unterschiedlichen Retentionswert. Man könnte versuchen, Einträge von vornherein als Pramana oder Klesha (verifiziert vs. verzerrt) zu klassifizieren, doch diese Klassifizierung ist selbst das eigentliche Problem. Für die meisten Einträge erfordert es semantische Urteilsfähigkeit, was ein LLM im Decay-Pfad bedeutet, was die Konsolidierung teuer und nichtdeterministisch macht.

Der einfachere Weg: **ergebnis-getaggte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die darauffolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Schlägt die Aktion fehl, `outcome: failure`. Der Decay-Floor koppelt sich an die Erfolgsquote, nicht an eine epistemische Kategorie. Dies ist im Wesentlichen Banditen-Feedback für den Abruf, eine im Information-Retrieval gut etablierte Idee, die hier auf den persistenten Agentenspeicher angewendet wird. Keine Ontologie nötig. Kein LLM in der Schleife. Man muss die Vritti nicht im Voraus klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Retention formen.

---

## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei state-of-the-art Speichersysteme (A-Mem, Mem0, MemoryOS) gegen naive RAG-Baselines, die einfach aus dem Raw-Kontext abrufen. Keines der fortschrittlichen Systeme übertraf die Baselines konsistent. Der spezifische Ausfallmodus: Diese Systeme konnten kein prozedurales Gedächtnis nutzen (Feedback-Logs, die den Systemleistungs-Verlauf anzeigen). Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen gesagt hätten, welche Erinnerungen tatsächlich nützlich waren.

MuninnDBs Benchmark #311 erzeugte eine lokale Version desselben Problems. Phase 2 der Deduplizierung identifizierte korrekt drei Duplikate mit Farbvarianten und führte sie zusammen (Kosinus >= 0,95). Aber im 13-Engramm-Tresor veränderte die Entfernung dieser Einträge den Normalisierungsanker. Ein nicht zusammenhängendes Engramm wurde zum Referenzpunkt, was relevante Ergebnisse im Ranking nach unten drängte. Eine gültige Konsolidierungsoperation, einheitlich angewendet, verdrängte die richtige Antwort.

Böckelers [Harness-Engineering-Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Fehlanpassung. Sie unterscheidet computationale Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Deduplizierung bei Kosinus >= 0,95 ist ein computionaler Prozess. Zu erkennen, wann Deduplizierung dem Abruf schadet, erfordert inferenzielles Urteilen: „Diese Einträge sind ähnlich, aber ist ihre Entfernung in diesem Tresor *sicher*?“ Kein Ähnlichkeitsschwellenwert kann das beantworten.

Die [Yoga Sutras](https://de.wikipedia.org/wiki/Yogasutra) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Rille. MuninnDB implementiert dies direkt: Einträge, die kollokal aktiviert werden, stärken ihre Assoziationsgewichte. Die Sutras warnen davor, dass Samskaras sich aufschaukeln. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht-Anhaftung, die Fähigkeit, starke Assoziationen loszulassen) verfestigen sie sich zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die bewusste Bewertung umgehen. Man sieht die Situation nicht mehr und führt nur noch das Skript aus.

Der fehlende Mechanismus ist eine explizite Hebb'sche Schwächung: nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag ein False-Positive-Abruf produziert. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse erzwangen bereits eine Korrektur (die `MinDedupVaultSize`-Guard). Die nächste Messung erfordert den synthetischen Vault-Generator mit markierten Engramm-Klassen: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped und Legal-adjacent. Die präzisere Metrik ist die *Verdrängungsrate*: Wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsches Ding abgerufen“, sondern „richtiges Ding durch habitualisierten Abruf verdrängt“. Wenn verstärkte Einträge eine messbare Verdrängung erzeugen, ist Vairagya als Design-Primitiv empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir sparen uns die Komplexität.

---

## 3. Die Kraft der bewussten Ausgrenzung (Pratyahara)

Meta-Harness’ überraschendstes Ergebnis: Die erfolgreichen Harnesses sind nicht diejenigen, die das Kontextfenster mit allem verfügbaren vollstopfen. Der Gewinner bei der Textklassifizierung nutzt TF-IDF mit kontrastiven Paaren und Label-Priming (48,6 % Genauigkeit, 4x weniger Tokens als der Zweitplatzierte). Der Gewinner beim Mathematik-Abruf ist ein Vier-Wege-BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlrichtlinien. Keine exotischen Architekturen. Das Wechseln des Harnesses um ein festes LLM herum erzeugt auf demselben Benchmark eine 6x so große Leistungslücke.

Böckeler fasst es als „keep quality left“ (Qualität früh sichern) zusammen: Je früher du filterst, desto günstiger und zuverlässiger ist das Downstream-Ergebnis. Ihre computationalen Guides (Linter, Schemata, CLAUDE.md-Regeln) verhindern, dass ganze Kategorien von Informationen das Modell überhaupt erreichen. Die `MinDedupVaultSize`-Guard aus PR #359 ist dasselbe Prinzip, angewendet auf Konsolidierung: Anstatt auf jedem Tresor eine Deduplizierung laufen zu lassen und zu hoffen, dass das Modell die degradierten Ergebnisse handhabt, lernte das System, die Deduplizierung in kleinen Tresoren *nicht anzuwenden*. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Posts argumentierte, dass das Memory-Trait-Interface Ablehnungs-Metadaten neben den Ergebnissen zurückgeben sollte. „Diese 3 Einträge passten, und diese 5 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip des [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) erklärt, warum. Pratyahara wird oft als „Rückzug der Sinne“ übersetzt, aber das ist irreführend. Es ist keine Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiterhin. Sie hören nur auf, den Geist zu jedem Reiz zu ziehen. Du entscheidest, was ins Bewusstsein gelangt, statt auf alles zu reagieren, was ankommt.

Wenn du dem LLM sagst „hier sind 5 Dinge, die ich dir bewusst vorenthalte“, hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Rückzug der Sinne. Das ist Sinnesstimulation mit Warnschild. Wer jemals meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten“ garantiert, dass du an den weißen Elefanten denkst. Konkret: Ablehnungserklärungen verbrauchen Tokens (was dem Meta-Harness-Befund widerspricht, dass einfache Harnesses gewinnen) und laden das Modell dazu ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch.“). Nicht-essentieller Kontext verschlechtert die Modellleistung selbst dann, wenn er technisch korrekt ist, und Ausschluss-Metadaten sind per Definition für die aktuelle Aufgabe nicht essentiell.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Das Memory-Trait-Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abruf-Implementierung protokolliert die vollständige Entscheidung intern: was zurückgegeben wurde, was ausgeschlossen wurde, warum und was der Agent als Nächstes tat. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

Ein Trace-Eintrag sieht so aus:

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

Der Agent sieht `excluded` nie. Der Benchmark-Harness sieht alles. Wenn `entry_089` die richtige Antwort war und aufgrund seines niedrigen Hebb'schen Gewichts gefiltert wurde, taucht das im Trace auf und die nächste Iteration der Abrufpolitik kann anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein computationaler Guide (es bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein computionaler Sensor (es beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne davon, dass das gefilterte System sich der Ausgrenzung bewusst ist. Es ist bewusstes Filtern im Sinne des Designers, der durch die Trace-Logs bewusst ist, sodass die nächste Iteration des Filters sich verbessert. Das Bewusstsein gehört dem Harness-Ingenieur, der die Traces liest, nicht dem Agenten, der die Anfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedische Körperschichten: physisch, energetisch, mental, diskriminativ, Glückseligkeit) eine Hierarchie vom Groben zum Feinen, wobei das Feine „höher“ ist. Harness Engineering hat keine solche Wertordnung. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM-as-Judge. Böckeler merkt explizit an, dass computationale Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferenzielle Kontrollen teuer und probabilistisch sind. In der Praxis möchte man die „grobe“ Ebene maximieren, nicht sie transzendieren. Die Übernahme der Kosha-Hierarchie ins Harness-Design würde dazu führen, übermäßig in inferenzielle Kontrollen zu investieren und deterministische zu vernachlässigen. Das Gegenteil von dem, was funktioniert.

Zweitens zielt die yogische Praxis auf Befreiung vom Kreislauf konditionierter Reaktionen ab. Agentenarchitektur zielt auf *effektive* konditionierte Reaktionen ab. Man möchte, dass der Agent zuverlässige Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet, alle Anhaftung loszulassen. Im Harness Engineering bedeutet es, falsche Anhaftungen loszulassen. Das Ziel ist bessere Konditionierung, nicht gar keine Konditionierung. Die Übernahme des vollständigen soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erreicht, indem er sich weigert, überhaupt etwas abzurufen. Unhilfreich.

---

## Was das nicht ist

Es ist nicht „uralte Weisheit bestätigt meine Architektur.“ Der kausale Pfeil zeigt in die andere Richtung: Die kontemplativen Traditionen haben über Jahrtausende systematischer Introspektion ausgefeilte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung entwickelt. Dass einige dieser Modelle Ergebnisse in der Agent-Memory-Forschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering am selben Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Es ist auch nicht der erste Versuch an dieser Schnittstelle. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya-APO bilden vedische Bewusstseinszustände (die vier Zustände der Māṇḍūkya-Upaniṣad: Wachen, Träumen, Tiefschlaf, transzendent) auf einen Wach-Schlaf-Konsolidierungszyklus für RL-Agenten ab, formalisiert mit Kategorientheorie. Die architektonische Intuition ist solide und das Mapping ist ernst gemeint. Aber beide Papers sind explizit konzeptionelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht durchgeführt. Die Lücke zwischen „vorgeschlagenem Framework“ und „gemessenem Ergebnis“ ist dort, wo die meisten interdisziplinären Arbeiten sterben. Die drei nachfolgenden Hypothesen sind darauf ausgelegt, dort nicht zu sterben.

Die nützliche Frage ist nicht „Ist Yoga relevant für KI?“, sondern „Welche spezifischen yogischen Unterscheidungen produzieren testbare Hypothesen, die aktuelle Speichersysteme nicht liefern?“

Der initielle Benchmark hat eine Frage beantwortet. Einheitliche Deduplizierung in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`-Guard ([PR #359](https://github.com/scrypster/muninndb/pull/359)) hat dies korrigiert. Zwei Hypothesen bleiben offen. Ergebnis-getaggter Verfall (Vrtti Nirodha) erfordert den synthetischen Vault-Generator, um zu zeigen, dass einheitlicher Verfall die Abrufqualität bei Einträgen mit unterschiedlicher Ergebnishistorie kostet. Hebb'sche Verdrängung (Vairagya) erfordert denselben Generator, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beide reduzieren sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss die Abrufpräzision erfasst, aufgeschlüsselt nach Entry-Eigenschaften**: Hebb'sches Gewicht, Zugriffshäufigkeit, Ergebnishistorie. Zeigen die Daten ein Problem, sind die Fixes geradlinig. Zeigen sie es nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Der Benchmark-Harness erfasst die vollständige Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur schon.

Nichts davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen ernst zu nehmen als Engineering-Heuristiken und zu messen, ob sie den Agentenabruf bei realistischen Workloads verbessern. Der initielle Benchmark erzwang eine Design-Änderung. Der synthetische Vault-Generator entscheidet den Rest.

## Weiterführende Lektüre

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, computational, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirische Belege dafür, dass Harness-Änderungen 6x-Leistungslücken erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), die engste Vorarbeit, die Vedanta auf Agentenarchitektur abbildet (konzeptionell, noch keine Benchmarks). Yoga Sutras 1.2–1.16, das Aufmerksamkeitsfilter-Modell, das all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), der Fix für die Score-Sättigung. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Dedup-Guard. [Hrafn](https://github.com/5queezer/hrafn), die Laufzeit, die auf einem 10-Dollar-Raspberry Pi läuft.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige Agenten-Laufzeit in Rust. Vorheriger Beitrag: [Warum KI-Agenten Schlaf brauchen](/blog/why-ai-agents-need-sleep/).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*