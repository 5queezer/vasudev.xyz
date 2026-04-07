---
title: "Patanjali hatte die Filterspezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "**Konsolidierung des Speichers verschlechterte die Abrufbarkeit. Drei Designprinzipien aus Agenten‑Speicherbenchmarks und ihre überraschenden Parallelen in der yogischen Aufmerksamkeitslehre.**"
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "30e2a9d5fef0596e41ce2cd404ee0815"
---
Das Konsolidierungssystem von [MuninnDB](https://github.com/scrypster/muninndb) fasste drei duplizierte Engramme mit Farbvarianten exakt wie vorgesehen zusammen (Kosinus-Ähnlichkeit >= 0.95). Die Abrufleistung verschlechterte sich. In einem 13-Engramm-Vault verschob das Entfernen von Duplikaten den Normalisierungsanker, was relevante Ergebnisse im Ranking nach unten drückte. Die Lösung war eine Guard-Condition: `MinDedupVaultSize` (Standardwert 20), die die Phase-2-Deduplizierung in kleinen Vaults überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss den Issue.

Der Fehler war kein Bug im Deduplizierungsalgorithmus. Es war ein Fehler der *Diskriminationsfähigkeit*: eine gültige Konsolidierungsoperation, angewendet in einem Kontext, in dem sie Schaden anrichtete. Wann konsolidieren, wann unberührt lassen, was zählt als Rauschen vs. Signal. Dieses Problem hat eine lange Geschichte außerhalb der Informatik. Ich fand drei spezifische Designprinzipien in den [Yoga Sutras](https://de.wikipedia.org/wiki/Yogasutras), die sich mit empirischen Ergebnissen von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) decken.

**Die kontemplativen Traditionen entwickelten ausgefeilte Modelle zur Aufmerksamkeitsfilterung. Einige dieser Modelle erzeugen testbare Hypothesen, die die aktuelle Literatur zu Agentenspeichern nicht liefert.**

## 1. Nicht alles Rauschen ist gleich (Vrtti Nirodha)

Vor dem Dedup-Fehler stieß [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) auf ein grundlegenderes Problem. MuninnDBs ACT-R-Scoring ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) klemmte frische Engramme auf raw=1.0, wodurch alle Abrufwerte bei 0.9000 identisch waren. Das System konnte Signal nicht von Rauschen unterscheiden. Jeder Eintrag schien gleich relevant. Nach dem Fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Wertebereich auf 0.18-0.90 und die korrekte Top-1-Abfrage stieg auf 5/5. Die einheitliche Behandlung der Einträge hatte die Abrufqualität zerstört.

Meta-Harness bestätigte das gleiche Muster in einem anderen Maßstab. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) verglich drei Stufen des Informationszugriffs für den Harness-Optimierer:

| Bedingung | Median-Genauigkeit | Beste Genauigkeit |
|---|---|---|
| Nur Werte | 34,6 % | 41,3 % |
| Werte + LLM-Zusammenfassung | 34,9 % | 38,7 % |
| Vollständige Rohtoken | 50,0 % | 56,7 % |

LLM-generierte Zusammenfassungen schnitten *schlechter* ab als reine Werte (beste Genauigkeit 38,7 % vs. 41,3 %). Vollständige Rohtoken erzielten 56,7 %. Die Zusammenfassungen reduzierten diagnostisches Signal gemeinsam mit dem Rauschen und zerstörten damit die Information, die der Optimierer brauchte. Bei der Textklassifikation erreichte Meta-Harness 48,6 % gegenüber ACEs 40,9 %, während es 4x weniger Kontext-Token verbrauchte. Der entscheidende Vorteil war nicht mehr Information. Es war eine bessere *Auswahl* der Information.

Das Designprinzip: Die undifferenzierte Behandlung von Einträgen zerstört die Abrufqualität, egal ob durch einheitliches Scoring, verlustbehaftete Zusammenfassung oder undifferenzierte Deduplizierung.

Yoga Sutras 1.2 definiert Yoga als *chitta vrtti nirodha*, das Zur-Ruhe-Kommen der Schwankungen im Geistfeld. Patanjali sagt nicht „lösche alles". Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha) (Verzerrungen: Anhaftung, Abneigung, Ego, Ignoranz, Angst vor dem Tod) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, bewahre das Signal. Der Score-Sättigungs-Bug war das Versäumnis des Systems, diese Unterscheidung zu treffen. Jede Vrittis sah gleich aus.

Die Design-Implikation für MuninnDB: Decay Floors sollten Ergebnisse widerspiegeln, nicht nur Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Aufruf könnten zwar identische Abrufquoten haben, aber radikal unterschiedlichen Behaltenswert. Man könnte versuchen, Einträge im Voraus als Pramana oder Klesha zu klassifizieren (verifiziert vs. verzerrt), aber diese Klassifizierung ist selbst das schwierige Problem. Für die meisten Einträge erfordert sie semantische Urteilsbildung, was ein LLM im Decay-Pfad bedeuten würde, was Konsolidierung teuer und nichtdeterministisch macht.

Der einfachere Weg: **Ergebnis-getaggte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die nachfolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Scheitert die Aktion, `outcome: failure`. Die Verfallsuntergrenze koppelt sich an die Erfolgsquote, nicht an eine epistemische Kategorie. Dies ist im Wesentlichen Banditen-Feedback für den Abruf, ein in der Informationsgewinnung etabliertes Konzept, das hier auf persistenten Agentenspeicher angewendet wird. Keine Ontologie nötig. Kein LLM in der Schleife. Man muss die Vrittis nicht im Voraus klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Speicherung formen.

---

## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei hochmoderne Speichersysteme (A-Mem, Mem0, MemoryOS) gegen naive RAG-Baselines, die einfach aus dem Rohkontext abrufen. Keines der fortgeschrittenen Systeme übertraf die Baselines konsistent. Der spezifische Fehlermodus: Diese Systeme konnten prozedurales Gedächtnis (Feedback-Logs, die den Systemleistungsverlauf anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen gesagt hätten, welche Speicher tatsächlich nützlich waren.

MuninnDBs Benchmark #311 lieferte eine lokale Version desselben Problems. Die Phase-2-Dedup identifizierte und fusionierte korrekt drei Duplikate mit Farbvarianten (Kosinus >= 0.95). Aber im 13-Engramm-Vault veränderte das Entfernen dieser Einträge den Normalisierungsanker. Ein nicht zusammenhängendes Engramm wurde zum Referenzpunkt und drückte relevante Ergebnisse im Ranking nach unten. Eine gültige Konsolidierungsoperation, einheitlich angewendet, verdrängte die richtige Antwort.

Böckelers [Harness-Engineering-Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Diskrepanz. Sie unterscheidet zwischen komputationalen Sensoren (deterministisch, günstig, laufen bei jeder Änderung) und inferenziellen Sensoren (semantisch, teuer, probabilistisch). Dedup bei Kosinus >= 0.95 ist ein rechnerischer Prozess. Zu erkennen, wann Dedup den Abruf schädigt, erfordert inferenzielles Urteilen: „Diese Einträge sind ähnlich, aber ist es *sicher*, sie in diesem Vault zu entfernen?" Keine Ähnlichkeitsschwelle kann das beantworten.

Die [Yoga Sutras](https://de.wikipedia.org/wiki/Yogasutras) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Furche. MuninnDB setzt dies direkt um: Einträge, die gemeinsam aktiviert werden, stärken ihre Assoziationsgewichte. Die Sutras warnen, dass sich Samskaras addieren. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Loslösung, die Fähigkeit, starke Assoziationen loszulassen) verhärten sie zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und beginnt nur noch das Skript abzuspulen.

Der fehlende Mechanismus ist explizite hebbianische *Schwächung*: nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen False-Positive-Abruf erzeugt. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse erzwangen bereits eine Korrektur (die `MinDedupVaultSize`-Guard). Die nächste Messung erfordert den synthetischen Vault-Generator mit beschrifteten Engramm-Klassen: Duplikat, Fast-Duplikat, zeitliches Update, einzigartige Tatsache, selten genutztes Unikat, juristisch eingegrenzt und juristisch angrenzend. Die schärfere Metrik ist die *Verdrängungsrate*: Wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsche Sache abgerufen", sondern „richtige Sache durch habitualisierten Abruf verdrängt". Wenn verstärkte Einträge messbare Verdrängung erzeugen, ist Vairagya als Design-Primitiv empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir sparen uns die Komplexität.

---

## 3. Die Kraft der bewussten Ausgrenzung (Pratyahara)

Das überraschendste Ergebnis von Meta-Harness: Die gewinnenden Harnesses sind nicht diejenigen, die das Kontextfenster mit allem verfügbaren vollstopfen. Der Gewinner bei der Textklassifikation nutzt TF-IDF mit kontrastiven Paaren und Label-Priming (48,6 % Genauigkeit, 4x weniger Token als der Zweitplatzierte). Der Gewinner beim mathematischen Abruf ist ein Vier-Pfade-BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlrichtlinien. Keine exotischen Architekturen. Das Ändern des Harnesses um ein festes LLM herum erzeugt eine 6-fache Leistungslücke beim gleichen Benchmark.

Böckeler fasst es als „keep quality left" zusammen: Je früher man filtert, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre komputationalen Guides (Linter, Schemas, CLAUDE.md-Regeln) verhindern, dass ganze Informationskategorien überhaupt das Modell erreichen. Die `MinDedupVaultSize`-Guard aus PR #359 ist dasselbe Prinzip, angewendet auf Konsolidierung: Anstatt Dedup auf jedem Vault auszuführen und zu hoffen, dass das Modell die degradierten Ergebnisse verarbeitet, lernte das System, Dedup in kleinen Vaults *gar nicht erst anzuwenden*. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Posts argumentierte, dass das Memory Trait Interface Ablehnungsmetadaten neben den Ergebnissen zurückgeben sollte. „Diese 3 Einträge passten, und diese 5 wurden wegen X ausgeschlossen." Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip von [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) erklärt warum. Pratyahara wird oft als „Rückzug der Sinne" übersetzt, aber das ist irreführend. Es ist nicht Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiter. Sie hören nur auf, den Geist zu jedem Reiz zu ziehen. Man entscheidet, was ins Bewusstsein dringt, anstatt auf alles zu reagieren, was ankommt.

Wenn man dem LLM sagt: „Hier sind 5 Dinge, die ich dir bewusst vorenthalte", hat man ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Rückzug der Sinne. Das ist Sinnesstimulation mit Warnschild. Jeder, der meditiert hat, kennt das Ergebnis: „Denke nicht an einen weißen Elefanten" garantiert, dass du an den weißen Elefanten denkst. Konkret: Ausschlusserklärungen verbrauchen Token (widerspricht dem Meta-Harness-Befund, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter in Frage zu stellen („Warum wurde X ausgeschlossen? Vielleicht brauche ich ihn doch"). Nicht essenzieller Kontext verschlechtert die Modellleistung, selbst wenn er technisch korrekt ist, und Ausschlussmetadaten sind per Definition für die aktuelle Aufgabe nicht essenziell.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Das Memory Trait Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abrufimplementierung protokolliert intern die gesamte Entscheidung: was wurde zurückgegeben, was ausgeschlossen, warum, und was tat der Agent als Nächstes. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

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

Der Agent sieht `excluded` nie. Der Benchmark-Harness sieht alles. Wenn `entry_089` die richtige Antwort war und gefiltert wurde, weil sein hebbianisches Gewicht niedrig war, taucht das im Trace auf, und die nächste Iteration der Abrufpolicy kann sich anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein komputationaler Guide (es bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein komputationaler Sensor (es beobachtet, was passiert ist). Sie werden nicht verschmolzen. Pratyahara ist kein bewusstes Filtern im Sinne von *das gefilterte System sich der Ausgrenzung bewusst zu machen*. Es ist bewusstes Filtern im Sinne von *der Designer sich bewusst zu machen*, durch die Trace-Logs, damit die nächste Iteration des Filters besser wird. Das Bewusstsein gehört dem Harness-Engineer, der die Traces liest, nicht dem Agenten, der die Queries ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens: Die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedantische Körperschichten: physisch, energetisch, mental, diskriminierend, Glückseligkeit) implizieren eine Hierarchie von grob zu subtil, wobei das Subtile „höher" ist. Harness-Engineering kennt keine solche Wertehierarchie. Ein deterministischer Linter ist nicht „niedriger" als ein LLM-as-Judge. Böckeler weist explizit darauf hin, dass komputationale Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferenzielle Kontrollen teuer und probabilistisch sind. In der Praxis möchte man die „grobe" Schicht *maximieren*, nicht sie transzendieren. Das Importieren der Kosha-Hierarchie ins Harness-Design würde dazu führen, dass man zu viel in inferenzielle Kontrollen und zu wenig in deterministische investiert. Das Gegenteil von dem, was funktioniert.

Zweitens: Yogische Praxis zielt auf Befreiung vom Zyklus konditionierter Reaktion ab. Agentenarchitektur zielt auf *effektive* konditionierte Reaktion ab. Man möchte, dass der Agent zuverlässige Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet, *alle* Anhaftung loszulassen. Im Harness-Engineering bedeutet es, *falsche* Anhaftungen loszulassen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Das Importieren des vollständigen soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erlangt, indem er sich weigert, überhaupt etwas abzurufen. Unbrauchbar.

---

## Was das nicht ist

Dies ist nicht „altertümliche Weisheit validiert meine Architektur". Der Kausalpfeil verläuft in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion ausgefeilte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agentenspeicherforschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering am selben Problem: Wie verwaltet ein begrenztes System unbegrenzten Informationsfluss?

Dies ist auch nicht der erste Versuch an dieser Schnittstelle. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya-APO bilden vedantische Bewusstseinszustände (die vier Zustände der Māṇḍūkya Upaniṣad: Wachen, Träumen, Tiefschlaf, transzendent) auf einen Wach-Schlaf-Konsolidierungszyklus für RL-Agenten ab, formalisiert mit Kategorientheorie. Die architektonische Intuition ist solide und die Zuordnung ist ernsthaft. Aber beide Papers sind explizit konzeptionelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht ausgeführt. Die Lücke zwischen „vorgeschlagenem Rahmenwerk" und „gemessenem Ergebnis" ist der Ort, an dem der meiste disziplinübergreifende Arbeit stirbt. Die drei folgenden Hypothesen sind darauf ausgelegt, dort nicht zu sterben.

Die nützliche Frage ist nicht „ist Yoga relevant für KI?", sondern „welche spezifischen yogischen Unterscheidungen erzeugen testbare Hypothesen, die aktuelle Speichersysteme nicht stellen?"

Der initiale Benchmark hat eine Frage beantwortet. Einheitliche Deduplizierung in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`-Guard ([PR #359](https://github.com/scrypster/muninndb/pull/359)) korrigierte dies. Zwei Hypothesen bleiben offen. Outcome-getaggter Decay (Vrtti Nirodha) erfordert den synthetischen Vault-Generator, um zu zeigen, dass einheitlicher Verfall die Abrufqualität bei Einträgen mit unterschiedlichen Ergebnisverläufen kostet. Hebbianische Verdrängung (Vairagya) erfordert denselben Generator, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss die Abrufpräzision aufgeschlüsselt nach Eintragseigenschaften erfassen**: hebbianisches Gewicht, Zugriffshäufigkeit, Ergebnisverlauf. Wenn die Daten ein Problem zeigen, sind die Fixes straightforward. Wenn nicht, sparen wir uns die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Der Benchmark-Harness erfasst die gesamte Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Engineer schon.

Nichts davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen ernst als Engineering-Heuristiken zu nehmen und zu messen, ob sie den Agentenabruf bei realistischen Workloads verbessern. Der initiale Benchmark erzwang eine Designänderung. Der synthetische Vault-Generator entscheidet den Rest.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, komputational, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirische Belege dafür, dass Harness-Änderungen 6-fache Leistungsunterschiede bewirken. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), die nächstgelegene Vorarbeit, die Vedanta auf Agentenarchitektur abbildet (konzeptionell, noch keine Benchmarks). Yoga Sutras 1.2-1.16, das Modell zur Aufmerksamkeitsfilterung, das all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), der Fix für die Score-Sättigung. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Dedup-Guard. [Hrafn](https://github.com/5queezer/hrafn), die Laufzeitumgebung, die auf einem $10-Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine schlanke Agenten-Laufzeitumgebung in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*Das Titelbild dieses Beitrags wurde von KI generiert.*