---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
series: ["Building Agents That Sleep"]
series_weight: 4
description: "Speicherkonsolidierung verschlechterte die Abrufbarkeit. Drei Gestaltungskriterien aus Agenten‑Gedächtnis‑Benchmarks und ihre unerwarteten Parallelen zur Aufmerksamkeitstheorie des Yogas."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "4267ebbf3816e448aba743898377aee0"
chunkHashes: "71f5185efef748fa,00217735d7922f24,4ff29492163683f6,76193dd6126e8e55,797db2615cbff326,d4e931c16fb32a74,4b8f77dd0376513a"
---
[MuninnDB](https://github.com/scrypster/muninndb)'s Konsolidierungssystem führte drei farbvarianten Duplicate Engrams exakt wie geplant (Kosinusähnlichkeit >= 0.95) zusammen. Der Abruf wurde schlechter. In einem 13-Engram-Vault führte das Entfernen von Duplikaten dazu, dass der Normalisierungspunkt verschoben wurde und relevante Ergebnisse in der Rangliste nach unten gedrängt wurden. Die Lösung war ein Guard Clause: `MinDedupVaultSize` (default 20), das Phase 2 dedup in kleinen Vaults überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Problem.

Der Fehler war kein Bug im dedup-Algorithmus. Es war ein Versagen des *discernment*: eine gültige Konsolidierungsoperation, die in einem Kontext angewendet wurde, wo sie Schaden verursachte. Wann konsolidiert man, wann lässt man es bleiben, was zählt als Rauschen vs. Signal. Das Problem hat eine lange Geschichte außerhalb der Informatik. Ich habe drei spezifische Gestaltungsideen in den [Yoga Sutras](https://de.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) gefunden, die empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [harness engineering framework](https://martinfowler.com/articles/harness_engineering.html) abbilden.

**Die kontemplativen Traditionen entwickelten raffinierte Modelle der Aufmerksamkeitsfilterung. Einige dieser Modelle generieren testbare Hypothesen, die die aktuelle Agenten‑Gedächtnis‑Literatur nicht zulässt.**
## 1. Nicht alles Rauschen ist gleich (Vrtti Nirodha)

Bevor der Dedup‑Fehler auftrat, traf **benchmark #311** ([https://github.com/scrypster/muninndb/issues/311](https://github.com/scrypster/muninndb/issues/311)) ein grundlegenderes Problem. Die ACT‑R‑Bewertung von MuninnDB ([issue #331](https://github.com/scrypster/muninndb/issues/331)) klammerte frische Engramme auf `raw=1.0`, sodass alle Abruf‑Scores identisch bei 0.9000 wurden. Das System konnte Signale von Rauschen nicht mehr unterscheiden. Jeder Eintrag erschien gleich relevant. Nach der Behebung ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Score‑Bereich auf 0.18‑0.90 und die korrekte Top‑1‑Abrufung erreichte 5/5 Abfragen. Die einheitliche Behandlung von Einträgen zerstörte die Abruf‑Qualität.

Meta‑Harness bestätigte das gleiche Muster in anderer Größe. Ihre [kritische Abtastung (Table 3)](https://arxiv.org/abs/2603.28052) verglich drei Levels des Information‑Zugriffs für den Optimierer des Harness‑Optimizers:

| Condition | Median Accuracy | Best Accuracy |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM‑generierte Zusammenfassungen performten *schlechter* als reine Scores alleine (beste Accuracy 38.7% vs. 41.3%). Vollständige Roh‑Traces brachten 56.7%. Die Zusammenfassungen kollabierten diagnostisches Signal zusammen mit Rauschen und zerstörten damit die Information, die der Optimierer benötigte. Bei Textklassifikation erreichte Meta‑Harness 48.6 % gegenüber 40.9 % von ACE, wobei lediglich 4‑fache weniger Kontext‑Tokens verwendet wurden. Der entscheidende Schritt war nicht mehr Information, sondern eine bessere *Auswahl* von Information.

Der Gestaltungshinweis: ununterscheidbare Behandlung von Einträgen zerstört die Abruf‑Qualität, sei es durch einheitliche Bewertung, verlustbehaftete Zusammenfassung oder unvoreingenommene Dedup.

Das Yoga‑Sutra 1.2 definiert Yoga als *chitta vrtti nirodha*, die Aufhebung der Schwankungen im Geistfeld. Patanjali sagt nicht „lösche alles“. Er unterscheidet [*kleshas*](https://en.wikipedia.org/wiki/Kleshas_(Hinduism)) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissen, Todesangst) von [*pramanas*](https://en.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugnis). Die Praxis ist chirurgisch: Verzerrungen reduzieren, Signal erhalten. Der Score‑Sättigungs‑Bug war ein Versagen des Systems, diese Unterscheidung zu treffen. Jede vrtti sah gleich aus.

Die Design‑Implikation für MuninnDB: Abfall‑Böden sollten das Ergebnis, nicht nur die Zugriffsfrequenz, widerspiegeln. Ein verifiziertes API‑Muster und ein gescheiterter `curl`‑Aufruf können identische Abrufraten, aber radikal unterschiedliche Verwertungs­werte haben. Man könnte versuchen, Einträge von vornherein als pramana oder klesha (verifiziert vs. verzerrt) zu klassifizieren, doch genau das ist das schwierige Problem. Für die meisten Einträge bedarf es einer semantischen Bewertung, also eines LLM im Abfallpfad, was Konsolidierung teuer und nondeterministisch macht.

Der einfachere Weg: **outcome‑tagged writes**. Wenn ein Agent einen Eintrag abruft und die darauffolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`‑Signal. Scheitert die Aktion, wird `outcome: failure` gesetzt. Der Abfall‑Boden koppelt sich an die Erfolgsrate, nicht an eine epistemische Kategorie. Das ist im Prinzip Bandit‑Feedback beim Abruf, ein Konzept, das bereits in der Informationsrückgewinnung etabliert ist, und wird hier auf dauerhafte Agent‑Memory angewendet. Keine Ontologie nötig. Kein LLM im Loop. Man muss die vrtti nicht zuvor klassifizieren. Man beobachtet deren Wirkung und lässt diese Beobachtung die Retention bestimmen.
## 1.Nicht alles Rauschen ist gleich (Vrtti Nirodha)

Bevor der Dedup‑Fehler auftrat, stieß [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) auf ein grundlegenderes Problem. Die ACT‑R‑Bewertung von MuninnDB ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) clampfte frische Engramme auf `raw=1.0`, sodass alle Abrufscores identisch bei 0,9000 wurden. Das System konnte Signal und Rauschen nicht unterscheiden. Jeder Eintrag erschien gleich relevant. Nach der Behebung ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Score‑Bereich auf 0,18‑0,90 und die korrekte Top‑1‑Abruf‑Rate erreichte 5 von 5 Abfragen. Die einheitliche Behandlung von Einträgen zerstörte die Abrufqualität.

Meta‑Harness bestätigte das gleiche Muster in einem anderen Maßstab. Ihre [kritische Abtastung (Table 3)](https://arxiv.org/abs/2603.28052) verglich drei Ebenen des Informationszugriffs für den Harness‑Optimierer:

| Bedingung | Median‑Akkurazität | Beste Akkurazität |
|---|---|---|
| Scores nur | 34,6 % | 41,3 % |
| Scores + LLM‑Zusammenfassung | 34,9 % | 38,7 % |
| Vollständige Roh‑Spuren | 50,0 % | 56,7 % |

LLM‑generierte Zusammenfassungen schnitten *schlechter* ab als reine Scores allein (beste Akkurazität 38,7 % vs 41,3 %). Vollständige Roh‑Spuren erzielten 56,7 %. Die Zusammenfassungen ließen diagnostisches Signal zusammen mit Rauschen untergehen und zerstörten die Informationen, die der Optimierer benötigte. Bei Textklassifikation erreichte Meta‑Harness 48,6 % gegenüber 40,9 % von ACE, wobei nur ein Viertel des Kontext‑Tokens verwendet wurde. Der entscheidende Schritt war nicht mehr Informationen, sondern eine bessere *Auswahl* an Informationen.

Das Gestaltungskonzept: Die indiscriminate **Behandlung von Einträgen** zerstört die Abrufqualität, egal ob das durch einheitliche Bewertung, verlustbehaftete Zusammenfassung oder ununterscheidbare Dedupierung geschieht.

Yoga‑Sutra 1.2 definiert Yoga als *chitta vrtti nirodha*, die Aufhebung der Schwankungen im Bewusstseinsfeld. Patanjali sagt nicht „lösche alles“. Er unterscheidet [*kleshas*](https://de.wikipedia.org/wiki/Klesha_(Hinduism)) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissen, Todesangst) von [*pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugnis). Die Praxis ist chirurgisch: Man reduziert die Verzerrungen, bewahrt aber das Signal. Der Score‑Sättigungs‑Bug war, dass das System diese Unterscheidung nicht traf. Jeder vrtti sah gleich aus.

Designimplikation für MuninnDB: Abschwellschwellen sollten das Ergebnis, nicht nur die Zugriffsfrequenz, widerspiegeln. Ein verifiziertes API‑Muster und ein fehlgeschlagener curl‑Versuch können identische Abrufraten, aber radikal unterschiedliche Rückhaltewerte haben. Man könnte versuchen, Einträge vorher als pramana oder klesha (verifiziert vs. verzerrt) zu klassifizieren, aber diese Klassifizierung ist selbst das schwierige Problem. Für die meisten Einträge erfordert sie semantische Bewertung, was einen LLM im Abklingpfad bedeutet und die Konsolidierung teuer sowie nicht deterministisch macht.

Der einfachere Weg: **outcome-tagged writes**. Wenn ein Agent einen Eintrag abruft und die darauffolgende Aktion erfolgreich ist, erhält der Eintrag ein Signal `outcome: success`. Bei einer fehlgeschlagenen Aktion wird `outcome: failure` gesetzt. Der Abklingschwellenwert koppelt sich an die Erfolgsrate, nicht an eine epistemische Kategorie. Das ist im Wesentlichen Banditen‑Feedback beim Abruf, ein Konzept, das bereits in der Informationssuche etabliert ist, und wird hier auf persistente Agenten‑Speicher angewendet. Es ist keine Ontologie nötig. Kein LLM im Loop. Man muss die vrtti nicht vorher klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Rückhalteentscheidung bestimmen.
## 2. Stärkung benötigt ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei State‑of‑the‑art‑Speichersysteme (A‑Mem, Mem0, MemoryOS) gegen naive RAG‑Baselines, die einfach aus rohem Kontext abrufen. Keines der fortgeschrittenen Systeme übertrumpfte die Baselines konsistent. Der spezifische Versagermodus: Diese Systeme konnten prozedurales Gedächtnis (Rückmeldungsprotokolle, die die Leistungshistorie des Systems anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen hätten sagen sollen, welche Erinnerungen tatsächlich nützlich waren.

MuninnDB‑Benchmark #311 produzierte eine lokale Version des gleichen Problems. Phase 2 identifizierte und mergte drei farbvarianten‑Duplikate korrekt (Kosinussimilarität ≥ 0.95). Aber das Entfernen dieser Einträge veränderte den Normalisierungskern. Ein unrelated‑gramm wurde zum Referenzpunkt, drückte relevante Ergebnisse in der Rangfolge nach unten. Eine gültige Konsolidierungsoperation, einheitlich angewendet, verdrängte die richtige Antwort.

Böcklers [harness engineering taxonomy](https://martinfowler.com/articles/harness-engineering.html) erklärt den strukturellen Missstand. Sie unterscheidet computergestützte Sensoren (deterministisch, billig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Dedup bei Kosinussimilarität ≥ 0.95 ist ein computergestützter Prozess. Die Feststellung, wann dedup schadet, erfordert inferierendes Urteilsvermögen: „Diese Einträge sind ähnlich, aber ist das Entfernen davon *sicher* in diesem Vault?“ Keine Similarity‑Schwelle kann das beantworten.

Die [Yoga Sutras](https://de.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara_(Indian_philosophy)) sind latenten Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt einen Abdruck, und wiederholte Erfahrungen vertiefen die Rinne. MuninnDB implementiert das direkt: Koaktivierte Einträge stärken ihre Assoziationsgewichte. Die Sutras warnen, dass Samskaras sich verstärken. Ohne das Gegengewicht von *Vairagya* (Nicht‑Anhang, die Fähigkeit, starke Assoziationen loszulassen), verfestigen sie sich zu *Vasanas*, automatischen Reaktionsmustern, die die bewusste Bewertung umgeht. Man hört nicht mehr die Situation, sondern führt das Skript weiter.

Das fehlende Mechanismus ist explizites Hebb’sches *schwächen*: nicht nur passiver Zerfall, sondern aktive Korrektur, wenn ein stark assoziiertes Entry ein falsches Abrufergebnis produziert. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse haben bereits eine Korrektur erzwungen (die `MinDedupVaultSize`-Guard). Die nächste Messung erfordert einen synthetischen Vault‑Generator mit gekennzeichneten Grammp‑Klassen: Duplicate, Near‑duplicate, Temporal update, Unique fact, Low‑access unique, Legal‑scoped, und Legal‑adjacent. Die schärfere Metrik ist *Displacement Rate*: Wie oft wird ein stark assoziiertes, aber weniger relevantes Entry von den Top‑k verdrängt? Das ist die direkte Vasana‑Messung: nicht nur „falsches Entry abgerufen“, sondern „richtiges Entry von habitual retrieval verdrängt“. Wenn stärken Messungen Verschiebungen erzeugt, ist Vairagya als design‑Primitive empirisch gerechtfertigt. Wenn nicht, reicht die passive Zerfallsrate aus und wir überspringen die Komplexität.

**Update (2026-04-08):** Die Dream Engine Phase 2 Abbau‑Studie ([PR #367](https://github.com/scrypster/muninndb/pull/367)) liefert jetzt konkrete Zahlen. 50 Optuna‑Trials über 255 Phasen‑Kombinationen, validiert auf 6 GoodAI LTM‑Datensätzen mit Gemini 3.1 Flash Lite:

| Phase | Avg Delta | Verdict |
|---|---|---|
| 5 Transitive Inference | +0.022 | Helpful |
| 0 Orient | +0.007 | Helpful |
| 2 Semantic Dedup | +0.006 | Helpful |
| 4 Bidirectional Stability | -0.014 | Detrimental |
| 2b LLM Adjudication | -0.011 | Detrimental |
| 1 Relevance Decay | -0.011 | Detrimental |

Phase 4 (Stabilitätsanpassungen, das Samskara‑Stärkungs‑Mechanismus) ist die zerstörerischste Phase. Der empirische Fall für Vairagya als design‑Primitive ist bestätigt: ungezügeltes Reinforcen schadet der Abrufleistung. Die Daten deuten jedoch darauf hin, dass die einfachere Lösung besteht, gar nicht zu verstärken, statt eine komplexe Abschwächungs‑Gegengewicht zu bauen. scrypster’s [Review](https://github.com/scrypster/muninndb/pull/367#issuecomment) kam zu derselben Schlussfolgerung: Nur die positiv‑Delta‑Phasen (0, 2, 5) shipping, Write‑Paths erst aktivieren, bis LocOMo und LongMemEval‑Validierung abgeschlossen ist.
## 3. Thepower of deliberate exclusion (Pratyahara)

Meta-Harness's most surprising result: the winning harnesses are not the ones that pack the context window with everything available. The text classification winner uses TF-IDF with contrastive pairs and label priming (48.6% accuracy, 4x fewer tokens than the runner-up). The math retrieval winner is a four-route BM25 program with lexical predicates. Simple selection policies. No exotic architectures. Changing the harness around a fixed LLM produces a 6x performance gap on the same benchmark.

Böckeler frames it as "keep quality left": the earlier you filter, the cheaper and more reliable the downstream result. Her computational guides (linters, schemas, CLAUDE.md rules) prevent entire categories of information from reaching the model at all. The `MinDedupVaultSize` guard from PR #359 is the same principle applied to consolidation: instead of running dedup on every vault and hoping the model handles the degraded results, the system learned to *not apply* dedup in small vaults. Exclusion of a process, not just exclusion of data.

The first version of this post argued that the Memory Trait interface should return rejection metadata alongside results. "These 3 entries matched, and these 5 were excluded because of X." More diagnostic signal for the LLM. Better informed decisions. Sounds reasonable.

It's wrong, and the yogic principle of [pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explains why. Pratyahara is often translated as "sense withdrawal," but that's misleading. It's not blindness. It's *selective attention*. The senses still function. They just stop pulling the mind toward every stimulus. You decide what enters awareness instead of reacting to whatever arrives.

If you tell the LLM "here are 5 things I'm deliberately withholding from you," you've shown it the objects and added a prohibition. That's not sense withdrawal. That's sense stimulation with a warning label. Anyone who's meditated knows the result: "don't think about a white elephant" guarantees you'll think about the white elephant. Concretely: rejection explanations consume tokens (contradicting the Meta-Harness finding that simple harnesses win) and invite the model to second-guess the filter ("Why was X excluded? Maybe I need it after all"). Non-essential context degrades model performance even when it's technically accurate, and exclusion metadata is by definition non-essential to the task at hand.

The right separation: **the agent sees only the top-k results. The benchmark harness sees everything.** The Memory Trait interface stays slim: `retrieve → Vec<Entry>`. But the retrieval implementation logs the full decision internally: what was returned, what was excluded, why, and what the agent did next. The benchmark consumes the logs. The agent consumes the entries.

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

The agent never sees `excluded`. The benchmark harness sees all of it. If `entry_089` was the right answer and got filtered because its Hebbian weight was low, that shows up in the trace, and the next iteration of the retrieval policy can adjust.

In Böckeler's taxonomy: the Memory Trait is a computational guide (it determines what enters the context). The trace log is a computational sensor (it observes what happened). They don't merge. Pratyahara isn't conscious filtering in the sense of *the filtered system being aware of the exclusion*. It's conscious filtering in the sense of *the designer being aware*, through the trace logs, so the next iteration of the filter improves. The consciousness belongs to the harness engineer reading the traces, not to the agent executing the queries.
## Wo die Metapher bricht

Zwei Stellen.

First, the [Koshas](https://en.wikipedia.org/wiki/Kosha) (Vedantic body layers: physisch, energisch, mental, diskriminierend, Ekstase) imply a hierarchy from gross to subtle, with the subtle being "höher." Harness engineering has no such value ordering. A deterministic linter is not "lower" than an LLM-as-judge. Böckeler explizit betont, dass computationale Sensoren billig genug sind, um bei jeder Änderung ausgeführt zu werden, während inferenzbasierte Kontrollen teuer und probabilistisch sind. In der Praxis willst du *maximieren* die "grosse" Schicht, nicht transcendieren. Importing the Kosha hierarchy into Harness engineering would lead you to over-invest in inferenzbasierte Kontrollen und under-invest in deterministische Kontrollen. The opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response. You want the agent to develop reliable patterns, not dissolve them. Vairagya im yogischen Sinne bedeutet, *alle* Anbindung loszulassen. Im Harness engineering bedeutet das, *falsche* Anbindungen loszulassen. The goal is better Konditionierung, nicht keine Konditionierung. Importing the full soteriological framework would lead to an agent that achieves enlightenment by refusing to retrieve anything at all. Unhelpful.
## Was das nicht istDas ist nicht „alte Weisheit bestätigt meine Architektur.“ Die kausale Richtung verläuft andersherum: die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Selbstbeobachtung raffinierte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agenten‑Gedächtnisforschung vorhersagen, ist nicht mystisch. Es ist konvergente Ingenieurkunst beim selben Problem: Wie verwaltet ein begrenztes System unendlichen Informationsfluss?

Dies ist auch nicht das erste attempt an der Schnittstelle. Ghosh und Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und dessen Nachfolger Maṇḍūkya-APO ordnen vedische Bewusstseinszustände (die vier Zustände des Māṇḍūkya Upaniṣad: wach, träumen, tiefer Schlaf, transzendent) einem Wake‑Sleep‑Konsolidierungszyklus für RL‑Agenten zu, formalisiert mit Kategorientheorie. Die architektonische Intuition ist sound und die Zuordnung ernsthaft. Die Papers sind jedoch ausdrücklich konzeptionelle Frameworks ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht ausgeführt. Der Abstand zwischen „vorgeschlagenen Framework“ und „gemessener Ergebnis“ ist der Ort, an dem die meisten interdisziplinären Arbeiten scheitern. Die drei unten stehenden Hypothesen sind dafür konzipiert, dort nicht zu sterben.

Die nützliche Frage ist nicht „ist Yoga relevant für KI?“ sondern „welche spezifischen yogischen Diskriminierungen ergeben testbare Hypothesen, die aktuelle Gedächtnissysteme nicht zulassen?“

Der ursprüngliche Benchmark hat eine Frage beantwortet. Uniformes Dedup in kleinen Vaults ist schädlich, und die `MinDedupVaultSize` Guard ([PR #359](https://github.com/scrypster/muninndb/pull/359)) hat es korrigiert. Zwei Hypothesen bleiben offen. Outcome‑tagged decay (vrtti nirodha) erfordert vom synthetischen Vault‑Generator, dass er zeigt, dass uniformes Decay die Abrufform von Einträgen mit unterschiedlichen Outcome‑Geschichten verschlechtert. Hebbian displacement (vairagya) erfordert vomselben Generator, dass er misst, ob gestärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine technische Aufgabe: **die trace schema muss retrieval precision nach Eintrittseigenschaften aufschlüsseln**: Hebbian weight, access frequency, outcome history. Wenn die Daten ein Problem zeigen, sind die Fixes straightforward. Wenn nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: die Memory Trait gibt top‑k zurück, Punkt. Der benchmark harness erfasst die komplette Abruffrageentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur tut es.

Keines davon erfordert den Glauben an Chakras. Es erfordert, die Diskriminierungen ernst als engineering heuristics zu nehmen und zu messen, ob sie die Agenten‑Rückrufqualität bei realistic workloads verbessern. Der ursprüngliche Benchmark hat eine design‑Änderung erzwungen. Der synthetic vault generator entscheidet über den Rest.