---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben gerade die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Speicherkonsolidierung verschlechterte den Abruf. Drei Designprinzipien aus Agenten‑Speicher‑Benchmarks und ihre überraschenden Parallelen in der yogischen Aufmerksamkeits‑Theorie."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "9bcb9a8379e4ca1b3320a77ddf64bc31"
---
##Where the metaphor breaks

Zwei Stellen, an denen die Analogie scheitert.

Erstens implizieren die [Koshas](https://en.wikipedia.org/wiki/Kosha) (vedantische Körperebenen: physisch, energetisch, mental, discriminierend, glücklich) eine Hierarchie von grob nach subtil, wobei das Subtile „höher“ ist. Bei der Harness‑Engineering‑Thematik gibt es keine solche Wertung. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM‑als‑Richter. Böckeler führt explizit aus, dass computationale Sensoren billig genug sind, um bei jeder Änderung ausgeführt zu werden, während inferentielle Kontrollen teuer und probabilistisch sind. Praktisch will man das „Grosse“ maximieren, nicht darüber transcendieren. Das Importieren der Kosha‑Hierarchie in die Harness‑Design‑Theorie würde dazu führen, dass man zu stark in inferentielle Kontrollen investiert und zu wenig in deterministische ones – das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis darauf ab, aus dem Kreislauf bedingter Reaktion zu befreien. Die Agenten‑Architektur zielt darauf ab, *effektive* bedingte Reaktionen zu entwickeln. Man will, dass der Agent zuverlässige Muster entwickelt, nicht dass er sie auflöst. Vairagya im yogischen Sinne bedeutet Loslassen *aller* Anhaftungen. In der Harness‑Engineering‑Theorie bedeutet das, bestimmte Anhaftungen loszulassen. Das Ziel ist eine bessere Konditionierung, nicht die Abwesenheit von Konditionierung. Das Importieren des gesamten soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erreicht, indem er einfach nichts mehr retrievt. Das wäre nicht hilfreich.

---

## Was das nicht ist

Dies ist nicht „antike Weisheit, die meine Architektur bestätigt“. Der kausale Zusammenhang verläuft in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende hinweg sophisticatede phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agenten‑Gedächtnisforschung vorhersagen, ist keine Mystik, sondern konvergente Ingenieursarbeit an demselben Problem: Wie verwaltet ein begrenztes System unendliche Informationsströme?

Dies ist auch nicht die erste interdisziplinäre Annäherung. Ghosh und Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya-APO ordnen vedantische Bewusstseinszustände (die vier Zustände des Māṇḍūkya Upaniṣad: wach, träumend, tiefschlafen, transzendent) einem Wake‑Sleep‑Konsolidierungszyklus für RL‑Agenten zu, formalisiert mit Kategorientransformationen. Die architektonische Intuition ist fundiert und die Zuordnung ernsthaft, aber beide Papers sind explizit konzeptuelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari‑57, Intel Loihi) wurden noch nicht ausgeführt. Der Unterschied zwischen „vorgeschlagenem Rahmen“ und „gemessenen Ergebnissen“ ist der Ort, an dem die meisten interdisziplinären Arbeiten scheitern. Die drei Hypothesen unten sind so formuliert, dass sie dort nicht scheitern.

Die nützliche Frage ist nicht „ist Yoga relevant für KI?“, sondern „welche spezifischen yogischen Diskriminierungen erzeugen testbare Hypothesen, die aktuelle Gedächtnissysteme nicht stellen?“

Das initiale Benchmark‑Experiment beantwortete eine Frage. Die dedup‑Operation in kleinen Vaults ist schädlich, und der Guard `MinDedupVaultSize` (PR #359) korrigierte das. Zwei Hypothesen bleiben offen. Outcome‑tagged decay (vrtti nirodha) erfordert den synthetischen Vault‑Generator, um zu zeigen, dass uniforme Decay die Abruf‑Qualität für Einträge mit unterschiedlichen Outcome‑Geschichten beeinträchtigt. Hebbian‑Displacement (vairagya) erfordert denselben Generator, um zu messen, ob gestärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine technische Aufgabe: **Das Trace‑Schema muss die Abruf‑Präzision nach Eintragseigenschaften erfassen**: Hebbian‑Gewicht, Zugriffs‑Häufigkeit, Outcome‑Historie. Wenn die Daten ein Problem zeigen, sind die Korrekturen eindeutig. Wenn nicht, werden die Komplexitäten übersprungen.

Pratyahara ist bereits korrekt umgesetzt: die Memory‑Trait‑Schnittstelle gibt immer nur die Top‑k‑Ergebnisse zurück. Der Benchmark‑Harness erfasst die vollständige Entscheidungs‑Logik. Der Agent benötigt keine Informationen darüber, was ausgeschlossen wurde. Der Ingenieur aber schon. Die Trennung ist:

- **Der Agent sieht nur die Top‑k‑Ergebnisse.**  
- **Der Benchmark‑Harness sieht alles.**

Die Memory‑Trait‑Schnittstelle bleibt schlank: `retrieve → Vec<Entry>`. Aber die Implementierung des Abrufs protokolliert die vollständige Entscheidung intern: Was wurde zurückgegeben, was wurde ausgeschlossen, warum, und welcheaktion des Agents folgte. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

Ein Trace‑Eintrag sieht so aus:

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

Der Agent sieht nie `excluded`. Der Benchmark‑Harness sieht alles. Wenn `entry_089` die richtige Antwort war und wegen niedrigem Hebbian‑Gewicht gefiltert wurde, erscheint das im Trace, und die nächste Iteration der Abruf‑Policy kann sich daran anpassen.

In Böckelers Taxonomie: die Memory‑Trait ist ein computacionaler Guide (bestimmt, was in den Kontext gelangt). Der Trace‑Log ist ein computacionaler Sensor (beobachtet, was geschah). Sie fusionieren nicht. Pratyahara ist nicht bewusstes Filtern im Sinne einer Filter‑Bewusstheit, sondern bewusstes Filtern im Sinne des Designers, der durch die Traces informiert ist, sodass die nächste Iteration des Filters improves. Das Bewusstsein gehört dem Harness‑Engineers, der die Traces liest, nicht dem Agenten, der Abfragen ausführt.

---

## Der Einfluss des Weglassens (Pratyahara)

Meta‑Harness’ überraschendstes Ergebnis: die siegreichen Harnesses packen das Kontextfenster nicht mit allem, was verfügbar ist. Der Text‑Klassifikations‑Sieg nutzt TF‑IDF mit kontrastiven Paaren und Label‑Priming (48,6 % Genauigkeit, 4× weniger Tokens als der Zweitplatzierte). Der mathematische‑Abruf‑Sieg ist ein vier‑route BM25‑Programm mit lexikalischen Prädikaten. Einfache Selektions‑Policies. Keine exotischen Architekturen. Ein Wechsel am Harness um ein festes LLM herum erzeugt einen 6×‑Leistungsunterschied im gleichen Benchmark.

Böckeler formuliert es als „keep quality left“: Je früher gefiltert wird, desto günstiger und zuverlässiger das downstream Resultat. Ihre computativen Leitlinien (Linter, Schemen, CLAUDE.md‑Regeln) verhindern ganze Kategorien von Informationen, die überhaupt erst zum Modell gelangen. Der `MinDedupVaultSize`‑Guard aus PR #359 ist dasselbe Prinzip: Statt dedup auf jedem Vault auszuführen und zu hoffen, dass das Modell mit den degraded Ergebnissen umgeht, lernte das System, *keine* dedup‑Operation in kleinen Vaults durchzuführen. Ausschluss eines Prozesses, nicht nur von Daten.

Die erste Version dieses Posts argumentierte, dass die Memory‑Trait‑Schnittstelle Rejection‑Metadaten neben den Ergebnissen zurückgeben sollte: „Diese 3 Einträge haben gepasst, und diese 5 wurden ausgeschlossen wegen X.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip von [pratyahara](https://en.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) erklärt warum. Pratyahara wird oft als „Sinnenentzug“ übersetzt, was irreführend ist. Es geht nicht um Blindheit. Es geht um *selektive Aufmerksamkeit*. Die Sinne funktionieren immer noch. Es wird nur entschieden, was ins Bewusstsein gelangt, anstatt auf jedes ankommende Stimulus zu reagieren. Man entscheidet, was eintritt, nicht dass alles eintritt.

Wenn man dem LLM sagt „hier sind 5 Dinge, die ich dir bewusst nicht zeige“, hat man dem das Objekt gezeigt und eine Verbotsregel angehängt. Das ist kein Sinnenentzug, das ist ein Reiz mit einer Warnung. Wer meditiert kennt das Ergebnis: „denk nicht an ein weißes Elefant“ garantiert, dass man daran denkt. Konkret: Ausschluss‑Erklärungen verbrauchen Tokens (was der Meta‑Harness‑Befund widerlegt, dass einfache Harnesses besser funktionieren) und laden das Modell ein, die Filterung zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich das doch“). Nicht‑essentieller Kontext degradiert die Modell‑Leistung, selbst wenn er technisch korrekt ist, und Ausschluss‑Metadaten sind per Definition nicht essentiell für die Aufgaben, die wir lösen.

Der richtige Trenn‑Ansatz: **Der Agent sieht nur die Top‑k‑Ergebnisse. Der Benchmark‑Harness sieht alles.** Die Memory‑Trait‑Schnittstelle bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abruf‑Implementierung protokolliert intern die vollständige Entscheidung: Was wurde zurückgegeben, was wurde ausgeschlossen, warum, und welcheaktion des Agents folgte. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

Ein Trace‑Eintrag sieht so aus:

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

Der Agent sieht nie `excluded`. Der Benchmark‑Harness sieht alles. Wenn `entry_089` die richtige Antwort war und wegen niedrigem Hebbian‑Gewicht gefiltert wurde, taucht das im Trace auf, und die nächste Iteration der Retrieval‑Policy kann sich daran anpassen.

In Böckelers Taxonomie: die Memory‑Trait ist ein computacionaler Guide (sie bestimmt, was in den Kontext gelangt). Der Trace‑Log ist ein computacionaler Sensor (er beobachtet, was geschah). Sie fusionieren nicht. Pratyahara ist nicht bewusstes Filtern im Sinne einer filter‑bewussten Interne‑Wahrnehmung, sondern bewusstes Filtern im Sinne des Designers, der durch die Logs informiert ist, sodass die nächste Iteration des Filters verbessert wird. Das Bewusstsein gehört dem Harness‑Engineer, der die Logs liest, nicht dem Agenten, der Abfragen ausführt.

---

## Wo die Analogie scheitert – Fortsetzung

## 1. Nicht alles ist gleiches „Rauschen“ (Vrtti Nirodha)

Bevor das dedup‑Versagen sichtbar wurde, traf [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ein grundlegteres Problem. Die ACT‑R‑Scoring‑Methode von MuninnDB ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) clampte frische Einträge auf raw = 1,0, sodass alle Retrieval‑Scores identisch bei 0,9000 wurden. Das System konnte signal von Rauschen nicht mehr unterscheiden. Jede Eingabe sah gleich relevant aus. Nach der Korrektur ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Score‑Bereich auf 0,18–0,90 und die korrekte Top‑1‑Retrieval‑Rate stieg auf 5/5 Abfragen. Die einheitliche Behandlung aller Einträge zerstörte die Retrieval‑Qualität.

Meta‑Harness bestätigte das gleiche Muster auf einer anderen Skala. deren [kritische Ablations‑Tabelle 3](https://arxiv.org/abs/2603.28052) verglich drei Stufen des Informationszugriffs für den Harness‑Optimierer:

| Condition            | Median Accuracy | Best Accuracy |
|----------------------|-----------------|---------------|
| Scores only          | 34.6 %          | 41.3 %        |
| Scores + LLM summary | 34.9 %          | 38.7 %        |
| Full raw traces      | 50.0 %          | 56.7 %        |

LLM‑generierte Zusammenfassungen schnitten *schlechter* ab als die rohen Scores allein (beste Genauigkeit 38,7 % vs. 41,3 %). Vollständige rohe Spuren erzielten 56,7 %. Die Zusammenfassungen collapseddiagnostisches Signal zusammen mit Rauschen, zerstörten also die Information, die der Optimierer benötigte. Bei Text‑Klassifikation erreichte Meta‑Harness 48,6 % gegen ACEs 40,9 % bei Nutzung von 4× weniger Kontext‑Tokens. Der entscheidende Zug war nicht mehr Information, sondern bessere *Auswahl* von Information.

Der Design‑Prinzip: Undifferenzierte Behandlung von Einträgen zerstört Retrieval‑Qualität, egal ob das Treatment uniforme Bewertung, verlustbehaftete Zusammenfassung oder uneingeschränkte dedup ist.

Yoga Sutras 1.2 definiert Yoga als *chitta vrtti nirodha*, das cessation of fluctuations in the mind‑field. Patanjali sagt nicht „lösche alles“. Er unterscheidet [*kleshas*](https://en.wikipedia.org/wiki/Klesha_(Hinduism)) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissen, Angst vor dem Tod) von [*pramanas*](https://en.wikipedia.org/wiki/Pramana) (gültige Kognition: direkte Wahrnehmung, Schlussfolgerung, Zeugnis). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, bewahre das Signal. Der Score‑Sättigungs‑Bug war ein Versagen, diese Unterscheidung zu treffen. Jede vrtti sah gleich aus.

Der Design‑Implication für MuninnDB: Decay‑Floors sollten sich nach Outcome, nicht nur nach Zugriffshäufigkeit richten. Ein verifizierter API‑Muster und ein gescheiterter curl‑Versuch können identische Retrieval‑Raten haben, aber radikal unterschiedliche Retentions‑Werte. Man könnte versuchen, Einträge vornherein als pramana oder klesha (verifiziert vs. verzerrt) zu klassifizieren, aber diese Klassifizierung ist selbst das schwierige Problem. Für die meisten Einträge erfordert sie semantische Urteile, das heißt ein LLM im Decay‑Pfad, was die Consolidierung teuer und nichtdeterministisch macht.

Der einfachere Weg: **Outcome‑tagged writes**. Wenn ein Agent einen Eintrag retrieves und die folgende Aktion erfolgreich ist, bekommt der Eintrag ein `outcome: success` Signal. Schlägt die Aktion fehl, bekommt er `outcome: failure`. Die Decay‑Floor koppelt sich an die Erfolgsrate, nicht an eine epistämische Kategorie. Das ist im Prinzip Bandit‑Feedback für Retrieval, ein etabliertes Konzept in der Informations‑Retrieval‑Forschung, angewendet auf persistentes Agenten‑Gedächtnis. Kein Ontologie‑Ansatz nötig. Kein LLM im Loop. Man muss die vrtti nicht vorher klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Retention bestimmen. Es wird keine Vorab‑Kategorie für das Rauschen benötigt.

---

## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei State‑of‑the‑Art‑Gedächtnissysteme (A‑Mem, Mem0, MemoryOS) gegen naiven RAG‑Baselines, die einfach rohe Kontext‑Daten abrufen. Keines der fortschrittlichen Systeme schlägt die Baselines konsistent. Das spezifische Versagen: Diese Systeme können prozedurales Gedächtnis (Feedback‑Logs zur System‑Performance) nicht nutzen. Sie behandeln alle Eingaben als deklaratives Wissen und ignorieren Signale, die hätten zeigen können, welche Erinnerungen tatsächlich nützlich sind.

MuninnDBs Benchmark #311 produzierte ein lokales Äquivalent des gleichen Problems. Phase‑2‑dedup identifizierte und merge‑te korrekt drei farblich variante Duplikate (cosine ≥ 0,95). Aber im 13‑Einträge‑Vault veränderte das Entfernen dieser Einträge den Normalisierungs‑Anker. Ein unrelated Eintrag wurde zur Referenz, drückte relevante Ergebnisse nach unten in der Rangliste. Eine gültige Consolidierung, einheitlich angewendet, verdrängte die richtige Antwort.

Böckelers [Harness‑Engineering‑Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt den strukturellen Missstand. Sie unterscheidet computationale Sensoren (deterministisch, billig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Dedup bei cosine ≥ 0,95 ist ein computationaler Prozess. Die Frage, wann dedup schadet, erfordert inferenzielle Urteilskraft: „Diese Einträge sind ähnlich, aber ist das Entfernen hier sicher?“ Kein Schwellenwert kann das beantworten.

Die [Yoga Sutras](https://en.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) benennen dieselbe Dynamik. [Samskaras](https://en.wikipedia.org/wiki/Samskara_(Indian_philosophy)) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Rinne. MuninnDB implementiert das direkt: Einträge, die ko‑aktivieren, stärken ihre Assoziationsgewichte. Die Sutras warnen, dass Samskaras sich compoundsen. Ohne das Gegengewicht von [*vairagya*](https://en.wikipedia.org/wiki/Vairagya) (Nicht‑Anhaftung, die Fähigkeit, starke Assoziationen loszulassen) geraten sie zu [*vasanas*](https://en.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die das bewusste Evaluieren umgehen. Man hört auf, die Situation zu sehen, und startet einfach das Skript.

Das fehlende Mechanismus ist explizites Hebbian *weakening*: nicht nur passiver Zerfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag ein falsches Retrieval erzeugt. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse zwangen zu einer Korrektur (dem `MinDedupVaultSize` Guard). Die nächste Messung erfordert den synthetischen Vault‑Generator mit gekennzeichneten Einträgen: Duplicate, Near‑duplicate, Temporal update, Unique fact, Low‑access unique, Legal‑scoped, Legal‑adjacent. Der schärfere Metrik ist *displacement rate*: Wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren aus den Top‑k? Das ist die direkte Vasana‑Messung: nicht nur „falscher Eintrag retrieved“, sondern „richtiger Eintrag verdrängt von habitualer Retrieval“. Wenn gestärkte Einträge messbare Displacement erzeugen, ist Vairagya als Design‑Primitive empirisch gerechtfertigt. Wenn nicht, reicht die passive Decay aus und wir überspringen die Komplexität.

**Update (2026‑04‑08):** Die Dream Engine Phase 2‑Ablations‑Studie ([PR #367](https://github.com/scrypster/muninndb/pull/367)) liefert konkrete Zahlen. 50 Optuna‑Trials über 255 Phase‑Kombinationen, validiert auf 6 GoodAI LTM‑Datensätzen mit Gemini 3.1 Flash Lite:

| Phase                     | Avg Delta | Verdict |
|---------------------------|-----------|---------|
| 5 Transitive Inference    | +0,022    | Hilfreich |
| 0 Orient                  | +0,007    | Hilfreich |
| 2 Semantic Dedup          | +0,006    | Hilfreich |
| 4 Bidirectional Stability | -0,014    | Schädlich |
| 2b LLM Adjudication       | -0,011    | Schädlich |
| 1 Relevance Decay         | -0,011    | Schädlich |

Phase 4 (Stabilitäts‑Adjustments, das Samskara‑Stärkungs‑Mechanismus) ist die zerstörerischste Phase. Der empirische Fall für Vairagya als Design‑Primitive ist bestätigt: unkontrolliertes Verstärken schadet der Retrieval‑Qualität. Die Daten deuten jedoch darauf hin, dass die einfachere Lösung ist, das Verstärken ganz zu lassen, statt ein komplexes Gegengewicht zu bauen. scrypster’s [Review](https://github.com/scrypster/muninndb/pull/367#issuecomment) erreichte dieselbe Schlussfolgerung: Nur die positiven‑Delta‑Phasen (0, 2, 5) ausliefern, écrire die Schreib‑Pfade bis LocOMo und LongMemEval‑Validierung ausstehen. 

---

## 3. Der Einfluss bewussten Ausschlusses (Pratyahara)

Meta‑Harness’ überraschendstes Ergebnis: die siegreichen Harnesses packen das Kontextfenster nicht mit allem Vollen zu. Der Text‑Klassifikations‑Sieg nutzt TF‑IDF mit kontrastiven Paaren und Label‑Priming (48,6 % Genauigkeit, 4× weniger Tokens als der Zweitplatzierte). Der mathematische‑Abruf‑Sieg ist ein vier‑route BM25‑Programm mit lexikalischen Prädikaten. Einfache Selektions‑Policies. Keine exotischen Architekturen. Ein Wechsel am Harness um ein festes LLM herum erzeugt einen 6×‑Leistungsunterschied im gleichen Benchmark.

Böckeler formuliert es als „keep quality left“: Je früher gefiltert wird, desto günstiger und zuverlässiger das downstream Resultat. Ihre computativen Leitlinien (Linter, Schemen, CLAUDE.md‑Regeln) verhindern ganze Kategorien von Informationen, die überhaupt erst zum Modell gelangen. Der `MinDedupVaultSize`‑Guard aus PR #359 ist dasselbe Prinzip: Statt dedup auf jedem Vault auszuführen und zu hoffen, dass das Modell mit den degraded Ergebnissen umgeht, lernte das System, *keine* dedup‑Operation in kleinen Vaults durchzuführen. Ausschluss eines Prozesses, nicht nur von Daten.

Die erste Version dieses Posts argumentierte, dass die Memory‑Trait‑Schnittstelle Rejection‑Metadaten neben den Ergebnissen zurückgeben sollte: „Diese 5 Einträge haben gepasst, und diese 3 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klang vernünftig.

Es ist falsch, und das yogische Prinzip von [pratyahara](https://en.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) erklärt warum. Pratyahara wird oft als „Sinnenentzug“ übersetzt, was irreführend ist. Es geht nicht um Blindheit. Es geht um *selektive Aufmerksamkeit*. Die Sinne funktionieren weiter. Es wird nur entschieden, was ins Bewusstsein gelangt, anstatt auf jedes ankommende Stimulus zu reagieren. Wenn man dem LLM sagt „hier sind 5 Dinge, die ich dir bewusst nicht zeige“, hat man das Objekt gezeigt und eine Verbotsregel angehängt. Das ist kein Sinnenentzug, das ist ein Reiz mit einer Warnung. Wer meditiert kennt das Ergebnis: „denk nicht an ein weißes Elefant“ garantiert, dass man daran denkt. Konkret: Ausschluss‑Erklärungen verbrauchen Tokens (was der Meta‑Harness‑Befund widerlegt, dass einfache Harnesses besser funktionieren) und laden das Modell ein, die Filterung zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich das doch“). Nicht‑essentieller Kontext degradiert die Modell‑Leistung, selbst wenn er technisch korrekt ist, und Ausschluss‑Metadaten sind per Definition nicht essentiell für die Aufgabe.

Der richtige Trenn‑Ansatz: **Der Agent sieht nur die Top‑k‑Ergebnisse. Der Benchmark‑Harness sieht alles.** Die Memory‑Trait‑Schnittstelle bleibt schlank: `retrieve → Vec<Entry>`. Aber die Implementierung protokolliert intern die vollständige Entscheidung: Was wurde zurückgegeben, was wurde ausgeschlossen, warum, und welcheaktion des Agents folgte. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

Ein Trace‑Eintrag sieht so aus:

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

Der Agent sieht nie `excluded`. Der Benchmark‑Harness sieht alles. Wenn `entry_089` die richtige Antwort war und wegen niedrigem Hebbian‑Gewicht gefiltert wurde, erscheint das im Trace, und die nächste Iteration der Retrieval‑Policy kann sich daran anpassen.

In Böckelers Taxonomie: die Memory‑Trait ist ein computacionaler Guide (bestimmt, was in den Kontext gelangt). Der Trace‑Log ist ein computacionaler Sensor (beobachtet, was geschah). Sie fusionieren nicht. Pratyahara ist nicht bewusstes Filtern im Sinne einer filter‑bewussten Internen‑Wahrnehmung, sondern bewusstes Filtern im Sinne des Designers, der durch die Logs informiert ist, sodass die nächste Iteration des Filters verbessert wird. Das Bewusstsein gehört dem Harness‑Engineer, der die Logs liest, nicht dem Agenten, der Abfragen ausführt.

---

## Wo die Analogie scheitert – Fazit

Zwei Stellen, an denen die Analogie scheitert.

Erstens implizieren die [Koshas](https://en.wikipedia.org/wiki/Kosha) (vedantische Körperebenen: physisch, energetisch, mental, discriminierend, glücklich) eine Hierarchie von grob nach subtil, wobei das Subtile „höher“ ist. Bei der Harness‑Engineering‑Thematik gibt es keine solche Wertung. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM‑als‑Richter. Böckeler führt explizit aus, dass computationale Sensoren billig genug sind, um bei jeder Änderung ausgeführt zu werden, während inferentielle Kontrollen teuer und probabilistisch sind. Praktisch will man das „Grosse“ maximieren, nicht darüber transcendieren. Das Importieren der Kosha‑Hierarchie in die Harness‑Design‑Theorie würde dazu führen, dass man zu stark in inferentielle Kontrollen investiert und zu wenig in deterministische ones – das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis darauf ab, aus dem Kreislauf bedingter Reaktion zu befreien. Die Agenten‑Architektur zielt darauf ab, *effektive* bedingte Reaktionen zu entwickeln. Man will, dass der Agent zuverlässige Muster entwickelt, nicht dass er sie auflöst. Vairagya im yogischen Sinne bedeutet Loslassen *aller* Anhaftungen. In der Harness‑Engineering‑Theorie bedeutet das, bestimmte Anhaftungen loszulassen. Das Ziel ist eine bessere Konditionierung, nicht die Abwesenheit von Konditionierung. Das Importieren des gesamten soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erreicht, indem er einfach nichts mehr retrievt. Das wäre nicht hilfreich.

---

## Was das nicht ist

Dies ist nicht „antike Weisheit, die meine Architektur bestätigt“. Der kausale Zusammenhang verläuft in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende hinweg sophisticatede phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agenten‑Gedächtnisforschung vorhersagen, ist keine Mystik, sondern konvergente Ingenieursarbeit an demselben Problem: Wie verwaltet ein begrenztes System unendliche Informationsströme?

Dies ist auch nicht die erste interdisziplinäre Annäherung. Ghosh und Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya‑APO ordnen vedantische Bewusstseinszustände (die vier Zustände des Māṇḍūkya Upaniṣad: wach, träumend, tiefschlafen, transzendent) einem Wake‑Sleep‑Konsolidierungszyklus für RL‑Agenten zu, formalisiert mit Kategorientransformationen. Die architektonische Intuition ist fundiert und die Zuordnung ernsthaft, aber beide Papers sind explizit konzeptuelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari‑57, Intel Loihi) wurden noch nicht ausgeführt. Der Unterschied zwischen „vorgeschlagenem Rahmen“ und „gemessenen Ergebnissen“ ist der Ort, an dem die meisten interdisziplinären Arbeiten scheitern. Die drei Hypothesen unten sind so formuliert, dass sie dort nicht scheitern.

Die nützliche Frage ist nicht „ist Yoga relevant für KI?“, sondern „welche spezifischen yogischen Diskriminierungen erzeugen testbare Hypothesen, die aktuelle Gedächtnissysteme nicht stellen?“

Das initiale Benchmark‑Experiment beantwortete eine Frage. Die dedup‑Operation in kleinen Vaults ist schädlich, und der Guard `MinDedupVaultSize` (PR #359) korrigierte das. Zwei Hypothesen bleiben offen. Outcome‑tagged decay (vrtti nirodha) erfordert den synthetischen Vault‑Generator, um zu zeigen, dass uniforme Decay die Abruf‑Qualität für Einträge mit unterschiedlichen Outcome‑Geschichten beeinträchtigt. Hebbian‑Displacement (vairagya) erfordert denselben Generator, um zu messen, ob gestärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine technische Aufgabe: **Das Trace‑Schema muss die Abruf‑Präzision nach Eintragseigenschaften erfassen**: Hebbian‑Gewicht, Zugriffs‑Häufigkeit, Outcome‑Historie. Wenn die Daten ein Problem zeigen, sind die Korrekturen eindeutig. Wenn nicht, werden die Komplexitäten übersprungen.

Pratyahara ist bereits korrekt umgesetzt: die Memory‑Trait gibt immer nur die Top‑k‑Ergebnisse zurück. Der Benchmark‑Harness erfasst die vollständige Entscheidungs‑Logik. Der Agent benötigt keine Informationen darüber, was ausgeschlossen wurde. Der Ingenieur aber schon. Die Trennung ist:

- **Der Agent sieht nur die Top‑k‑Ergebnisse.**  
- **Der Benchmark‑Harness sieht alles.**

Die Memory‑Trait‑Schnittstelle bleibt schlank: `retrieve → Vec<Entry>`. Aber die Implementierung des Abrufs protokolliert intern die vollständige Entscheidung: Was wurde zurückgegeben, was wurde ausgeschlossen, warum, und welcheaktion des Agents folgte. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

Ein Trace‑Eintrag sieht so aus:

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

Der Agent sieht nie `excluded`. Der Benchmark‑Harness sieht alles. Wenn `entry_089` die richtige Antwort war und wegen niedrigem Hebbian‑Gewicht gefiltert wurde, erscheint das im Trace, und die nächste Iteration der Retrieval‑Policy kann sich daran anpassen.

In Böckelers Taxonomie: die Memory‑Trait ist ein computacionaler Guide (sie bestimmt, was in den Kontext gelangt). Der Trace‑Log ist ein computacionaler Sensor (er beobachtet, was geschah). Sie fusionieren nicht. Pratyahara ist nicht bewusstes Filtern im Sinne einer filter‑bewussten Internen‑Wahrnehmung, sondern bewusstes Filtern im Sinne des Designers, der durch die Logs informiert ist, sodass die nächste Iteration des Filters verbessert wird. Das Bewusstsein gehört dem Harness‑Engineer, der die Logs liest, nicht dem Agenten, der Abfragen ausführt.

---

## Wo die Analogie bricht – Weiterführende Literatur

[Böckelers Harness‑Engineering‑Framework](https://martinfowler.com/articles/harness-engineering.html), das Taxonomiemodell (Guides, Sensors, Computational, Inferential). [Meta‑Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirische Evidenz, dass Harness‑Änderungen 6×‑Leistungslücken erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), das nächste prior emapping Vedanta zu Agenten‑Architektur (konzeptionell, ohne Benchmarks). Yoga Sutras 1.2‑1.16, das Aufmerksamkeits‑Filtermodell, das allen vorausging. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die initialen Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), der Score‑Saturation‑Fix. [PR #359](https://github.com/scrypster/muninndb/pull/359), der dedup‑Guard. [Hrafn](https://github.com/5queezer/hrafn), das Runtime, das auf einem $10 Raspberry Pi läuft.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), ein leichtgewichtiges Agenten‑Runtime in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*Das Titelbild dieses Posts wurde von KI generiert.*