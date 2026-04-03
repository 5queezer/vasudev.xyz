---
title: "Patanjali hatte die Filter‑Spezifikation. Wir haben einfach die Tests geschrieben."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Drei yogische Prinzipien, die empirische Ergebnisse in der Agent-Harness-Forschung vorhersagen. 2000 Jahre altes Handbuch, moderne Benchmarks."
translationHash: "e471215884a5b95b08a6e2f6fb54d144"
---
Ich habe letzte Woche zwei Papers und einen [Fowler-Artikel](https://martinfowler.com/articles/harness-engineering.html) über Harness-Engineering gelesen – den Code, der ein LLM umschließt und bestimmt, was gespeichert, abgerufen und dem Modell präsentiert wird. Auf halbem Weg durch Birgitta Böckelers Taxonomie von Leitplanken und Sensoren wurde mir klar, dass ich diese Architektur schon einmal gesehen hatte. Nicht in einer Codebase. In den [Yoga-Sutras](https://de.wikipedia.org/wiki/Yogasutras_des_Patanjali).

**Die kontemplativen Traditionen haben Context Engineering vor 2000 Jahren gelöst. Die Agenten-Community entdeckt ihre Antworten nun wieder – Ablationsstudie für Ablationsstudie.**

Das klingt nach der Art von Behauptung, für die man bei Hacker News ausgelacht wird. Also stütze ich das mit drei konkreten Zuordnungen, bei denen yogische Prinzipien empirische Ergebnisse aus [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) vorhersagen – und sich nicht nur damit reimt.

## 1. Vrtti Nirodha: Nicht alles Rauschen ist gleich

Yoga Sutra 1.2 definiert Yoga als *chitta vrtti nirodha* – das Zur-Ruhe-Kommen der Schwankungen im Geistfeld. Patanjali sagt nicht „Lösche alles." Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Todesangst) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugenaussage). Die Praxis ist chirurgisch: Reduziere die Verzerrungen, erhalte das Signal.

OpenAI's Harness-Engineering-Post bezeichnet denselben Vorgang als „Entropy Management" – periodische Aufräum-Agenten, die dem Verfall der Codebasis entgegenwirken. [Dream Engine](/blog/why-ai-agents-need-sleep/), das Konsolidierungssystem von MuninnDB, arbeitet mit aufgeteilten Ähnlichkeitsschwellenwerten: 0,95 für normales Deduplizieren, 0,85 im Dream Mode. Doch keines der Systeme fragt sich, *welche Art* von Redundanz es entfernt.

Meta-Harness hat bewiesen, dass das einen Unterschied macht. Ihre [kritische Ablationsstudie (Tabelle 3)](https://arxiv.org/abs/2603.28052) zeigte, dass von LLMs generierte Zusammenfassungen von Ausführungs-Traces *schlechter* abschnitten als reine Rohwerte – 38,7 % gegenüber 41,3 %. Vollständige Roh-Traces kamen auf 56,7 %. Die Zusammenfassungen waren ein misslungenes *vrtti nirodha*: Sie warfen *Pramana* (diagnostisches Signal) zusammen mit *Klesha* (Rauschen) über Bord und zerstörten damit die Informationen, die der Optimierer benötigte.

Die Designkonsequenz für [MuninnDB](https://github.com/scrypster/muninndb): Verfallsgrenzen sollten das Ergebnis widerspiegeln, nicht nur die Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Versuch könnten identische Abrufquoten haben, aber einen radikal unterschiedlichen Aufbewahrungswert. Die Vault-Vertrauensstufen sortieren bereits nach Inhaltssensitivität (legal, Arbeit, privat). Doch im offensichtlichen nächsten Schritt lauert eine Falle.

Man könnte versuchen, Einträge von vornherein als Pramana oder Klesha zu klassifizieren – verifiziert vs. verzerrt –, doch diese Klassifizierung ist selbst das eigentliche Kernproblem. Bei trivialen Fällen (HTTP 200 vs. 401) ist es mechanisch. Bei den meisten Einträgen erfordert sie semantische Urteilsfähigkeit, was ein LLM im Verfallspfad bedeuten würde, was die Konsolidierung teuer und nichtdeterministisch macht. Patanjali hatte ein Leben lang Zeit, seine Unterscheidungskraft zu verfeinern. Dream Engine läuft per Cron-Trigger.

Der einfachere Weg: **ergebnisgetaggte Schreibvorgänge**. Wenn ein Agent einen Eintrag abruft und die nachfolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Schlägt die Aktion fehl, `outcome: failure`. Die Verfallsgrenze koppelt an die Erfolgsquote, nicht an eine epistemische Kategorie. Das ist im Wesentlichen Banditen-Feedback beim Abruf – eine Idee, die im Information Retrieval gut etabliert ist und hier auf den persistenten Agentenspeicher angewendet wird. Keine Ontologie nötig. Kein LLM in der Schleife. In yogischen Begriffen: Du musst die Vrtti nicht im Voraus klassifizieren – du beobachtest ihre Wirkung und lässt diese Beobachtung die Aufbewahrung steuern.

---

## 2. Samskara und Vairagya: Verstärkung braucht ein Gegengewicht

Das yogische Konzept der [Samskaras](https://de.wikipedia.org/wiki/Samskara) beschreibt latente Eindrücke, die die zukünftige Wahrnehmung prägen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Furche. Das ist hebb'sches Lernen – „Neuronen, die zusammen feuern, verbinden sich" – und MuninnDB setzt es direkt um: Einträge, die gemeinsam aktiviert werden, verstärken ihre Assoziationsgewichte.

Die Yoga-Sutras warnen, dass sich Samskaras akkumulieren. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht-Anhaften, die Fähigkeit, starke Assoziationen loszulassen) verkalken sie zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana) – automatischen Reaktionsmustern, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und beginnt, ein Skript abzuspulen.

[MemoryBench](https://arxiv.org/abs/2510.17281) liefert indirekte Belege. Sein zentrales Ergebnis: State-of-the-Art-Speichersysteme (A-Mem, Mem0, MemoryOS) schneiden nicht durchweg besser ab als naive RAG-Baselines, die einfach aus dem Rohkontext abrufen. Das Paper isoliert hebb'sche Verstärkung nicht als Ursache, aber das Muster passt: Systeme, die Erinnerungen verarbeiten, konsolidieren und verstärken, schneiden *schlechter* ab als Systeme, die einfach alles unverändert speichern und abrufen. Etwas in der Konsolidierungspipeline zerstört Signal. Die Vasana-Hypothese – dass verstärkte Assoziationen weniger aktivierte, aber relevantere Alternativen verdrängen – ist eine Erklärung. Sie erfordert direkte Messung, weshalb es Benchmark #311 gibt.

Böckelers Taxonomie liefert die strukturelle Einsicht. Sie unterscheidet computational Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferentiellen Sensoren (semantisch, teuer, probabilistisch). Hebb'sche Verstärkung ist ein computacionaler Prozess – sie läuft automatisch bei jeder gemeinsamen Aktivierung. Vasana-Erkennung erfordert jedoch inferentielles Urteilen: „Diese Assoziation ist stark, aber ist sie für diese Anfrage *korrekt*?" Kein Frequenzzähler kann das beantworten.

Der fehlende Mechanismus in MuninnDB ist explizite hebb'sche *Abschwächung* – nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen False-Positive-Abruf produziert. Wenn ein Agent auf einem hebb'sch abgerufenen Eintrag agiert und die Aktion fehlschlägt, sollte das Assoziationsgewicht sinken, anstatt nur darauf zu warten, dass es Ebbinghaus im Laufe der Zeit erodiert. Aber: Das ist ein neuer Schreibpfad in Dream Engine, und das Benchmark-First-Prinzip gilt. Kein Feature wird veröffentlicht, ohne dass es Beweise dafür gibt, dass das aktuelle Verhalten Schaden anrichtet.

Testbare Hypothese für [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) – die offene Voraussetzung; kein Feature wird released, bevor die Daten existieren. Misst die False-Positive-Abrufraten für hebb'sch verstärkte Einträge im Vergleich zu nicht verstärkten Einträgen. Bleib aber nicht bei binär Treffer/Fehltreffer stehen. Die schärfere Metrik ist die *Verdrängungsrate* – wie oft verdrängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „Falsches abgerufen", sondern „Richtiges durch gewohnheitsmäßigen Abruf verdrängt." Wenn verstärkte Einträge eine messbare Verdrängung erzeugen, ist Vairagya als Design-Primitive empirisch gerechtfertigt. Wenn nicht, reicht der aktuelle passive Verfall aus und wir sparen uns die Komplexität.

---

## 3. Pratyahara: Die Kraft der bewussten Ausblendung

Das Konzept von [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) wird oft als „Rückzug der Sinne" übersetzt, aber das ist irreführend. Es ist keine Blindheit – es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiter, aber sie ziehen den Geist nicht mehr zu jedem Stimulus. Du entscheidest, was ins Bewusstsein gelangt, anstatt auf alles zu reagieren, was ankommt.

Das ist das Kernproblem des Context Engineerings, und Meta-Harness' überraschendstes Ergebnis bestätigt es. Die gewinnenden Harnesses sind nicht die, die das Kontextfenster mit allem verfügbaren vollstopfen. Der Sieger in der Textklassifikation nutzt TF-IDF mit kontrastiven Paaren und Label-Priming. Der Sieger im Math-Retrieval ist ein Vier-Routen-BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlrichtlinien. Keine exotischen Architekturen.

Böckeler fasst es als „keep quality left" (Qualität nach links verlagern) zusammen – je früher du filterst, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre computational Guides (Linter, Schemas, CLAUDE.md-Regeln) sind Pratyahara-Mechanismen: Sie verhindern, dass ganze Kategorien von Informationen überhaupt das Modell erreichen.

Die erste Version dieses Posts argumentierte, dass die Memory Trait Interface Ablehnungs-Metadaten neben den Ergebnissen zurückgeben sollte – „diese 3 Einträge stimmten überein und diese 5 wurden wegen X ausgeschlossen." Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das Pratyahara-Prinzip selbst erklärt warum.

Pratyahara bedeutet, dass die Sinne *aufhören, den Geist zu ihren Objekten zu ziehen*. Wenn du dem LLM sagst „hier sind 5 Dinge, die ich dir bewusst vorenthalte", hast du ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Rückzug der Sinne – das ist Sinnesstimulation mit Warnschild. Jeder, der meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten" garantiert, dass du an den weißen Elefanten denkst. Konkret: Ablehnungserklärungen verbrauchen Tokens (was dem Meta-Harness-Ergebnis widerspricht, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch"). RAG-Systeme, die negativen Kontext einbeziehen, schneiden empirisch schlechter ab als solche, die einfach nur Top-k liefern.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Der Benchmark-Harness sieht alles.** Die Memory Trait Interface bleibt schlank – `retrieve → Vec<Entry>`. Aber die Retrieval-Implementierung protokolliert intern die vollständige Entscheidung: was zurückgegeben wurde, was ausgeschlossen wurde, warum und was der Agent als Nächstes tat. Der Benchmark konsumiert die Logs. Der Agent konsumiert die Einträge.

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

Der Agent sieht `excluded` niemals. Der Benchmark-Harness sieht all das. Wenn `entry_089` die richtige Antwort war und gefiltert wurde, weil sein hebb'sches Gewicht niedrig war, taucht das im Trace auf – und die nächste Iteration der Retrieval-Richtlinie kann sich anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein computacionaler Guide (es bestimmt, was in den Kontext gelangt). Das Trace-Log ist ein computacionaler Sensor (es beobachtet, was passiert ist). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *dem gefilterten System, das sich der Ausblendung bewusst ist*. Es ist bewusstes Filtern im Sinne von *dem Designer, der sich bewusst ist*, durch die Trace-Logs, damit sich die nächste Iteration des Filters verbessert. Das Bewusstsein gehört dem Harness-Engineer, der die Traces liest, nicht dem Agenten, der die Queries ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedische Körperschichten – physisch, energetisch, mental, diskriminativ, Glückseligkeit) eine Hierarchie von grob zu subtil, wobei das Subtile „höher" ist. Harness-Engineering kennt keine solche Wertordnung. Ein deterministischer Linter ist nicht „niedriger" als ein LLM-as-Judge. Böckeler merkt explizit an, dass computational Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferentielle Controls teuer und probabilistisch sind. In der Praxis willst du die „grobe" Schicht *maximieren*, nicht transzendieren. Die Kosha-Hierarchie ins Harness-Design zu importieren, würde dich dazu verleiten, zu viel in inferentielle Controls und zu wenig in deterministische zu investieren – das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis auf Befreiung aus dem Zyklus konditionierter Reaktionen ab. Agentenarchitektur zielt auf *effektive* konditionierte Reaktionen ab – du willst, dass der Agent verlässliche Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet, *alle* Anhaftungen loszulassen; im Harness-Engineering bedeutet es, *falsche* Anhaftungen loszulassen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Das vollständige soteriologische Rahmenwerk zu importieren, würde zu einem Agenten führen, der Erleuchtung dadurch erlangt, dass er sich weigert, überhaupt etwas abzurufen. Unbrauchbar.

---

## Was das nicht ist

Das ist kein „uralte Weisheit validiert meine Architektur." Der kausale Pfeil zeigt in die andere Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion hochentwickelte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agentenspeicherforschung vorhersagen, ist nicht mystisch – es ist konvergentes Engineering am selben Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Drei Kandidaten stehen zur Diskussion. Ergebnisgetaggter Verfall (Vrtti Nirodha) erfordert [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), um zu zeigen, dass gleichmäßiger Verfall die Abrufqualität bei Einträgen mit unterschiedlicher Ergebnishistorie kostet. Hebb'sche Verdrängung (Vairagya) erfordert denselben Benchmark, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beides läuft auf eine Engineering-Aufgabe hinaus: **Das Trace-Schema muss die Abrufpräzision aufgeschlüsselt nach Eintragseigenschaften erfassen** – hebb'sches Gewicht, Zugriffshäufigkeit, Ergebnishistorie. Wenn die Daten ein Problem zeigen, sind die Fixes unkompliziert. Wenn nicht, sparen wir uns die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Der Benchmark-Harness erfasst die vollständige Retrieval-Entscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Engineer schon.

Keines davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen ernst als Engineering-Heuristiken zu nehmen und zu messen, ob sie den Agenten-Recall unter realistischen Workloads verbessern. Der Benchmark entscheidet.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) – die Taxonomie (Guides, Sensoren, computational, inferentiell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052) – empirische Belege, dass Harness-Änderungen 6-fache Leistungsunterschiede erzeugen. Yoga Sutras 1.2-1.16 – die Aufmerksamkeitsmanagement-Spec, die all dem vorausgeht. [MuninnDB](https://github.com/scrypster/muninndb) – dort, wo die Hypothesen getestet werden. [Hrafn](https://github.com/5queezer/hrafn) – die Runtime, die auf einem 10-Dollar-Raspberry Pi läuft.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige Agenten-Runtime in Rust. Vorheriger Post: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*