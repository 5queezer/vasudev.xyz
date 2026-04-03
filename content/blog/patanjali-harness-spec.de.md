---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Drei yogische Prinzipien, die empirische Ergebnisse in der Agent-Harness-Forschung vorhersagen. 2000 Jahre altes Handbuch, moderne Benchmarks."
translationHash: "e75092fb9dd33da0674b24df6bb99172"
---
Letzte Woche habe ich zwei Papers und einen [Fowler-Artikel](https://martinfowler.com/articles/harness-engineering.html) über Harness-Engineering gelesen – den Code, der ein LLM umgibt und bestimmt, was gespeichert, abgerufen und dem Modell präsentiert wird. Mitten in Birgitta Böckelers Taxonomie von Guides und Sensoren wurde mir klar, dass ich diese Architektur schon einmal gesehen hatte. Nicht in einer Codebasis. In den Yoga-Sutren.

**Die kontemplativen Traditionen haben das Context-Engineering vor 2000 Jahren gelöst. Die Agent-Community entdeckt ihre Antworten neu, eine Ablationsstudie nach der anderen.**

Das klingt nach der Art von Behauptung, für die man auf Hacker News ausgelacht wird. Also lasst mich das mit drei konkreten Zuordnungen untermauern, bei denen yogische Prinzipien empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) vorhersagen – und nicht nur zufällig dazu passen.

## 1. Vrtti Nirodha: Nicht jedes Rauschen ist gleich

Yoga Sutra 1.2 definiert Yoga als *chitta vrtti nirodha* – das Zur-Ruhe-Kommen der Schwankungen im Geistesfeld. Patanjali sagt nicht „Lösche alles." Er unterscheidet *Kleshas* (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Todesangst) von *Pramanas* (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, bewahre das Signal.

OpenAis Beitrag zum Harness-Engineering nennt denselben Vorgang „Entropy Management" – periodische Cleanup-Agenten, die dem Verfall der Codebasis entgegenwirken. [Dream Engine](/blog/why-ai-agents-need-sleep/), das Konsolidierungssystem von MuninnDB, erledigt dies mit geteilten Ähnlichkeitsschwellwerten: 0,95 für normales Deduplizieren, 0,85 im Dream-Modus. Doch keines der Systeme fragt, *welche Art* von Redundanz entfernt wird.

Meta-Harness hat bewiesen, dass dies wichtig ist. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) zeigte, dass von LLMs generierte Zusammenfassungen von Ausführungs-Traces *schlechter* abschnitten als rohe Werte allein – 38,7 % gegenüber 41,3 %. Vollständige Roh-Traces erreichten 56,7 %. Die Zusammenfassungen waren fehlgeleitetes Vrtti Nirodha: Sie kollabierten *Pramana* (diagnostisches Signal) zusammen mit *Klesha* (Rauschen) und zerstörten damit die Informationen, die der Optimierer benötigte.

Die Design-Implikation für [MuninnDB](https://github.com/scrypster/muninndb): Verfallsuntergrenzen sollten Ergebnisse widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Versuch könnten identische Abruffrequenzen, aber einen radikal anderen Erhaltswert haben. Die Vault-Trust-Stufen sortieren bereits nach Inhaltssensitivität (rechtlich, Arbeit, privat). Doch im offensichtlichen nächsten Schritt lauert eine Falle.

Man könnte versuchen, Einträge im Voraus als Pramana oder Klesha zu klassifizieren – verifiziert gegenüber verzerrt –, aber diese Klassifizierung ist selbst das harte Problem. Für triviale Fälle (HTTP 200 vs. 401) ist es mechanisch. Für die meisten Einträge erfordert es semantisches Urteilsvermögen, was einen LLM im Verfallspfad bedeutet, was die Konsolidierung teuer und nichtdeterministisch macht. Patanjali hatte ein Leben lang Praxis, um seine Unterscheidungskraft zu verfeinern. Dream Engine läuft über einen Cron-Trigger.

Der einfachere Weg: **ergebnismarkierte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die nachfolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Schlägt die Aktion fehl, `outcome: failure`. Die Verfallsuntergrenze koppelt an die Erfolgsrate, nicht an eine epistemische Kategorie. Das ist im Wesentlichen Bandit-Feedback beim Abruf – eine im Information-Retrieval gut etablierte Idee, die hier auf persistentes Agentengedächtnis angewendet wird. Keine Ontologie nötig. Kein LLM im Loop. In yogischen Begriffen: Man muss die Vrtti nicht im Voraus klassifizieren – man beobachtet ihre Wirkung und lässt diese Beobachtung die Speicherung formen.

---

## 2. Samskara und Vairagya: Verstärkung braucht ein Gegengewicht

Samskaras sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur; wiederholte Erfahrungen vertiefen die Furche. Dies ist Hebbsches Lernen – „neurons that fire together wire together" – und MuninnDB implementiert es direkt: Einträge, die gemeinsam aktiviert werden, verstärken ihre Assoziationsgewichte.

Die Yoga-Sutren warnen davor, dass sich Samskaras aufschaukeln. Ohne das Gegengewicht von *Vairagya* (Nicht-Anhaftung, die Fähigkeit, starke Assoziationen loszulassen) verkalken sie zu *Vasanas* – automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und beginnt stattdessen, das Skript abzuspielen.

[MemoryBench](https://arxiv.org/abs/2510.17281) liefert indirekte Beweise. Seine zentrale Erkenntnis: State-of-the-Art-Gedächtnissysteme (A-Mem, Mem0, MemoryOS) schlagen naive RAG-Baselines, die einfach aus dem Rohkontext abrufen, nicht konsistent. Das Paper isoliert die hebbische Verstärkung nicht als Ursache, aber das Muster passt: Systeme, die Erinnerungen verarbeiten, konsolidieren und verstärken, schneiden *schlechter* ab als Systeme, die einfach alles unverändert speichern und abrufen. Etwas in der Konsolidierungspipeline zerstört das Signal. Die Vasana-Hypothese – dass verstärkte Assoziationen weniger aktivierte, aber relevantere Alternativen verdrängen – ist eine Erklärung. Sie bedarf direkter Messung, weshalb Benchmark #311 existiert.

Böckelers Taxonomie liefert die strukturelle Erkenntnis. Sie unterscheidet rechnerische Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Hebbische Verstärkung ist ein rechnerischer Prozess – sie läuft automatisch bei jeder Kokoaktivierung. Die Vasana-Erkennung erfordert jedoch inferenzielles Urteilsvermögen: „Diese Assoziation ist stark, aber ist sie für diese Anfrage *korrekt*?" Kein Häufigkeitszähler kann das beantworten.

Der fehlende Mechanismus in MuninnDB ist die explizite hebbische *Abschwächung* – nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag ein False-Positive-Abruf erzeugt. Wenn ein Agent aufgrund eines hebbisch abgerufenen Eintrags handelt und die Aktion fehlschlägt, sollte das Assoziationsgewicht sinken, anstatt nur darauf zu warten, dass Ebbinghaus es im Laufe der Zeit erodiert. Aber: Das ist ein neuer Schreibpfad in Dream Engine, und das Benchmark-First-Prinzip gilt. Kein Feature wird ausgeliefert, ohne dass es Belege dafür gibt, dass das aktuelle Verhalten Schaden verursacht.

Testbare Hypothese für [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) – die offene Voraussetzung; kein Feature wird ausgeliefert, bevor die Daten existieren. Miss die False-Positive-Abrufraten für hebbisch verstärkte Einträge im Vergleich zu nicht verstärkten Einträgen. Halte aber nicht bei binärem Treffer/Fehlschlag an. Die schärfere Metrik ist die *Verdrängungsrate* – wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus dem Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsches Ding abgerufen", sondern „richtiges Ding durch gewohnheitsmäßigen Abruf verdrängt". Wenn verstärkte Einträge messbare Verdrängung erzeugen, ist Vairagya als Design-Primitive empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir überspringen die Komplexität.

---

## 3. Pratyahara: Die Kraft des bewussten Ausschlusses

Pratyahara (Yoga Sutra 2.54) wird oft als „Rückzug der Sinne" übersetzt, das ist jedoch irreführend. Es ist keine Blindheit – es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiterhin; sie hören nur auf, den Geist zu jedem Reiz hin zu ziehen. Du entscheidest, was ins Bewusstsein tritt, anstatt auf alles zu reagieren, was ankommt.

Das ist das zentrale Problem des Context-Engineering, und das überraschendste Ergebnis von Meta-Harness bestätigt es. Die siegreichen Harnesses sind nicht diejenigen, die das Kontextfenster mit allem verfügbaren Material vollstopfen. Der Sieger in der Textklassifizierung nutzt TF-IDF mit kontrastiven Paaren und Label-Priming. Der Sieger im mathematischen Abruf ist ein BM25-Programm mit vier Routen und lexikalischen Prädikaten. Einfache Auswahlpolicies. Keine exotischen Architekturen.

Böckeler fasst dies als „keep quality left" zusammen – je früher man filtert, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre rechnerischen Guides (Linter, Schemata, CLAUDE.md-Regeln) sind Pratyahara-Mechanismen: Sie verhindern, dass ganze Informationskategorien das Modell überhaupt erreichen.

Die erste Version dieses Posts argumentierte, dass das Memory-Trait-Interface neben den Ergebnissen auch Ablehnungsmetadaten zurückgeben sollte – „diese 3 Einträge passten, und diese 5 wurden ausgeschlossen, weil X." Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das Pratyahara-Prinzip selbst erklärt, warum.

Pratyahara bedeutet, dass die Sinne *aufhören, den Geist zu ihren Objekten zu ziehen*. Wenn du dem LLM sagst „hier sind 5 Dinge, die ich dir bewusst vorenthalte", hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Sinnesrückzug – das ist Sinnesstimulation mit Warnhinweis. Jeder, der meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten" garantiert, dass du an den weißen Elefanten denkst. Konkret: Ablehnungserklärungen verbrauchen Tokens (im Widerspruch zur Meta-Harness-Erkenntnis, dass einfache Harnesses gewinnen) und laden das Modell dazu ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch"). RAG-Systeme, die negativen Kontext einbeziehen, schneiden empirisch schlechter ab als solche, die einfach nur Top-k liefern.

Die richtige Trennung: **der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Das Memory-Trait-Interface bleibt schlank – `retrieve → Vec<Entry>`. Aber die Abrufimplementierung protokolliert intern die vollständige Entscheidung: Was wurde zurückgegeben, was ausgeschlossen, warum und was der Agent als Nächstes tat. Der Benchmark-Harness konsumiert die Logs. Der Agent konsumiert die Einträge.

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

Der Agent sieht `excluded` niemals. Der Benchmark-Harness sieht alles. Wenn `entry_089` die richtige Antwort war und gefiltert wurde, weil sein hebbisches Gewicht niedrig war, erscheint das im Trace – und die nächste Iteration der Abrufpolicy kann sich anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein rechnerischer Guide (er bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein rechnerischer Sensor (er beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *dass das gefilterte System sich des Ausschlusses bewusst ist*. Es ist bewusstes Filtern im Sinne von *dass der Designer sich bewusst ist*, durch die Trace-Logs, sodass die nächste Iteration des Filters sich verbessert. Das Bewusstsein gehört dem Harness-Ingenieur, der die Traces liest, nicht dem Agenten, der die Anfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die Koshas (vedantische Körperschichten – physisch, energetisch, mental, diskriminierend, Glückseligkeit) eine Hierarchie vom Groben zum Subtilen, wobei das Subtile „höher" ist. Harness-Engineering kennt keine solche Wertordnung. Ein deterministischer Linter ist nicht „niedriger" als ein LLM-as-Judge. Böckeler merkt explizit an, dass rechnerische Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferenzielle Kontrollen teuer und probabilistisch sind. In der Praxis willst du die „grobe" Schicht *maximieren*, nicht transzendieren. Die Kosha-Hierarchie ins Harness-Design zu importieren, würde dazu führen, dass du zu viel in inferenzielle Kontrollen investierst und zu wenig in deterministische – das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis auf die Befreiung vom Zyklus konditionierter Reaktionen ab. Agentenarchitektur zielt auf *effektive* konditionierte Reaktionen ab – du möchtest, dass der Agent verlässliche Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet das Loslassen *aller* Anhaftung; im Harness-Engineering bedeutet es das Loslassen *falscher* Anhaftungen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Das vollständige soteriologische Framework zu importieren, würde zu einem Agenten führen, der Erleuchtung erreicht, indem er sich weigert, irgendetwas abzurufen. Unpraktisch.

---

## Was das nicht ist

Das ist nicht „uralte Weisheit bestätigt meine Architektur." Der kausale Pfeil zeigt in die andere Richtung: Die kontemplativen Traditionen haben über Jahrtausende systematischer Introspektion ausgefeilte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung entwickelt. Dass einige dieser Modelle Ergebnisse in der Forschung zu Agentengedächtnis vorhersagen, ist nicht mystisch – es ist konvergentes Engineering für dasselbe Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Drei Kandidaten stehen zur Diskussion. Ergebnismarkierter Verfall (Vrtti Nirodha) erfordert [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), um zu zeigen, dass einheitlicher Verfall die Abrufqualität bei Einträgen mit unterschiedlichen Ergebnisverläufen beeinträchtigt. Hebbische Verdrängung (Vairagya) erfordert denselben Benchmark, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss die Abrufpräzision erfasst, aufgeschlüsselt nach Eintrageigenschaften** – hebbisches Gewicht, Zugriffshäufigkeit, Ergebnisverlauf. Wenn die Daten ein Problem zeigen, sind die Korrekturen einfach. Wenn nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait liefert Top-k, Punkt. Der Benchmark-Harness erfasst die vollständige Abrufentscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur schon.

Nichts davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen ernsthaft als Engineering-Heuristiken zu nehmen und zu messen, ob sie das Agenten-Recall bei realistischen Workloads verbessern. Der Benchmark entscheidet.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) – die Taxonomie (Guides, Sensoren, rechnerisch, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052) – empirische Belege dafür, dass Harness-Änderungen 6-fache Leistungsunterschiede erzeugen. Yoga Sutras 1.2-1.16 – die Aufmerksamkeitsmanagement-Spezifikation, die all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb) – wo die Hypothesen getestet werden. [Hrafn](https://github.com/5queezer/hrafn) – die Runtime, die auf einem 10-US-Dollar-Raspberry-Pi läuft.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige Agenten-Runtime in Rust. Vorheriger Beitrag: [Warum KI-Agenten Schlaf brauchen](/blog/why-ai-agents-need-sleep/).*