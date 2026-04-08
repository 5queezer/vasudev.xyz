---
title: "Die Speichermetriken deines Agents lügen dir. So verankerst du sie."
date: 2026-04-02
tags: ["ai", "memory", "benchmarks", "muninndb"]
description: "Speicherkonsolidierung wirkt großartig auf Dashboards. Aber wenn deine Metriken ohne Verbesserung des Abrufs verbessert werden können, optimierst du einen losgelösten Proxy."
images: ["/images/memory-metrics-lying-how-to-ground-them-og.png"]
images: ["/images/memory-metrics-lying-how-to-ground-them-og.png"]
images: ["/images/memory-metrics-lying-how-to-ground-them-og.png"]
translationHash: "f154150746aaffbbc7f8b524659f2420"
chunkHashes: "83225e2cb91e9bdb,299ae3d5957d58fb,b4610acbae2f8fd2,bd8529de8ff2a85e,75e06b1e782728bd,6cd6d3b57c3ce43e,fb111dc0c7124bcb,1fce55bf986b49ce,6bf6be89dbedc7e7"
---
## TheProblem Has a Name

I recently read an essay called ["The Collapse of Proxy Integrity"](https...

Ich habe ein Speicherkonsolidierungssystem für KI‑Agenten gebaut. Es dedupliziert Erinnerungen, stärkt Assoziationen, lässt veraltete Einträge verfallen, und erzeugt ein Traumjournal, das man tatsächlich lesen kann. Das Dashboard sieht fantastisch aus: dedup rate up, memory count down, association density climbing.

Keines davon sagt dir, ob das Agenten die richtige Sache zur richtigen Zeit erinnert.

**Wenn eine Metrik sich verbessern kann, ohne dass sich die Abrufqualität ebenfalls verbessert, ist diese Metrik ein abgekoppelter Proxy. Optimier sie nicht.**
## The Problem Has a Name

Ich habe kürzlich einen Aufsatz mit dem Titel ["The Collapse of Proxy Integrity"](https://standardgalactic.github.io/antivenom/proxy_integrity.pdf) von einer unabhängigen Forscherin namens Flyxion gelesen. Der zentrale Argument: Wenn ein messbares Signal von dem Prozess entkoppelt wird, den es zu verfolgen supposed ist, wird das Signal selbstreferenziell. Man optimiert die Landkarte, während das Gebietverwelkt.

Der Aufsatz handelte von Aufmerksamkeitplattformen (Follower‑Zahlen, Engagement‑Metriken, virale Schleifen), aber das beschriebene Mechanism gilt überall, wo messbare Signale zur Entscheidungsfindung verwendet werden. Auch bei der Speicher von KI‑Agenten.

Das von Flyxion vorgeschlagene operative Kriterium ist einfach und radikal: Ein Proxy ist verankert, wenn er nicht auf größerer Skala verschoben werden kann, ohne dass der zugrunde liegende Prozess entsprechend bewegt wird. Wenn man die Metrik inflieren kann, während das, wofür die Metrik stehen soll, flach bleibt, ist die Metrik defekt. Nicht nur rauschig. Nicht nur unvollständig. Strukturell defekt.

Wendet man das auf die Speicher‑Konsolidierung von KI‑Agenten an, sind die Implikationen sofort.
## Was Dream Engine tut (und wases misst)

[Dream Engine](https://github.com/scrypster/muninndb/pull/306) ist ein von mir eingebrachter PR an MuninnDB, eine von scrypster errichtete kognitive Datenbank. Erführt LLM-gesteuerte Gedächtniskonsolidierung zwischen Agentensitzungen, modelliert lose nach menschlichem Schlaf. Die Pipeline arbeitet in Phasen: Vault-Scanning, Hebbian-Assoziations-Wiedergabe, Near-Duplicate-Clustering, LLM-gesteuerte Deduplizierung, bidirektionale Stabilitäts-Anpassungen, transitive Schlussfolgerung und ein menschlich lesbares Traumtagebuch.

Die natürlichen Metriken, die während der Konsolidierung verfolgt werden sollen, sind: wie viele Duplikate zusammengeführt wurden, wie viele Assoziationen gestärkt wurden, wie stark die Speicheranzahl gesunken ist, wie sich die Konfidenzverteilung verschoben hat. Diese sind leicht zu berechnen. Sie gelangen in Dashboards. Sie fühlen sich wie Fortschritt an.

Hier ist das Problem: jede einzelne dieser Metriken kann steigen, während die Abrufqualität abnimmt. Aggressive Deduplizierung kann Erinnerungen zusammenführen, die oberflächlich ähnlich sahen, aber unterschiedliche Kontextsignale hatten. Die Stärkung der falschen Assoziationen kann den Abruf-Ranker in Richtung häufig zugriffener Erinnerungen lenken und von der tatsächlich relevanten abbringen. Die Reduktion der Speicheranzahl kann niedrig-confidence-Einträge verwerfen, die zufällig das einzige Zeugnis eines seltenen, aber wichtigen Fakts sind. Das Konsolidierungs-Dashboard sagt "great run". Der Agent vergisst deinen Namen.
## Goodhart's Law Ist ein Struktureller Anziehungspunkt, Nicht Eine WarnungFlyxyl's schärfste Einsicht ist, dass Goodhart's Law ("when a measure becomes a target, it ceases to be a good measure") keine Warnung vor sorglosem Optimieren ist. Es ist eine Beschreibung eines Anziehungspunkts. Jedes System, das dauerhaften Optimierungsdruck auf einen Proxy ausübt, wird sich auf Proxy-Detonation konvergieren, weil das Manipulieren des Proxy immer günstiger ist als die Verbesserung des zugrunde liegenden Prozesses.

In der Agenten‑Gedächtnisleistung manifestiert sich das als ein spezifischer Versagensmodus. Wenn du deine Konsolidierungsschwellen so einstellst, dass du die Dedup‑Rate in deinem Test‑Vault maximierst, wirst du Schwellenwerte finden, die aggressiv zusammenführen. Die Dedup‑Metrik sieht großartig aus. Aber du hast dein System gerade dazu trainiert, eine Signalanzeige zu optimieren, die günstiger zu bewegen ist als das, worauf du wirklich abzielst: ob das Agenten das korrekte Gedächtnis abruft, wenn es zählt?

Die Forschung bestätigt dieses Risiko. LongMemEval (ICLR 2025) und MemoryBench zeigen beide, dass Konsolidierungssysteme die Abrufleistung im Vergleich zu naiven RAG‑Baselines verringern können. Die Konsolidierung "funktionierte" (sie fügte zusammen, sie verfiel, sie stärkte) aber das Agenten wurde schlechter darin, Fragen zu beantworten. Der Proxy verbesserte sich. Das Territorium verschlechterte sich. Typische Proxy‑Detonation.
## External Validation: Raw Storage Wins

Seit der Veröffentlichung dieses Beitrags haben zwei Datenpunkte die Proxy-Detachment-These gestärkt.

[MemPalace](https://github.com/milla-jovovich/mempalace) (Jovovich/Sigman, April 2026) speichert jede Konversation wörtlich und ruft mit ChromaDB-Embeddings ab. Keine Konsolidierung, keine Extraktion, keine Zusammenfassung. Sie erreicht 96,6 % R@5 bei LongMemEval ohne API-Aufrufe und 92,9 % bei ConvoMem. Mem0, das LLM-gestützte Faktenextraktion nutzt, erreicht 30‑45 % bei demselben ConvoMem-Benchmark. Das System, das nichts an seinen Erinnerungen ändert, übertrifft das System, das aktiv Curating betreibt, um mehr als das Zweifache.

Meine eigenen Ablationsdaten erzählen dieselbe Geschichte. Beim Ausführen des [GoodAI LTM benchmark](https://github.com/5queezer/goodai-ltm-benchmark/pull/16) an MuninnDB ([PR #367](https://github.com/scrypster/muninndb/pull/367)), erreichte die Basislinie (ohne Traum-Konsolidierung) 0,489 im Kompositum. Vollständige Traumphasen erzielten 0,374. Die Untermenge der Optuna-best Phasen erreichte 0,322. Jede Konsolidierungsvariante unterperfektierte das Nicht-Handeln. Die Dashboard-Metriken (Dedup-Rate, Association-Dichte) verbesserten sich bei jeder Variante. Die Abruf-Qualität entwickelte sich entgegen.

Dies ist Proxy-Detachment, gemessen in der Praxis, nicht theoretisiert. Das Konsolidierungssystem optimiert seine eigenen internen Signale, während das Territorium (tatsächliche Abrufqualität) abnimmt.
## Der Grundierungs-Kriteriumfür Memory-Metriken

Die Lösung ist architektonisch, nicht inkrementell. Bevor du irgendeine Memory-Konsolidierungs-Funktion bereitstellst, definiere eine Retrieval-Benchmark, die realistische Abfragemuster des Agents repräsentiert. Dann wende das Grundierungs-Kriterium an: jede Metrik, die du verfolgst, muss eine sein, die nicht verbessert werden kann, ohne dass die Retrieval-Genauigkeit ebenfalls verbessert wird.

Für [MuninnDB issue #311](https://github.com/scrypster/muninndb/issues/311), das Benchmark-Harness, das Dream Engine-Schreibpfade blockiert, verwenden wir diesen Ansatz. Die Benchmark-Menge ist [LongMemEval](https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned): 500 kuratierte Fragen, die Informationsextraktion, Multi-Session-Reasoning, Temporales Reasoning, Wissensaktualisierungen und Abbruchcover abdecken. Der Ablauf:

Führe Baseline-Retrieval auf dem unveränderten Vault aus. Aktiviere Konsolidierungsphasen. Wiederhole die gleichen Abfragen. Wenn die Recall-Rate in einer Kategorie sinkt, wird die Phase nicht bereitgestellt. Keine Verbesserung der Dashboard-Optimierung kann eine Retrieval-Regression überwiegen.

Dies ist eine bidirektionale Beschränkung. Die Konsolidierungsmetriken (dedup rate, association density) sind nur dann sinnvoll, wenn sie in die gleiche Richtung wie die Retrieval-Qualität bewegen. Wenn sie sich unterscheiden, ist die Consolidation-Metrik ein abgekoppelter Proxy und wird aus der Entscheidungsfindung verworfen, egal wie gut die Zahl aussieht.
## Warum Das Bred individuales Thema Noch Relevanter Ist

Das gleiche Muster tritt überall in der Entwicklung von AI-Agenten auf.

Tool‑Call‑Erfolgsrate kann steigen, während die Qualität der Aufgabenlösung sinkt, weil der Agent leichter zu bedienende Tools häufiger aufruft. Latenz kann sinken, während die Genauigkeit sinkt, weil der Agent teure Schlussfolgerungsschritte überspringt. Token‑Effizienz kann steigen, während die Hilfsbereitschaft abnimmt, weil der Agent knapper statt ausführlicher wird.

Jeder dieser Indikatoren ist ein Proxy, der verschoben werden kann, ohne den zugrundeliegenden Prozess zu verändern. Jeder wird zur Optimierung in Richtung Abkoppelung neigen, wenn Sie die Kennzahl als Ziel statt als diagnostisches Signal behandeln.

Die Lösung ist in jedem Fall dieselbe: definieren Sie die Grundwahrheit, die Sie tatsächlich wichtig finden, messen Sie sie direkt, auch wenn sie teuer ist, und behandeln Sie alle anderen Metriken als diagnostische Signale, die mit der Grundwahrheit mitbewegen müssen oder verworfen werden.
## Was ich weggelassen habe

Der Proxy-Integritäts‑Essay analysiert außerdem „temporale Kompression“, bei der der Eindruck von Fähigkeit ohne den zugrunde liegenden Prozess hergestellt wird. Das entspricht synthetischen Benchmarks, bei denen Testdaten erzeugt werden, die realistisch wirken, aber nicht die statistischen Eigenschaften echter Agenten‑Interaktionen besitzen. Ich verwende von LLM‑generierte synthetische Vault‑Einträge für kontrollierte Szenarien mit Grundwahrheit, aber sie dienen nur als Ergänzung zu LongMemEval, nicht als Ersatz.

Ich habe den Mehr‑Agenten‑Fall nicht behandelt, bei dem das konsolidierte Gedächtnis eines Agents in den Kontext eines anderen Agents fließt. Proxy‑Abkoppelung kann in diesem Setting kaskadieren: Schlechte Konsolidierung oben führt zu schlechter Retrieval‑Qualität unten, aber beide Agenten‑Dashboards sehen gut aus. Das ist ein Problem für Hrafn's A2A‑Protokoll‑Arbeit, aber das ist zukünftiger Umfang. Ein verwandtes Thema: Agent Cards in A2A tragen ein `agent_id`, aber es wird nichts diese ID mit der Interaktionsgeschichte verbinden. Ein böswilliger Agent kann seine Card neu generieren und mit frischer Reputation beginnen. Flyxion's ["Against Namespace Laundering"](https://standardgalactic.github.io/antivenom/Against%20Namespace%20Laundering.pdf) formalisiert genau dieses Fehler‑Muster. Das ist ein separater Beitrag.

Der Essay‑Analyse der Plattform‑Anreize (Werbe‑Modelle sind wirtschaftlich gegen Signalverschlechterung isoliert) hat in Open‑Source ein Analogon: Star‑Zähler und Download‑Metriken sind Proxy‑Maßstäbe für Nutzen, die ebenso leicht abkoppeln können. Aber das ist ein anderer Beitrag.
## The Principle

Gedächtniskonsolidierung ist keine Kompression. Es ist Kuration. Der Unterschied ist, ob du deine Entscheidungen auf Retrieval‑Qualität oder auf Dashboard‑Metriken gründest, die zufällig einfach zu berechnen sind.

Wenn deine Konsolidierungs‑Metriken steigen können, während die Fähigkeit deines Agents, echte Fragen zu beantworten, sinkt, baust du ein System, das sich selbst optimiert. Die Karte wird selbstreferenziell. Das Territorium verschwindet.

Grund deine Metriken. Benchmark, bevor du startest. Verwerfe jegliche Signale, die unabhängig von dem, worauf du wirklich abzielst, verschoben werden können.

Die vollständige Dream Engine-Implementierung befindet sich in [MuninnDB PR #306](https://github.com/scrypster/muninndb/pull/306). Der Benchmark-Harness, der die Schreibpfade blockiert, ist in [issue #311](https://github.com/scrypster/muninndb/issues/311). Wenn du Agenten‑Gedächtnissysteme baust und Notizen zum Grounding von Retrieval‑Metriken austauschen möchtest, öffne ein Issue bei [Hrafn](https://github.com/5queezer/hrafn).

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), ein leichtgewichtiges KI‑Agenten‑Runtime‑System für Edge‑Hardware. Mehr auf [vasudev.xyz](https://vasudev.xyz).*

*Das Coverbild für diesen Beitrag wurde von KI generiert.*