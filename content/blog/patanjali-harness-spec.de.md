---
title: "Patanjali hatte die Filtering‑Spezifikation. Wir haben gerade die Tests geschrieben."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
series: ["Building Agents That Sleep"]
series_weight: 4
description: "Gedächtniskonsolidierung verschlechterte das Abrufen. Drei Gestaltungsprinzipien aus Agent‑Gedächtnis‑Benchmarks und ihre unerwarteten Parallelen zur yogischen Aufmerksamkeitstheorie."
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "23f635aa5ccf9c7ebc9fecd4512d4498"
chunkHashes: "31381edb8546ec1f,00217735d7922f24,4ff29492163683f6,76193dd6126e8e55,797db2615cbff326,d4e931c16fb32a74,246c64c22c93fe91"
---
[MuninnDB](https://github.com/scrypster/muninndb)'s Konsolidierungssystem hat drei farbvariante Duplikat‑Engramme exakt wie vorgesehen zusammengeführt (Kosinus‑Ähnlichkeit ≥ 0.95). Die Retrieval‑Leistung verschlechterte sich. In einem 13‑Engram‑Tresor verschob das Entfernen von Duplikaten den Normalisierungs‑Anker und drückte relevante Ergebnisse im Ranking nach unten. Die Lösung war eine Guard‑Clause: `MinDedupVaultSize` (Standard 20), die Phase‑2‑Dedup in kleinen Tresoren überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Problem.

Der Fehler war kein Bug im Dedup‑Algorithmus. Es war ein Versagen der *Unterscheidungs­fähigkeit*: ein gültiger Konsolidierungsschritt, angewendet in einem Kontext, in dem er Schaden anrichtete. Wann konsolidieren, wann unbeeinflusst lassen, was als Rauschen vs. Signal gilt. Dieses Problem hat eine lange Geschichte außerhalb der Informatik. Ich fand drei konkrete Designprinzipien in den [Yoga‑Sutras](https://de.wikipedia.org/wiki/Yoga_Sutras_von_Patanjali), die zu empirischen Resultaten aus [Meta‑Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness‑Engineering‑Framework](https://martinfowler.com/articles/harness-engineering.html) passen.

**Die kontemplativen Traditionen haben ausgefeilte Modelle der Aufmerksamkeits‑Filterung entwickelt. Einige dieser Modelle erzeugen testbare Hypothesen, die die aktuelle Literatur zur Agent‑Speicherung nicht liefert.**
## 1. Nicht alle Geräusche sind gleich (Vrtti Nirodha)

Before the dedup failure, [benchmark #311](https://github.com/scrypster/muninndb/issues/311) hit a more basic problem. MuninnDB's ACT-R scoring ([issue #331](https://github.com/scrypster/muninndb/issues/331)) clamped fresh engrams to raw=1.0, making all retrieval scores identical at 0.9000. The system could not distinguish signal from noise. Every entry looked equally relevant. After the fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)), score range improved to 0.18-0.90 and correct top-1 retrieval went to 5/5 queries. Uniform treatment of entries had been destroying retrieval quality.

Meta-Harness confirmed the same pattern at a different scale. Their [critical ablation (Table 3)](https://arxiv.org/abs/2603.28052) compared three levels of information access for the harness optimizer:

| Condition | Median Accuracy | Best Accuracy |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM-generated summaries performed *worse* than raw scores alone (best accuracy 38.7% vs 41.3%). Full raw traces got 56.7%. The summaries collapsed diagnostic signal alongside noise, destroying the information the optimizer needed. On text classification, Meta-Harness achieved 48.6% vs ACE's 40.9% while using 4x fewer context tokens. The winning move was not more information. It was better *selection* of information.

The design principle: indiscriminate treatment of entries destroys retrieval quality, whether that treatment is uniform scoring, lossy summarization, or undifferentiated dedup.

Yoga Sutras 1.2 defines yoga as *chitta vrtti nirodha*, the cessation of fluctuations in the mind-field. Patanjali doesn't say "delete everything." He distinguishes [*kleshas*](https://de.wikipedia.org/wiki/Kleshas) (distortions: attachment, aversion, ego, ignorance, fear of death) from [*pramanas*](https://de.wikipedia.org/wiki/Pramana) (valid cognition: direct perception, inference, testimony). The practice is surgical: reduce the distortions, preserve the signal. The score saturation bug was the system failing to make that distinction. Every vrtti looked the same.

The design implication for MuninnDB: decay floors should reflect outcome, not just access frequency. A verified API pattern and a failed curl attempt might have identical retrieval rates but radically different retention value. You could try to classify entries upfront as pramana or klesha (verified vs. distorted), but that classification is itself the hard problem. For most entries, it requires semantic judgment, which means an LLM in the decay path, which makes consolidation expensive and nondeterministic.

The simpler path: **outcome-tagged writes**. When an agent retrieves an entry and the subsequent action succeeds, the entry gets an `outcome: success` signal. When the action fails, `outcome: failure`. The decay floor couples to the success rate, not to an epistemic category. This is essentially bandit feedback on retrieval, an idea well-established in information retrieval, applied here to persistent agent memory. No ontology needed. No LLM in the loop. You don't need to classify the vrtti in advance. You observe its effect and let that observation shape retention.

---
## 2. Verstärkung braucht ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei hochmoderne Speichersysteme (A‑Mem, Mem0, MemoryOS) gegen naive RAG‑Baselines, die einfach aus rohem Kontext abrufen. Keines der fortgeschrittenen Systeme übertraf die Baselines beständig. Der konkrete Fehlermodus: Diese Systeme konnten das prozedurale Gedächtnis (Feedback‑Logs, die die Leistungsgeschichte des Systems anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen gesagt hätten, welche Erinnerungen tatsächlich nützlich waren.

Der Benchmark #311 von MuninnDB erzeugte eine lokale Version desselben Problems. Phase 2‑Dedup identifizierte und mergte drei farbvariante Duplikate korrekt (cosine ≥ 0,95). Doch im 13‑Engram‑Vault änderte das Entfernen dieser Einträge den Normalisierungsanker. Ein nicht verwandter Engram wurde zum Referenzpunkt, wodurch relevante Ergebnisse im Ranking nach unten gedrückt wurden. Eine gültige Konsolidierungsoperation, gleichmäßig angewandt, verdrängte die richtige Antwort.

Böckelers [harness engineering taxonomy](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Diskrepanz. Sie unterscheidet rechnerische Sensoren (deterministisch, billig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Dedup bei cosine ≥ 0,95 ist ein rechnerischer Prozess. Das Erkennen, wann Dedup die Abrufleistung schädigt, erfordert inferenzielles Urteil: „Diese Einträge sind ähnlich, aber ist das Entfernen *sicher* in diesem Vault?“ Keine Ähnlichkeitsschwelle kann das beantworten.

Die [Yoga‑Sutras](https://de.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara_(Indische_Philosophie)) sind latente Eindrücke, die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Rille. MuninnDB implementiert das direkt: Einträge, die gemeinsam aktiviert werden, stärken ihre Assoziationsgewichte. Die Sutras warnen, dass sich Samskaras ansammeln. Ohne das Gegengewicht von [*vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht‑Anhaftung, die Fähigkeit, starke Assoziationen loszulassen) versteinern sie zu [*vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und beginnt, das Skript auszuführen.

Der fehlende Mechanismus ist explizites hebbisches *Abschwächen*: nicht nur passiver Zerfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag eine Fehl‑Positiv‑Abrufung erzeugt. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse zwangen bereits eine Korrektur (die `MinDedupVaultSize`‑Guard). Die nächste Messung erfordert den synthetischen Vault‑Generator mit gekennzeichneten Engram‑Klassen: Duplikat, Near‑Duplikat, Zeitliches Update, Einzigartige Tatsache, Selten genutzte Einzigartigkeit, Rechts‑bezogen, und Rechts‑adjacent. Die schärfere Kennzahl ist die *Displacements‑Rate*: Wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus dem Top‑k? Das ist die direkte Vasana‑Messung: nicht nur „falsche Sache abgerufen“, sondern „richtige Sache durch habituale Abrufe verdrängt“. Wenn gestärkte Einträge messbare Displacement verursachen, ist Vairagya als Design‑Primitive empirisch gerechtfertigt. Wenn nicht, reicht der aktuelle passive Zerfall aus und wir verzichten auf die Komplexität.

**Update (2026‑04‑08):** Die Dream‑Engine‑Phase‑2‑Ablationsstudie ([PR #367](https://github.com/scrypster/muninndb/pull/367)) liefert nun konkrete Zahlen. 50 Optuna‑Durchläufe über 255 Phasenkombinationen, validiert auf 6 GoodAI‑LTM‑Datensätzen mit Gemini 3.1 Flash Lite:

| Phase | Avg Delta | Verdict |
|---|---|---|
| 5 Transitive Inference | +0,022 | Hilfreich |
| 0 Orient | +0,007 | Hilfreich |
| 2 Semantic Dedup | +0,006 | Hilfreich |
| 4 Bidirectional Stability | -0,014 | Schädlich |
| 2b LLM Adjudication | -0,011 | Schädlich |
| 1 Relevance Decay | -0,011 | Schädlich |

Phase 4 (Stabilitätsanpassungen, der Samskara‑Verstärkungsmechanismus) ist die destruktivste Phase. Der empirische Fall für Vairagya als Design‑Primitive ist bestätigt: Ungezügelte Verstärkung schädigt den Abruf. Die Daten deuten jedoch darauf hin, dass die einfachere Lösung darin besteht, überhaupt nicht zu verstärken, statt ein anspruchsvolles Abschwächungs‑Gegengewicht zu bauen. scrypsters [Review](https://github.com/scrypster/muninndb/pull/367#issuecomment) kam zum selben Schluss: Nur die positiven Delta‑Phasen (0, 2, 5) ausliefern, die Schreibpfade zurückhalten, bis LocOMo‑ und LongMemEval‑Validierung abgeschlossen ist.
## 3. Die Kraft des bewussten Ausschlusses (Pratyahara)

Das überraschendste Ergebnis von Meta‑Harness: Die siegreichen Harnesses sind nicht die, die das Kontextfenster mit allen verfügbaren Informationen füllen. Der Sieger im Textklassifizierungs‑Contest verwendet TF‑IDF mit kontrastiven Paaren und Label‑Priming (48,6 % Genauigkeit, 4‑mal weniger Tokens als der Zweitplatzierte). Der Sieger im Mathe‑Retrieval ist ein vier‑Routen‑BM25‑Programm mit lexikalischen Prädikaten. Einfache Auswahl‑Politiken. Keine exotischen Architekturen. Das Ändern des Harnesses um ein festes LLM herum erzeugt eine 6‑malige Leistungslücke auf demselben Benchmark.

Böckeler formuliert es als „keep quality left“: Je früher du filterst, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre computergestützten Leitfäden (Linters, Schemata, CLAUDE.md‑Regeln) verhindern, dass ganze Informationskategorien das Modell überhaupt erreichen. Der `MinDedupVaultSize`‑Guard aus PR #359 ist dasselbe Prinzip, das auf die Konsolidierung angewendet wird: Anstatt in jedem Vault Deduplication laufen zu lassen und zu hoffen, das Modell handle die degradierten Ergebnisse, hat das System gelernt, *keine* Deduplication in kleinen Vaults anzuwenden. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Beitrags argumentierte, dass die Memory‑Trait‑Schnittstelle Ablehnungs‑Metadaten zusammen mit den Ergebnissen zurückgeben sollte. „Diese 3 Einträge haben gepasst, und diese 5 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip des [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga‑Sutras 2.54) erklärt warum. Pratyahara wird oft mit „Sinnesrückzug“ übersetzt, was irreführend ist. Es ist nicht Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiterhin. Sie hören nur auf, den Geist zu jedem Reiz zu ziehen. Du entscheidest, was in das Bewusstsein gelangt, anstatt auf alles zu reagieren, was ankommt.

Wenn du dem LLM sagst „Hier sind 5 Dinge, die ich dir bewusst vorenthalte“, hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Sinnesrückzug. Das ist Sinnesstimulation mit Warnhinweis. Jeder, der meditiert hat, kennt das Ergebnis: „Denke nicht an einen weißen Elefanten“ sorgt dafür, dass du an den weißen Elefanten denkst. Konkret: Ablehnungs‑Erklärungen verbrauchen Tokens (im Widerspruch zu der Meta‑Harness‑Feststellung, dass einfache Harnesses gewinnen) und verleiten das Modell dazu, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch.“). Nicht‑essentieller Kontext verschlechtert die Modellleistung, selbst wenn er technisch korrekt ist, und Ausschluss‑Metadaten sind per Definition nicht essentiell für die aktuelle Aufgabe.

Die richtige Trennung: **Der Agent sieht nur die Top‑k‑Ergebnisse. Der Benchmark‑Harness sieht alles.** Die Memory‑Trait‑Schnittstelle bleibt schlank: `retrieve → Vec<Entry>`. Aber die Retrieval‑Implementierung protokolliert die volle Entscheidung intern: was zurückgegeben wurde, was ausgeschlossen wurde, warum und was der Agent als Nächstes tat. Der Benchmark verbraucht die Protokolle. Der Agent verbraucht die Einträge.

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

Der Agent sieht `excluded` niemals. Der Benchmark‑Harness sieht alles. Wenn `entry_089` die richtige Antwort war und wegen eines niedrigen hebbischen Gewichts gefiltert wurde, erscheint das im Trace, und die nächste Iteration der Retrieval‑Policy kann sich anpassen.

In Böckelers Taxonomie ist das Memory‑Trait ein computergestützter Leitfaden (es bestimmt, was in den Kontext gelangt). Das Trace‑Log ist ein computergestützter Sensor (es beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *das gefilterte System ist sich des Ausschlusses bewusst*. Es ist bewusstes Filtern im Sinne von *der Designer ist sich bewusst*, durch die Trace‑Logs, sodass die nächste Iteration des Filters verbessert wird. Das Bewusstsein gehört dem Harness‑Ingenieur, der die Traces liest, nicht dem Agenten, der die Anfragen ausführt.
## Where the metaphor breaks

Two places.

First, the [Koshas](https://de.wikipedia.org/wiki/Kosha) (Vedantic body layers: physical, energetic, mental, discriminative, bliss) imply a hierarchy from gross to subtle, with the subtle being "higher." Harness engineering has no such value ordering. A deterministic linter is not "lower" than an LLM-as-judge. Böckeler explicitly notes that computational sensors are cheap enough to run on every change, while inferential controls are expensive and probabilistic. In practice, you want to *maximize* the "gross" layer, not transcend it. Importing the Kosha hierarchy into harness design would lead you to over‑invest in inferential controls and under‑invest in deterministic ones. The opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response. You want the agent to develop reliable patterns, not dissolve them. Vairagya in the yogic sense means letting go of *all* attachment. In harness engineering it means letting go of *incorrect* attachments. The goal is better conditioning, not no conditioning. Importing the full soteriological framework would lead to an agent that achieves enlightenment by refusing to retrieve anything at all. Unhelpful.
## Was das nicht ist

Das ist nicht „alte Weisheit bestätigt meine Architektur.“ Der kausale Pfeil verläuft in die andere Richtung: Die kontemplativen Traditionen haben über Jahrtausende systematischer Introspektion hochentwickelte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung entwickelt. Dass einige dieser Modelle Ergebnisse in der Forschung zu Agenten‑Gedächtnis vorhersagen, ist nicht mystisch. Es ist konvergente Ingenieur­kunst beim selben Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Das ist auch nicht der erste Versuch am Schnittpunkt. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und sein Nachfolger Maṇḍūkya‑APO ordnen vedische Bewusstseinszustände (die vier Zustände des Māṇḍūkya‑Upaniṣad: Wachsein, Träumen, Tiefschlaf, Transzendenz) einem Wake‑Sleep‑Konsolidierungszyklus für RL‑Agenten zu, formalisiert mit Kategorientheorie. Die architektonische Intuition ist stimmig und die Zuordnung ist ernst gemeint. Beide Arbeiten sind jedoch ausdrücklich konzeptionelle Rahmenwerke ohne empirische Validierung. Die von ihnen vorgeschlagenen Benchmarks (FurnitureBench, Atari‑57, Intel Loihi) wurden nicht ausgeführt. Die Lücke zwischen „vorgeschlagenes Framework“ und „gemessenes Ergebnis“ ist dort, wo die meiste interdisziplinäre Arbeit scheitert. Die drei untenstehenden Hypothesen sind so gestaltet, dass sie dort nicht sterben.

Die nützliche Frage ist nicht „Ist Yoga für KI relevant?“, sondern „Welche spezifischen yogischen Diskriminierungen erzeugen testbare Hypothesen, die aktuelle Gedächtnissysteme nicht stellen?“

Der anfängliche Benchmark hat eine Frage beantwortet. Einheitliches Dedup in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`‑Sperre ([PR #359](https://github.com/scrypster/muninndb/pull/359)) hat das korrigiert. Zwei Hypothesen bleiben offen. Ausgangs‑tagged Decay (vrtti nirodha) erfordert, dass der synthetische Vault‑Generator zeigt, dass einheitlicher Verfall die Abrufqualität bei Einträgen mit unterschiedlicher Ergebnis­historie mindert. Hebb’sche Verschiebung (vairagya) verlangt vom selben Generator zu messen, ob gestärkte Einträge relevantere Alternativen verdrängen. Beide reduzieren sich auf eine technische Aufgabe: **Das Trace‑Schema muss die Abruf‑Präzision nach Eintrags‑Eigenschaften aufschlüsseln**: Hebb‑Gewicht, Zugriffs‑Häufigkeit, Ergebnis‑Historie. Zeigt die Datenlage ein Problem, sind die Lösungen einfach. Zeigt sie kein Problem, lassen wir die Komplexität weg.

Pratyahara ist bereits korrekt implementiert: Das Memory‑Trait gibt Top‑k zurück, Punkt. Der Benchmark‑Harness erfasst die vollständige Abruf­entscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur tut es.

Keine dieser Anforderungen verlangt den Glauben an Chakras. Sie verlangen, die Diskriminierungen ernst zu nehmen als ingenieurtechnische Heuristiken und zu messen, ob sie die Erinnerung des Agenten bei realistischen Workloads verbessern. Der Anfangs‑Benchmark zwang zu einer Design‑Änderung. Der synthetische Vault‑Generator entscheidet den Rest.
## Weiterführende Literatur

[Böckeler's Harness Engineering Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Leitfäden, Sensoren, rechnerisch, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirische Evidenz, dass Änderungen am Harness 6‑fach höhere Leistungsunterschiede erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), das bislang engste Vorbild, das Vedanta auf Agentenarchitekturen überträgt (konzeptionell, noch keine Benchmarks). Yoga‑Sutras 1.2‑1.16, das Aufmerksamkeits‑Filterungsmodell, dem alles andere vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), die Korrektur der Sättigungs‑Score‑Problematik. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Duplikat‑Schutz‑Logik. [Hrafn](https://github.com/5queezer/hrafn), die Laufzeit, die auf einem $10 Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein leichtgewichtiges Agenten‑Runtime in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*