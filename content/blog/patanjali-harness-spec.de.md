---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben gerade die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Speicherkonsolidierung verschlechtert den Abruf. Drei gestalterische Prinzipien aus Benchmarks für Agentenspeicher und ihre überraschenden Parallelen in der yogischen Aufmerksamkeits‑Theorie."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "52c04189c355d547f341671c6308507b"
---
Das Konsolidierungssystem von [MuninnDB](https://github.com/scrypster/muninndb) fusionierte drei Duplikat-Engramme mit unterschiedlichen Farbvarianten exakt wie vorgesehen (Kosinus-Ähnlichkeit >= 0,95). Die Abrufqualität verschlechterte sich. In einem Vault mit 13 Engrammen verschob das Entfernen der Duplikate den Normalisierungs-Anker und drängte relevante Ergebnisse im Ranking nach unten. Die Behebung bestand in einer Schutzklausel: `MinDedupVaultSize` (Standardwert 20), die Phase-2-Deduplizierung in kleinen Vaults überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Problem.

Es handelte sich nicht um einen Fehler im Deduplizierungsalgorithmus. Es war ein Versagen der *Unterscheidungsfähigkeit*: Eine valide Konsolidierungsoperation, angewendet in einem Kontext, in dem sie Schaden anrichtete. Wann konsolidieren, wann in Ruhe lassen, was als Rauschen und was als Signal zählt. Dieses Problem hat außerhalb der Informatik eine lange Geschichte. Ich fand drei spezifische Designprinzipien in den [Yoga Sutras](https://de.wikipedia.org/wiki/Yoga-Sutras_des_Patanjali), die sich auf empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) abbilden lassen.

***Die kontemplativen Traditionen haben ausgefeilte Modelle zur Filterung von Aufmerksamkeit entwickelt. Einige dieser Modelle generieren überprüfbare Hypothesen, die die aktuelle Literatur zum Agentenspeicher nicht liefert.***

## 1. Nicht alles Rauschen ist gleich (Vrtti Nirodha)

Vor dem Deduplizierungsfehler trat bei [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ein grundlegenderes Problem auf. Das ACT-R-Scoring von MuninnDB ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) klemmte frische Engramme auf `raw=1.0`, wodurch alle Abrufwerte identisch bei 0,9000 lagen. Das System konnte Signal nicht von Rauschen unterscheiden. Jeder Eintrag wirkte gleichermaßen relevant. Nach der Behebung ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich die Spanne der Werte auf 0,18–0,90 und die korrekte Top-1-Abrufquote stieg auf 5/5 Abfragen. Die einheitliche Behandlung der Einträge hatte die Abrufqualität zerstört.

Meta-Harness bestätigte das gleiche Muster auf einer anderen Skalenebene. Die [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) verglich drei Zugriffsebenen auf Informationen für den Harness-Optimizer:

| Bedingung | Median-Genauigkeit | Beste Genauigkeit |
|---|---|---|
| Nur Werte (Scores) | 34,6 % | 41,3 % |
| Werte + LLM-Zusammenfassung | 34,9 % | 38,7 % |
| Vollständige Roh-Logs (Traces) | 50,0 % | 56,7 % |

LLM-generierte Zusammenfassungen schnitten *schlechter* ab als reine Werte (38,7 % vs. 41,3 % beste Genauigkeit). Vollständige Roh-Logs erreichten 56,7 %. Die Zusammenfassungen vermischten diagnostische Signale mit Rauschen und zerstörten damit die Informationen, die der Optimierer benötigte. Bei der Textklassifikation erzielte Meta-Harness 48,6 % gegenüber 40,9 % bei ACE, bei gleichzeitig viermal weniger verbrauchten Kontext-Tokens. Der entscheidende Vorteil war nicht mehr Information. Es war die bessere *Selektion* von Information.

Das Designprinzip: Eine unterschiedslose Behandlung von Einträgen zerstört die Abrufqualität, egal ob durch einheitliche Bewertung, verlustbehaftete Zusammenfassung oder undifferenzierte Deduplizierung.

Yoga Sutra 1.2 definiert Yoga als *chitta vrtti nirodha*, das Beruhigen der Schwankungen im Geistfeld. Patanjali sagt nicht „lösche alles“. Er unterscheidet zwischen [*Kleshas*](https://de.wikipedia.org/wiki/Klesha_(Hinduismus)) (Verzerrungen: Bindung, Ablehnung, Ego, Unwissenheit, Angst vor dem Tod) und [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugnis). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, bewahre das Signal. Der Fehler der Wertesättigung war das Systemversagen bei dieser Unterscheidung. Jede *vrtti* sah gleich aus.

Die Designkonsequenz für MuninnDB: Verfallsuntergrenzen sollten das Ergebnis widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener `curl`-Versuch können identische Abrufquoten aufweisen, aber einen radikal unterschiedlichen Behaltenswert. Man könnte versuchen, Einträge von vornherein als Pramana oder Klesha zu klassifizieren (verifiziert vs. verzerrt), aber eben diese Klassifizierung ist das eigentliche schwierige Problem. Für die meisten Einträge erfordert sie semantische Urteilsfähigkeit, was einen LLM im Verfallspfad bedeuten würde – das macht die Konsolidierung teuer und nichtdeterministisch.

Der einfachere Weg: **ergebnismarkierte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die nachfolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Schlägt die Aktion fehl, `outcome: failure`. Die Verfallsuntergrenze koppelt an die Erfolgsquote, nicht an eine erkenntnistheoretische Kategorie. Dies ist im Wesentlichen Banditen-Feedback für den Abruf – ein in der Informationsgewinnung gut etabliertes Konzept, das hier auf persistenten Agentenspeicher angewendet wird. Keine Ontologie nötig. Kein LLM in der Schleife. Man muss die *vrtti* nicht im Voraus klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Speicherung steuern.

---

## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei State-of-the-Art-Speichersysteme (A-Mem, Mem0, MemoryOS) gegen naive RAG-Baselines, die einfach aus dem Rohkontext abrufen. Keines der fortschrittlichen Systeme übertraf die Baselines durchgängig. Der spezifische Fehlermodus: Diese Systeme konnten prozedurales Gedächtnis (Feedback-Logs, die den Systemleistungsverlauf anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen verraten hätten, welche Speicherinhalte tatsächlich nützlich waren.

Benchmark #311 von MuninnDB erzeugte eine lokale Version desselben Problems. Die Phase-2-Deduplizierung identifizierte und fusionierte korrekt drei Duplikate mit unterschiedlichen Farbvarianten (Kosinus >= 0,95). Doch im Vault mit 13 Engrammen veränderte das Entfernen dieser Einträge den Normalisierungs-Anker. Ein nicht verwandtes Engramm wurde zum Referenzpunkt und drängte relevante Ergebnisse im Ranking nach unten. Eine valide Konsolidierungsoperation, einheitlich angewendet, verdrängte die richtige Antwort.

Böckelers [Harness-Engineering-Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Diskrepanz. Sie unterscheidet zwischen rechnerischen Sensoren (deterministisch, billig, laufen bei jeder Änderung) und inferentiellen Sensoren (semantisch, teuer, probabilistisch). Deduplizierung bei Kosinus >= 0,95 ist ein rechnerischer Prozess. Das Erkennen, wann Deduplizierung dem Abruf schadet, erfordert inferentielles Urteilen: „Diese Einträge sind ähnlich, aber ist ihr Entfernen in diesem Vault *sicher*?“ Keine Ähnlichkeitsschwelle kann das beantworten.

Die [Yoga Sutras](https://de.wikipedia.org/wiki/Yoga-Sutras_des_Patanjali) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Rille. MuninnDB implementiert dies direkt: Einträge, die gemeinsam aktiviert werden, stärken ihre Assoziationsgewichte. Die Sutras warnen davor, dass Samskaras akkumulieren. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht-Anhaften, die Fähigkeit, starke Assozationen loszulassen) verhärten sie sich zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und fängt an, das Skript abzuspulen.

Der fehlende Mechanismus ist explizites hebbianisches *Schwächen*: nicht nur passiver Zerfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen falsch-positiven Abruf erzeugt. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse erzwangen bereits eine Korrektur (die `MinDedupVaultSize`-Schutzklausel). Die nächste Messung erfordert den synthetischen Vault-Generator mit beschrifteten Engramm-Klassen: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped und Legal-adjacent. Die präzisere Metrik ist die *Verdrängungsrate*: Wie oft drängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsches Ding abgerufen“, sondern „richtiges Ding durch gewohnheitsmäßigen Abruf verdrängt“. Wenn gestärkte Einträge eine messbare Verdrängung erzeugen, ist Vairagya als Design-Primitive empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Zerfall ausreichend und wir überspringen die Komplexität.

---

## 3. Die Kraft der gezielten Ausgrenzung (Pratyahara)

Das überraschendste Ergebnis von Meta-Harness: Die siegreichen Harnesses sind nicht diejenigen, die das Kontextfenster mit allem verfügbaren vollstopfen. Der Sieger bei der Textklassifikation nutzt TF-IDF mit kontrastiven Paaren und Label-Priming (48,6 % Genauigkeit, viermal weniger Tokens als der Zweitplatzierte). Der Sieger beim mathematischen Abruf ist ein Vier-Routen-BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlrichtlinien. Keine exotischen Architekturen. Das Ändern des Harnesses um ein feststehendes LLM herum erzeugt eine sechsfache Leistungslücke beim selben Benchmark.

Böckeler fasst es als „Qualität links halten“ zusammen: Je früher man filtert, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre rechnerischen Guides (Linter, Schemata, CLAUDE.md-Regeln) verhindern, dass ganze Informationskategorien überhaupt das Modell erreichen. Die `MinDedupVaultSize`-Schutzklausel aus PR #359 wendet dasselbe Prinzip auf die Konsolidierung an: Anstatt Deduplizierung auf jedem Vault auszuführen und zu hoffen, dass das Modell mit den verschlechterten Ergebnissen klarkommt, lernte das System, Deduplizierung in kleinen Vaults *nicht anzuwenden*. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Beitrags argumentierte, dass das Memory-Trait-Interface neben den Ergebnissen auch Ablehnungsmetadaten zurückgeben sollte. „Diese 3 Einträge passten, und diese 5 wurden aufgrund von X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip von [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutra 2.54) erklärt, warum. Pratyahara wird oft mit „Zurückziehen der Sinne“ übersetzt, aber das ist irreführend. Es ist keine Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiter. Sie hören nur auf, den Geist zu jedem Reiz zu ziehen. Du entscheidest, was ins Bewusstsein gelangt, anstatt auf alles zu reagieren, was ankommt.

Wenn du dem LLM sagst: „Hier sind 5 Dinge, die ich dir absichtlich vorenthalte“, hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Zurückziehen der Sinne. Das ist Sinnesstimulation mit einem Warnhinweis. Jeder, der schon einmal meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten“ garantiert, dass du an den weißen Elefanten denkst. Konkreter: Ablehnungserklärungen verbrauchen Tokens (was im Widerspruch zum Meta-Harness-Befund steht, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter infrage zu stellen („Warum wurde X ausgeschlossen? Vielleicht brauche es doch noch“). Nicht-essentieller Kontext verschlechtert die Modellleistung, selbst wenn er technisch korrekt ist, und Ausschlussmetadaten sind per Definition nicht-essentiell für die aktuelle Aufgabe.

Die richtige Trennung: **der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Das Memory-Trait-Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abruf-Implementierung protokolliert die gesamte Entscheidung intern: Was wurde zurückgegeben, was wurde ausgeschlossen, warum und was der Agent als Nächstes tat. Der Benchmark-Harness verarbeitet die Logs. Der Agent verarbeitet die Einträge.

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

Der Agent sieht `excluded` nie. Der Benchmark-Harness sieht alles. Wenn `entry_089` die richtige Antwort war und aufgrund seines niedrigen hebbianischen Gewichts herausgefiltert wurde, taucht das im Trace auf, und die nächste Iteration der Abrufpolitik kann nachjustieren.

In Böckelers Taxonomie: Das Memory-Trait ist ein rechnerischer Guide (er bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein rechnerischer Sensor (er beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *dem gefilterten System ist der Ausschluss bewusst*. Es ist bewusstes Filtern im Sinne von *dem Designer ist es bewusst*, durch die Trace-Logs, sodass sich die nächste Iteration des Filters verbessert. Das Bewusstsein liegt beim Harness-Ingenieur, der die Traces liest, nicht beim Agenten, der die Abfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedantische Körperschichten: physisch, energetisch, mental, unterscheidend, Glückseligkeit) eine Hierarchie vom Groben zum Feinen, wobei das Feine „höher“ sei. Harness-Engineering kennt keine solche Wertordnung. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM-as-a-Judge. Böckeler merkt explizit an, dass rechnerische Sensoren billig genug sind, um bei jeder Änderung zu laufen, während inferentielle Kontrollen teuer und probabilistisch sind. In der Praxis will man die „grobe“ Schicht *maximieren*, nicht transzendieren. Die Kosha-Hierarchie ins Harness-Design zu importieren, würde dazu führen, dass man übermäßig in inferentielle Kontrollen investiert und deterministische vernachlässigt. Das Gegenteil von dem, was funktioniert.

Zweitens zielt die yogische Praxis auf Befreiung aus dem Zyklus konditionierter Reaktionen ab. Agentenarchitektur zielt auf eine *effektive* konditionierte Reaktion ab. Man möchte, dass der Agent zuverlässige Muster entwickelt, nicht, dass er sie auflöst. Vairagya im yogischen Sinne bedeutet das Loslassen von *jeder* Bindung. Im Harness-Engineering bedeutet es das Loslassen von *falschen* Bindungen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Die Übernahme des vollständigen soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erlangt, indem er sich weigert, überhaupt etwas abzurufen. Unbrauchbar.

---

## Was das nicht ist

Das ist kein „alte Weisheit bestätigt meine Architektur“. Der kausale Pfeil zeigt in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion hochkomplexe phänomenologische Modelle für Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agentenspeicherforschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering für dasselbe Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Dies ist auch nicht der erste Versuch an dieser Schnittstelle. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya-APO bilden vedantische Bewusstseinszustände (die vier Zustände der Māṇḍūkya Upaniṣad: Wachen, Träumen, Tiefschlaf, transzendent) auf einen Wach-Schlaf-Konsolidierungszyklus für RL-Agenten ab, formalisiert mit Kategorientheorie. Die architektonische Intuition ist solide und die Abbildung ernsthaft. Aber beide Papiere sind explizit konzeptuelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht durchgeführt. Die Lücke zwischen „vorgeschlagenem Rahmenwerk“ und „gemessenem Ergebnis“ ist der Ort, an dem die meiste interdisziplinäre Arbeit stirbt. Die drei Hypothesen unten sind so konzipiert, dass sie dort nicht sterben.

Die nützliche Frage ist nicht „Ist Yoga relevant für KI?“, sondern „Welche spezifischen yogischen Unterscheidungen generieren überprüfbare Hypothesen, die aktuelle Speichersysteme nicht aufstellen?“

Der erste Benchmark hat eine Frage beantwortet. Einheitliche Deduplizierung in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`-Schutzklausel ([PR #359](https://github.com/scrypster/muninndb/pull/359)) hat sie behoben. Zwei Hypothesen bleiben offen. Ergebniskodierter Zerfall (vrtti nirodha) erfordert, dass der synthetische Vault-Generator zeigt, dass einheitlicher Zerfall die Abrufqualität bei Einträgen mit unterschiedlichen Ergebnisverläufen beeinträchtigt. Hebbianische Verdrängung (vairagya) erfordert, dass derselbe Generator misst, ob gestärkte Einträge relevantere Alternativen verdrängen. Beides läuft auf eine Engineering-Aufgabe hinaus: **Das Trace-Schema muss die Abrufgenauigkeit erfasst, aufgeschlüsselt nach Eintrageigenschaften**: Hebbianisches Gewicht, Zugriffshäufigkeit, Ergebnisverlauf. Wenn die Daten ein Problem zeigen, sind die Behebungen unkompliziert. Wenn nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory-Trait gibt Top-k zurück, Punkt. Der Benchmark-Harness erfasst die vollständige Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur schon.

Nichts davon erfordert, an Chakren zu glauben. Es erfordert, die Unterscheidungen als Engineering-Heuristiken ernst zu nehmen und zu messen, ob sie den Agentenabruf bei realistischen Arbeitslasten verbessern. Der erste Benchmark erzwang eine Designänderung. Der synthetische Vault-Generator entscheidet über den Rest.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, rechnerisch, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirischer Nachweis, dass Harness-Änderungen sechsfache Leistungsunterschiede erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), der nächstliegende Stand der Technik, der Vedanta auf Agentenarchitektur abbildet (konzeptionell, noch keine Benchmarks). Yoga Sutras 1.2–1.16, das Aufmerksamkeitsfilter-Modell, das all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), die Behebung der Wertesättigung. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Deduplizierungsschutzklausel. [Hrafn](https://github.com/5queezer/hrafn), die Laufzeitumgebung, die auf einem 10-$-Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige Agenten-Laufzeitumgebung in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*Das Titelbild dieses Beitrags wurde von KI generiert.*