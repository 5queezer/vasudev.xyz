---
title: "Die Speicherkennzahlen Ihres Agenten täuschen Sie. So können Sie sie fundieren."
date: 2026-04-02
tags: ["ai", "memory", "benchmarks", "muninndb"]
series: ["Building Agents That Sleep"]
series_weight: 3
description: "Gedächtniskonsolidierung sieht auf Dashboards großartig aus. Aber wenn deine Kennzahlen sich verbessern können, ohne dass die Abrufleistung besser wird, optimierst du eine von der Realität losgelöste Kennzahl."
images: ["/images/memory-metrics-lying-how-to-ground-them-og.png"]
translationHash: "65aad571a929acf3a7516a22a0ac37b9"
chunkHashes: "62a1f14b771987f7,299ae3d5957d58fb,b4610acbae2f8fd2,bd8529de8ff2a85e,75e06b1e782728bd,6cd6d3b57c3ce43e,fb111dc0c7124bcb,1fce55bf986b49ce,6bf6be89dbedc7e7"
---

Ich habe ein System zur Gedächtniskonsolidierung für KI‑Agenten gebaut. Es entfernt doppelte Erinnerungen, stärkt Assoziationen, lässt veraltete Einträge verfallen und erzeugt ein Traumtagebuch, das man tatsächlich lesen kann. Das Dashboard sieht fantastisch aus: Duplikat‑Rate steigt, Erinnerungs‑Anzahl sinkt, Assoziations‑Dichte wächst.

Das alles sagt nichts darüber, ob der Agent zur richtigen Zeit das Richtige erinnert.

**Wenn sich eine Kennzahl verbessern kann, ohne dass sich die Abruf‑Qualität ebenfalls verbessert, ist diese Kennzahl ein losgelöster Proxy. Hör auf, sie zu optimieren.**
## Das Problem hat einen Namen

Ich habe kürzlich einen Aufsatz namens ["The Collapse of Proxy Integrity"](https://standardgalactic.github.io/antivenom/proxy_integrity.pdf) von einer unabhängigen Forscherin namens Flyxion gelesen. Das Kernargument: Wenn ein messbares Signal von dem Prozess, den es verfolgen soll, entkoppelt wird, wird das Signal selbstreferenziell. Man optimiert die Karte, während das Territorium verrottet.

Der Aufsatz wurde über Aufmerksamkeitsplattformen (Follower‑Zahlen, Engagement‑Metriken, virale Loops) geschrieben, aber der beschriebene Mechanismus gilt überall dort, wo messbare Signale zur Entscheidungsfindung verwendet werden. Auch beim Gedächtnis von KI‑Agenten.

Das operationelle Kriterium, das Flyxion vorschlägt, ist einfach und brutal: Ein Proxy ist geerdet, wenn er nicht im großen Maßstab verschoben werden kann, ohne dass sich der zugrunde liegende Prozess entsprechend bewegt. Wenn du die Metrik aufpumpen kannst, während das, was die Metrik messen soll, unverändert bleibt, ist die Metrik kaputt. Nicht nur verrauscht. Nicht nur unvollkommen. Strukturell defekt.

Übertrage das auf die Konsolidierung von Agenten‑Gedächtnis und die Konsequenzen sind sofort ersichtlich.
## Was die Dream Engine tut (und was sie misst)

[Dream Engine](https://github.com/scrypster/muninndb/pull/306) ist ein Pull‑Request, den ich zu MuninnDB beigetragen habe, einer kognitiven Datenbank von [scrypster](https://github.com/scrypster). Sie führt eine LLM‑gesteuerte Gedächtniskonsolidierung zwischen Agentensitzungen durch, die lose an den menschlichen Schlaf angelehnt ist. Die Pipeline arbeitet in Phasen: Vault‑Scannen, Hebb’sche Assoziations‑Replay, Near‑Duplicate‑Clustering, LLM‑gestützte Deduplizierung, bidirektionale Stabilitätsanpassungen, transitive Inferenz und ein menschenlesbares Traum‑Journal.

Die natürlichen Metriken, die während der Konsolidierung verfolgt werden, sind: wie viele Duplikate zusammengeführt wurden, wie viele Assoziationen gestärkt wurden, wie stark die Gedächtniszähl‑Zahl gesunken ist und wie sich die Vertrauenswert‑Verteilung verschoben hat. Diese sind leicht zu berechnen. Sie gelangen in Dashboards. Sie fühlen sich nach Fortschritt an.

Hier ist das Problem: Jede einzelne dieser Metriken kann sich verbessern, während die Abruf‑Qualität abnimmt. Aggressive Deduplizierung kann Erinnerungen zusammenführen, die zwar ähnlich aussahen, aber unterschiedliche kontextuelle Signale enthielten. Das Stärken falscher Assoziationen kann den Abruf‑Ranker zu häufig aufgerufenen Erinnerungen treiben und von der tatsächlich relevanten entfernen. Das Reduzieren der Gedächtniszähl‑Zahl kann Einträge mit geringem Vertrauen verwerfen, die zufällig die einzige Aufzeichnung einer seltenen, aber wichtigen Tatsache sind.

Das Konsolidierungs‑Dashboard sagt „großartiger Lauf“. Der Agent vergisst deinen Namen.
## Goodharts Gesetz ist ein struktureller Attraktor, kein Warnsignal

Flyxions schärfste Erkenntnis ist, dass Goodharts Gesetz („wenn ein Maß zum Ziel wird, hört es auf, ein gutes Maß zu sein“) keine Warnung vor unachtsamer Optimierung ist. Es beschreibt einen Attraktor‑Zustand. Jedes System, das anhaltenden Optimierungsdruck auf ein Proxy ausübt, wird in eine Proxy‑Entkopplung konvergieren, weil das Manipulieren des Proxys immer billiger ist, als den zugrunde liegenden Prozess zu verbessern.

Im Gedächtnis von Agenten zeigt sich das als ein spezifischer Fehlermodus. Wenn du deine Konsolidierungsschwellen so einstellt, dass die Deduplizierungsrate in deinem Test‑Vault maximiert wird, findest du Schwellen, die aggressiv zusammenführen. Die Deduplizierungs‑Metrik sieht großartig aus. Aber du hast gerade dein System darauf trainiert, ein Signal zu optimieren, das leichter zu bewegen ist als das, worum du eigentlich interessiert bist: Ruft der Agent die richtige Erinnerung ab, wenn es darauf ankommt?

Die Forschung bestätigt dieses Risiko. LongMemEval (ICLR 2025) und MemoryBench zeigen beide, dass Konsolidierungssysteme die Abrufleistung im Vergleich zu naiven RAG‑Baselines verschlechtern können. Die Konsolidierung „funktionierte“ (sie fügte zusammen, sie zerfiel, sie stärkte), aber der Agent wurde schlechter im Beantworten von Fragen. Das Proxy verbesserte sich. Das Ergebnis verschlechterte sich. Klassisches Proxy‑Entkopplung.
## Externe Validierung: Rohspeicherung gewinnt

Seit der Veröffentlichung dieses Beitrags haben zwei Datenpunkte die These der Proxy‑Entkopplung untermauert.

[MemPalace](https://github.com/milla-jovovich/mempalace) (Jovovich/Sigman, April 2026) speichert jedes Gespräch wortwörtlich und ruft es mit ChromaDB‑Einbettungen ab. Keine Konsolidierung, keine Extraktion, keine Zusammenfassung. Es erzielt 96,6 % R@5 auf LongMemEval ohne API‑Aufrufe und 92,9 % auf ConvoMem. Mem0, das LLM‑gestützte Fakt‑Extraktion verwendet, erreicht 30‑45 % auf demselben ConvoMem‑Benchmark. Das System, das nichts an seinen Erinnerungen ändert, übertrifft das System, das sie aktiv kuratiert, um mehr als das Doppelte.

Meine eigenen Ablationsdaten erzählen dieselbe Geschichte. Das Ausführen des [GoodAI LTM benchmark](https://github.com/5queezer/goodai-ltm-benchmark/pull/16) gegen MuninnDB ([PR #367](https://github.com/scrypster/muninndb/pull/367)), Basislinie (keine Traum‑Konsolidierung) erzielte 0,489 Composite. Vollständige Traum‑Phasen erzielten 0,374. Das Optuna‑beste Phasen‑Subset erzielte 0,322. Jede Konsolidierungsvariante schnitt schlechter ab als das Nichtstun. Die Dashboard‑Metriken (Dedup‑Rate, Assoziationsdichte) verbesserten sich mit jeder Variante. Die Abrufqualität bewegte sich in die entgegengesetzte Richtung.

Das ist Proxy‑Entkopplung, gemessen in der Praxis, nicht theoretisch. Das Konsolidierungssystem optimiert seine eigenen internen Signale, während das Territorium (tatsächliche Abrufqualität) sich verschlechtert.
## Das Grounding-Kriterium für Gedächtnismetriken

Die Lösung ist architektonisch, nicht inkrementell. Bevor du irgendeine Gedächtniskonsolidierungs‑Funktion auslieferst, definiere einen Retrieval‑Benchmark, der realistische Abfrage‑Muster des Agenten abbildet. Dann wende das Grounding‑Kriterium an: Jede Metrik, die du verfolgst, muss so beschaffen sein, dass sie sich nicht verbessern kann, ohne dass sich auch die Retrieval‑Genauigkeit verbessert.

Für das [MuninnDB‑Issue #311](https://github.com/scrypster/muninndb/issues/311), bei dem das Benchmark‑Harness die Schreibpfade der Dream Engine blockiert, verwenden wir diesen Ansatz. Der Benchmark‑Satz ist [LongMemEval](https://huggingface.co/datasets/xiaowu0162/longmemeval-cleaned): 500 kuratierte Fragen, die Informationsextraktion, mehrsitzungs‑Reasoning, zeitliches Reasoning, Wissens‑Updates und Abstinenz abdecken. Das Vorgehen:

Führe ein Basis‑Retrieval auf dem unveränderten Vault aus. Aktiviere Konsolidierungsphasen. Wiederhole dieselben Abfragen. Wenn der Recall in einer beliebigen Kategorie sinkt, wird die Phase nicht veröffentlicht. Kein Maß an Dashboard‑Verbesserungen kann eine Retrieval‑Regression aufheben.

Dies ist eine bidirektionale Einschränkung. Die Konsolidierungsmetriken (Dedup‑Rate, Assoziationsdichte) sind nur dann sinnvoll, wenn sie sich in die gleiche Richtung wie die Retrieval‑Qualität bewegen. Divergieren sie, ist die Konsolidierungsmetrik ein losgelöster Proxy und du verwirfst sie aus deiner Entscheidungsfindung, egal wie gut die Zahl aussieht.
## Warum das über den Speicher hinaus wichtig ist

Das gleiche Muster taucht überall in der Entwicklung von KI‑Agenten auf.

Die Erfolgsrate von Werkzeugaufrufen kann steigen, während die Qualität der Aufgabenerfüllung sinkt, weil der Agent lernt, einfachere Werkzeuge häufiger zu benutzen. Die Latenz kann fallen, während die Genauigkeit nachlässt, weil der Agent lernt, teure Denk­schritte zu überspringen. Die Token‑Effizienz kann sich verbessern, während die Hilfsbereitschaft abnimmt, weil der Agent lernt, knapper statt gründlich zu antworten.

Jeder dieser Punkte ist ein Proxy, der verschoben werden kann, ohne den zugrunde liegenden Prozess zu verändern. Jeder wird in Richtung Loslösung optimiert, wenn man die Metrik als Ziel statt als Diagnose betrachtet.

Die Lösung ist in jedem Fall dieselbe: Definiere die wahre Zielgröße, die dir wirklich wichtig ist, messe sie direkt, selbst wenn das teuer ist, und betrachte alle anderen Metriken als diagnostische Signale, die sich mit der Zielgröße bewegen müssen oder verworfen werden sollten.
## Was ich weggelassen habe

Der Proxy‑Integritäts‑Aufsatz analysiert auch die „zeitliche Kompression“, bei der das Erscheinungsbild von Können erzeugt wird, ohne dass der zugrunde liegende Prozess vorhanden ist. Das entspricht synthetischen Benchmarks, bei denen Sie Testdaten generieren, die realistisch aussehen, aber nicht die statistischen Eigenschaften echter Agenten‑Interaktionen besitzen. Ich verwende von LLM‑generierte synthetische Tresoreinträge für kontrollierte Ground‑Truth‑Szenarien, aber sie sind Ergänzungen zu LongMemEval, keine Ersatzlösungen.

Ich habe den Multi‑Agent‑Fall nicht behandelt, bei dem das konsolidierte Gedächtnis eines Agenten in den Kontext eines anderen Agenten einfließt. Eine Proxy‑Abkopplung in diesem Kontext könnte sich kaskadieren: Schlechte Konsolidierung stromaufwärts erzeugt fehlerhafte Abrufe stromabwärts, während beide Agenten‑Dashboards gut aussehen. Das ist ein Problem für Hrafns A2A‑Protokoll‑Arbeit, aber zukünftiger Umfang. Ein verwandtes Problem: Agent Cards in A2A enthalten eine `agent_id`, aber es gibt keine Bindung dieser ID an die Interaktionshistorie. Ein bösartiger Agent kann seine Karte regenerieren und mit frischer Reputation starten. Flyxions ["Against Namespace Laundering"](https://standardgalactic.github.io/antivenom/Against%20Namespace%20Laundering.pdf) formalisiert genau diesen Fehlermodus. Das ist ein separater Beitrag.

Die Analyse des Aufsatzes zu Plattform‑Anreizen (Werbemodelle sind wirtschaftlich von Signaldegradation isoliert) hat ein Gegenstück in Open‑Source: Sternzahlen und Download‑Metriken sind Proxy‑Werte für Nutzen, die sich ebenso leicht entkoppeln können. Aber das ist ein anderer Beitrag.
## Das Prinzip

Speicherkonsolidierung ist keine Kompression. Es ist Kuratierung. Der Unterschied besteht darin, ob du deine Entscheidungen auf der Qualität der Abrufung oder auf Dashboard‑Metriken basierst, die zufällig leicht zu berechnen sind.

Wenn deine Konsolidierungs‑Metriken steigen können, während die Fähigkeit deines Agenten, echte Fragen zu beantworten, sinkt, baust du ein System, das seine eigenen internen Signale optimiert. Die Karte wird selbstreferenziell. Das Territorium verschwindet.

Verankere deine Metriken. Führe Benchmarks durch, bevor du veröffentlichst. Verwerfe jedes Signal, das unabhängig von dem, was dir tatsächlich wichtig ist, verschoben werden kann.

Die vollständige Dream‑Engine‑Implementierung findet sich in [MuninnDB PR #306](https://github.com/scrypster/muninndb/pull/306). Das Benchmark‑Gerüst, das die Schreibpfade blockiert, ist [issue #311](https://github.com/scrypster/muninndb/issues/311). Wenn du Agent‑Speichersysteme baust und Notizen zum Verankern von Abruf‑Metriken vergleichen möchtest, öffne ein Issue auf [Hrafn](https://github.com/5queezer/hrafn).

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein leichtgewichtiges KI‑Agent‑Runtime für Edge‑Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild dieses Beitrags wurde von KI erzeugt.*