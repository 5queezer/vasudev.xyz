---
title: "Patanjali hatte die Filterspezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Drei yogische Prinzipien, die testbare Hypothesen für das Agenten-Harness-Design erzeugen. Antike Aufmerksamkeitsfilter, moderne Benchmarks."
translationHash: "cac18e4f15e90d5c6c6571b026cf36dc"
---
Letzte Woche habe ich zwei Papers und einen [Fowler-Artikel](https://martinfowler.com/articles/harness-engineering.html) über Harness-Engineering gelesen (der Code, der einen LLM umgibt und bestimmt, was gespeichert, abgerufen und dem Modell präsentiert wird). Mitten in Birgitta Böckelers Taxonomie von Guides und Sensoren wurde mir klar, dass ich diese Architektur schon einmal gesehen hatte. Nicht in einer Codebase. In den [Yogasutren](https://de.wikipedia.org/wiki/Yogasutra).

**Die kontemplativen Traditionen haben ausgefeilte Modelle der Aufmerksamkeitsfilterung entwickelt. Einige dieser Modelle generieren testbare Hypothesen, die die aktuelle Literatur zu Agent-Speichern nicht aufstellt.**

Das klingt nach der Art von Behauptung, über die man auf Hacker News ausgelacht würde. Also untermauere ich sie mit drei konkreten Zuordnungen, bei denen yogische Prinzipien Hypothesen generieren, die sich mit empirischen Ergebnissen aus [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) decken, statt nur oberflächlich zu ähneln.

## 1. Vrtti Nirodha: Nicht alle Störsignale sind gleich

Yogasutra 1.2 definiert Yoga als *chitta vrtti nirodha*, das Zur-Ruhe-Kommen der Schwankungen im Geistfeld. Patanjali sagt nicht „lösche alles". Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Kle%C5%9Ba) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Todesangst) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage/Überlieferung). Die Praxis ist chirurgisch: Verzerrungen reduzieren, das Signal bewahren.

Der Harness-Engineering-Post von OpenAI bezeichnet dieselbe Operation als „Entropy Management": periodische Cleanup-Agenten, die dem Verfall der Codebasis entgegenwirken. [Dream Engine](/blog/why-ai-agents-need-sleep/), das Konsolidierungssystem von MuninnDB, nutzt dafür geteilte Ähnlichkeitsschwellenwerte: 0,95 für normales Deduplizieren, 0,85 im Traummodus. Aber keines der beiden Systeme fragt, *welche Art* von Redundanz es entfernt.

Meta-Harness hat bewiesen, dass dies wichtig ist. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) zeigte, dass LLM-generierte Zusammenfassungen von Ausführungsprotokollen *schlechter* abschnitten als reine Rohwerte (38,7 % vs. 41,3 %). Vollständige Rohprotokolle erzielten 56,7 %. Die Zusammenfassungen waren ein fehlgeschlagenes vrtti nirodha: Sie haben *Pramana* (diagnostisches Signal) zusammen mit *Klesha* (Rauschen) kollabiert und damit die Informationen zerstört, die der Optimierer benötigte.

Die Design-Implikation für [MuninnDB](https://github.com/scrypster/muninndb): Verfallsuntergrenzen sollten das Ergebnis widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Versuch können identische Abrufquoten haben, aber einen radikal unterschiedlichen Aufbewahrungswert. Die Vault-Trust-Stufen sortieren bereits nach Inhaltssensitivität (Rechtliches, Arbeit, Persönliches). Aber der offensichtliche nächste Schritt hat eine Falle.

Man könnte versuchen, Einträge von vornherein als Pramana oder Klesha zu klassifizieren (verifiziert vs. verzerrt), aber diese Klassifizierung ist selbst das eigentliche Problem. Für triviale Fälle (HTTP 200 vs. 401) ist es mechanisch. Für die meisten Einträge erfordert es semantische Urteilskraft, was einen LLM im Verfallspfad bedeutet, was Konsolidierung teuer und nichtdeterministisch macht. Patanjali hatte ein Leben lang Praxis, um seine Unterscheidungskraft zu verfeinern. Dream Engine läuft über einen Cron-Trigger.

Der einfachere Weg: **ergebnisgetaggte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die darauffolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Wenn die Aktion fehlschlägt, `outcome: failure`. Die Verfallsuntergrenze koppelt sich an die Erfolgsquote, nicht an eine epistemische Kategorie. Im Wesentlichen ist dies Banditen-Feedback auf den Abruf, eine im Information-Retrieval gut etablierte Idee, die hier auf persistenten Agent-Speicher angewendet wird. Keine Ontologie nötig. Kein LLM in der Schleife. In yogischen Begriffen: Du musst den Vrtti nicht im Voraus klassifizieren. Du beobachtest seine Wirkung und lässt diese Beobachtung die Aufbewahrung steuern.

---

## 2. Samskara und Vairagya: Verstärkung braucht ein Gegengewicht

[*Samskaras*](https://de.wikipedia.org/wiki/Sa%E1%B9%83sk%C4%81ra) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Bahn. Dies ist hebbisches Lernen („Neurons that fire together wire together"), und MuninnDB setzt es direkt um: Einträge, die gemeinsam aktiviert werden, verstärken ihre Assoziationsgewichte.

Die Yogasutren warnen davor, dass Samskaras sich aufschaukeln. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vair%C4%81gya) (Nicht-Anhaften, die Fähigkeit, starke Assozationen loszulassen) verkalken sie zu [*Vasanas*](https://de.wikipedia.org/wiki/V%C4%81san%C4%81), automatischen Reaktionsmustern, die die bewusste Evaluation umgehen. Man hört auf, die Situation zu sehen, und beginnt nur noch das Skript abzuspulen.

[MemoryBench](https://arxiv.org/abs/2510.17281) liefert indirekte Belege. Sein zentraler Befund: State-of-the-Art-Speichersysteme (A-Mem, Mem0, MemoryOS) übertreffen naive RAG-Baselines, die einfach aus dem Rohtext abrufen, nicht konsistent. Das Paper isoliert hebbische Verstärkung nicht als Ursache, und das Versagen könnte von jedem Teil der Konsolidierungspipeline stammen. Ein möglicher Mechanismus: Verstärkte Assozationen drängen weniger aktivierte, aber relevantere Alternativen zurück, der Vasana-Effekt. Aber das ist Spekulation, kein nachgewiesenes Ergebnis. Es benötigt direkte Messung, weshalb Benchmark #311 existiert.

Böckelers Taxonomie liefert die strukturelle Einsicht. Sie unterscheidet komputationale Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferentiellen Sensoren (semantisch, teuer, probabilistisch). Hebbische Verstärkung ist ein computionaler Prozess, der bei jeder Ko-Aktivierung automatisch läuft. Aber Vasana-Erkennung erfordert inferentielles Urteilsvermögen: „Diese Assoziation ist stark, aber ist sie *korrekt* für diese Anfrage?" Kein Frequenzzähler kann das beantworten.

Der fehlende Mechanismus in MuninnDB ist explizite hebbische *Abschwächung*: nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag ein False-Positive-Abrufen produziert. Wenn ein Agent auf Grundlage eines hebbisch abgerufenen Eintrags handelt und die Aktion fehlschlägt, sollte das Assoziationsgewicht sinken, statt einfach darauf zu warten, dass Ebbinghaus es mit der Zeit erodiert. Aber: Das ist ein neuer Schreibpfad in Dream Engine, und das „Benchmark-First"-Prinzip gilt. Kein Feature wird released, ohne dass es Belege dafür gibt, dass das aktuelle Verhalten Schaden anrichtet.

Testbare Hypothese für [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die offenen Voraussetzung. Kein Feature geht live, bevor die Daten vorliegen. Miss die False-Positive-Abrufraten für hebbisch verstärkte Einträge im Vergleich zu nicht verstärkten Einträgen. Aber bleib nicht beim binären Hit/Miss stehen. Die schärfere Metrik ist die *Verdrängungsrate*: Wie oft drängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k hinaus? Das ist die direkte Vasana-Messung: nicht nur „falsche Sache abgerufen", sondern „richtige Sache durch habituelles Abrufen verdrängt". Wenn verstärkte Einträge messbare Verdrängung erzeugen, ist Vairagya als Design-Primitiv empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir lassen die Komplexität weg.

---

## 3. Pratyahara: Die Kraft der bewussten Ausblendung

[*Pratyahara*](https://de.wikipedia.org/wiki/Pratyahara) (Yogasutra 2.54) wird oft mit „Rückzug der Sinne" übersetzt, aber das ist irreführend. Es ist keine Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren noch. Sie ziehen den Geist nur nicht mehr zu jedem Reiz hin. Du entscheidest, was ins Bewusstsein gelangt, statt auf alles zu reagieren, was ankommt.

Das ist das zentrale Problem des Context-Engineerings, und Meta-Harness's überraschendstes Ergebnis bestätigt es. Die gewinnenden Harnesses sind nicht die, die das Kontextfenster mit allem vollstopfen, was verfügbar ist. Der Gewinner der Textklassifikation nutzt TF-IDF mit kontrastiven Paaren und Label-Priming. Der Gewinner des Mathematik-Abrufs ist ein vierstufiges BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlpolicies. Keine exotischen Architekturen.

Böckeler fasst es als „keep quality left" zusammen: Je früher du filterst, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre komputationalen Guides (Linter, Schemas, CLAUDE.md-Regeln) sind Pratyahara-Mechanismen: Sie verhindern, dass ganze Kategorien von Informationen das Modell überhaupt erreichen.

Die erste Version dieses Posts argumentierte, dass das Memory Trait-Interface Ablehnungsmetadaten zusammen mit den Ergebnissen zurückgeben sollte. „Diese 3 Einträge haben gepasst und diese 5 wurden wegen X ausgeschlossen." Mehr diagnostisches Signal für den LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das Pratyahara-Prinzip selbst erklärt, warum.

Pratyahara bedeutet, dass die Sinne aufhören, den Geist zu ihren Objekten zu ziehen. Wenn du dem LLM sagst: „Hier sind 5 Dinge, die ich dir bewusst vorenthalte", hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Rückzug der Sinne. Das ist Sinnesstimulation mit einem Warnhinweis. Jeder, der meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten" garantiert, dass du an den weißen Elefanten denken wirst. Konkret: Ablehnungserklärungen verbrauchen Tokens (was dem Meta-Harness-Befund widerspricht, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch"). Unwesentlicher Kontext verschlechtert die Modellleistung, selbst wenn er technisch akkurat ist, und Ausschlussmetadaten sind per Definition für die aktuelle Aufgabe unwesentlich.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Das Memory Trait-Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abruf-Implementierung protokolliert intern die vollständige Entscheidung: Was zurückgegeben wurde, was ausgeschlossen wurde, warum und was der Agent als Nächstes tat. Der Benchmark verbraucht die Logs. Der Agent verbraucht die Einträge.

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

Der Agent sieht `excluded` niemals. Der Benchmark-Harness sieht das alles. Wenn `entry_089` die richtige Antwort war und wegen eines niedrigen Hebbian-Gewichts herausgefiltert wurde, taucht dies im Trace auf, und die nächste Iteration der Abruf-Policy kann sich anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein komputationaler Guide (es bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein komputationaler Sensor (es beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *dem gefilterten System ist die Ausschließung bewusst*. Es ist bewusstes Filtern im Sinne von *dem Designer ist es bewusst*, durch die Trace-Logs, sodass die nächste Iteration des Filters sich verbessert. Das Bewusstsein gehört dem Harness-Ingenieur, der die Traces liest, nicht dem Agenten, der die Abfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [*Koshas*](https://de.wikipedia.org/wiki/Kosha_(Philosophie)) (vedische Körperschichten: physisch, energetisch, mental, diskriminierend, Glückseligkeit) eine Hierarchie von grob zu subtil, wobei das Subtile als „höher" gilt. Harness-Engineering hat keine solche Wertehierarchie. Ein deterministischer Linter ist nicht „niedriger" als ein LLM-as-Judge. Böckeler weist explizit darauf hin, dass komputationale Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferentielle Kontrollen teuer und probabilistisch sind. In der Praxis willst du die „grobe" Schicht *maximieren*, nicht transzendieren. Die Kosha-Hierarchie ins Harness-Design zu importieren, würde dazu führen, dass du zu viel in inferentielle Kontrollen und zu wenig in deterministische investierst. Das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis auf die Befreiung vom Zyklus konditionierter Reaktionen ab. Agenten-Architektur zielt auf eine *effektive* konditionierte Reaktion ab. Du willst, dass der Agent zuverlässige Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet, *alle* Anhaftungen loszulassen. Im Harness-Engineering bedeutet es, *falsche* Anhaftungen loszulassen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Den vollständigen soteriologischen Rahmen zu importieren, würde zu einem Agenten führen, der Erleuchtung erlangt, indem er sich weigert, irgendetwas abzurufen. Unhilfreich.

---

## Was das nicht ist

Das ist kein „uralte Weisheit bestätigt meine Architektur". Der Kausalpfeil läuft in die andere Richtung: Die kontemplativen Traditionen haben über Jahrtausende systematischer Introspektion ausgefeilte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung entwickelt. Dass einige dieser Modelle Ergebnisse in der Agent-Speicher-Forschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering am selben Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Das ist auch nicht der erste Versuch an dieser Schnittstelle. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und der Nachfolger Maṇḍūkya-APO mappen vedische Bewusstseinszustände (die vier Zustände der Māṇḍūkya Upaniṣad: Wachen, Träumen, Tiefschlaf, transzendent) auf einen Wach-Schlaf-Konsolidierungszyklus für RL-Agenten, formalisiert mit Kategorientheorie. Die architektonische Intuition ist stichhaltig und das Mapping ist ernsthaft gemeint. Aber beide Papers sind explizit konzeptionelle Rahmenwerke ohne empirische Validierung. Die Benchmarks, die sie vorschlagen (FurnitureBench, Atari-57, Intel Loihi), wurden nicht durchlaufen. Die Lücke zwischen „vorgeschlagenem Framework" und „gemessenem Ergebnis" ist dort, wo die meisten interdisziplinären Arbeiten sterben. Die drei unten stehenden Hypothesen sind darauf ausgelegt, dort nicht zu sterben.

Die nützliche Frage ist nicht „Ist Yoga relevant für AI?", sondern „welche spezifischen yogischen Unterscheidungen produzieren testbare Hypothesen, die aktuelle Speichersysteme nicht aufstellen?"

Drei Kandidaten, alle abhängig von derselben Voraussetzung:

Ergebnisgetaggter Verfall (vrtti nirodha) erfordert [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), um zu zeigen, dass einheitlicher Verfall die Abrufqualität bei Einträgen mit unterschiedlichen Ergebnishistorien kostet. Hebbische Verdrängung (vairagya) erfordert denselben Benchmark, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beide reduzieren sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss die Abrufpräzision erfasst, aufgeschlüsselt nach Eintrags-Eigenschaften, abbilden**: Hebbian-Gewicht, Zugriffshäufigkeit, Ergebnishistorie. Wenn die Daten ein Problem zeigen, sind die Lösungen unkompliziert. Wenn nicht, lassen wir die Komplexität weg.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Der Benchmark-Harness erfasst die vollständige Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur schon.

Für keines davon muss man an Chakren glauben. Sie erfordern, die Unterscheidungen ernsthaft als Engineering-Heuristiken zu nehmen und zu messen, ob sie den Agent-Recall bei realistischen Workloads verbessern. Drei Kandidaten liegen auf dem Tisch. Der Benchmark entscheidet.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, komputational, inferentiell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirische Belege dafür, dass Harness-Änderungen 6-fache Performance-Lücken erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), die nächste Vorarbeit, die Vedanta auf Agenten-Architektur mapped (konzeptionell, noch keine Benchmarks). Yogasutren 1.2-1.16, das Aufmerksamkeitsfilter-Modell, das all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Hrafn](https://github.com/5queezer/hrafn), die Runtime, die auf einem 10-Dollar-Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine leichte Agenten-Runtime in Rust. Vorheriger Post: [Warum KI-Agenten Schlaf brauchen](/blog/why-ai-agents-need-sleep/).*