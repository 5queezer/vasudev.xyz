---
title: "Patanjali hatte die Filterspezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Drei yogische Prinzipien, die empirische Ergebnisse in der Agent-Harness-Forschung vorhersagen. 2000-jähriges Handbuch, moderne Benchmarks."
translationHash: "33ca445b99227f7b0f5eb129462e39a0"
---
Ich verbrachte letzte Woche damit, zwei Papers zu lesen und einen [Fowler-Artikel](https://martinfowler.com/articles/harness-engineering.html) über Harness-Engineering zu studieren – den Code, der einen LLM umhüllt und bestimmt, was gespeichert, abgerufen und dem Modell präsentiert wird. Halbwegs durch Birgitta Böckelers Taxonomie von Leitern und Sensoren fiel mir auf, dass ich diese Architektur bereits gesehen hatte. Nicht in einem Code‑Repository. Sondern in den [Yoga Sutras](https://de.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali).

**Die kontemplativen Traditionen haben das Context‑Engineering vor 2000 Jahren gelöst. Die Agenten‑Community entdeckt ihre Antworten, ein Ablationsstudium nach dem anderen.**

Das klingt nach einer Aussage, die dich auf Hacker News zum Narren halten würde. Also lasse ich das mit drei konkreten Zuordnungen bekräftigen, bei denen yogische Prinzipien – nicht nur im Klang, sondern auch in empirischen Ergebnissen von [Meta‑Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness‑Engineering‑Framework](https://martinfowler.com/articles/harness-engineering.html) – vorhersagen.

## 1. Vrtti Nirodha: Nicht alles Noise ist gleichYoga Sutras 1.2 definiert Yoga als *chitta vrtti nirodha* – die Aufhebung von Schwankungen im Geistfeld. Patanjali sagt nicht „lösche alles“ aus. Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha_(Hinduism)) (Verzerrungen: Anhaftung, Abneigung, Ego, Todesfurcht) von [*Pramana*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugnis). Die Praxis ist chirurgisch: Verzerrungen reduzieren, Signal erhalten.

Der OpenAI‑Post über Harness‑Engineering nennt die gleiche Operation „Entropy Management“ – periodische Aufräum‑Agenten, die Codebase‑Verfall bekämpfen. [Dream Engine](/blog/why-ai-agents-need-sleep/), das Konsolidierungssystem von MuninnDB, verwendet gestaffelte Similarity‑Schwellen: 0.95 für normale Duplikation, 0.85 im Traum‑Modus. Doch kein System fragt *welche Art* von Redundanz es entfernt.

Der Design‑Implikationen für [MuninnDB](https://github.com/scrypster/muninndb): Die Zerfallsschwellen sollten das Ergebnis widerspiegeln, nicht nur die Zugriffsfrequenz. Ein verifiziertes API‑Muster und ein gescheiterter curl‑Versuch können dieselbe Abruffrequenz haben, aber radikal unterschiedliche Verwertungs‑Werte. Die Vault‑Vertrauens‑Tiers sortieren bereits nach Inhalts‑Sensitivität (legal, Arbeit, persönlich). Aber es gibt eine Falle im offensichtlichen nächsten Schritt.

Man könnte versuchen, Einträge von vornherein als Pramana oder Klesha zu klassifizieren – als verifiziert oder verzerrt – aber diese Klassifizierung ist selbst das schwierige Problem. Für triviale Fälle (HTTP 200 vs. 401) ist es mechanisch. Für die meisten Einträge erfordert es semantische Bewertung, was einen LLM im Zerfalls‑Pfad bedeutet, was die Konsolidierung teuer und nichtdeterministisch macht. Patanjali benötigte ein Leben lang, um seine Unterscheidungsfähigkeit zu verfeinern. Dream Engine läuft auf einem Cron‑Trigger.

Der einfachere Weg: **outcome‑tagged writes**. Wenn ein Agent einen Eintrag abruft und die darauffolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`‑Signal. Bei Misserfolg gibt es `outcome: failure`. Der Zerfallsschwellwert koppelt sich an die Erfolgsrate, nicht an eine epistemische Kategorie. Das ist im Prinzip Bandit‑Feedback für Abrufe – eine Idee, die bereits in der Informations‑Abruf‑Forschung etabliert ist, hier jedoch auf dauerhafte Agent‑Speicher angewendet. Keine Ontologie nötig. Kein LLM im Loop. In yogischen Begriffen: Du musst die vrtti nicht im Voraus klassifizieren – du beobachtest deren Effekt und lässt das die Retention bestimmen.

## 2. Samskara und Vairagya: Reinforcement braucht ein Gegengewicht

Das yogische Konzept von [Samskaras](https://de.wikipedia.org/wiki/Samskara_(Indian_philosophy)) beschreibt latente Eindrücke, die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt einen Nachweis, und wiederholte Erfahrungen vertiefen die Rinne. Das ist Hebb’sches Lernen – „Neuronen, die gemeinsam feuern, verbinden sich“ – und MuninnDB implementiert das direkt: Einträge, die zusammen aktivieren, verstärken ihre Assoziations‑Gewichte.

Die Yoga Sutras warnen, dass Samskaras sich anhäufen. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht‑Anhänglichkeit, die Fähigkeit, starke Assoziationen loszulassen), verhärteten sie zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana) – automatische Reaktionsmuster, die die bewusste Bewertung umgehen. Man hört auf, die Situation zu sehen, und fängt an, das Skript abzuspielen.

[MemoryBench](https://arxiv.org/abs/2510.17281) liefert indirekte Beweise. Its central finding: state‑of‑the‑art memory systems (A‑Mem, Mem0, MemoryOS) fail to consistently outperform naive RAG baselines, die einfach von rohem Kontext abrufen. Der Artikel isoliert Hebb’sche Verstärkung nicht als Ursache, aber das Muster passt: Systeme, die Erinnerungen verarbeiten, konsolidieren und stärken, performen *schlechter* als Systeme, die alles unverändert speichern und abrufen. Etwas im Konsolidierungspfad zerstört das Signal. Die Vasana‑Hypothese – dass verstärkte Assoziationen weniger‑aktivierte, aber relevantere Alternativen verdrängen – ist eine Erklärung. Sie bedarf direkter Messung, weshalb Benchmark #311 existiert.

Böckelers Taxonomie liefert die strukturelle Einsicht. Sie unterscheidet computergestützte Sensoren (deterministisch, günstig, laufen bei jeder Änderung) von inferenziellen Sensoren (semantisch, teuer, probabilistisch). Hebb’sche Verstärkung ist ein computergestützter Prozess – er läuft automatisch bei jeder Ko‑Aktivierung. Für die Erkennung von Vasanas benötigt man jedoch inferenzielle Bewertung: „Diese Assoziation ist stark, aber ist sie *korrekt* für diese Abfrage?“ Kein Frequenz‑Counter kann das beantworten.

Der fehlende Mechanismus in MuninnDB ist explizite Hebb’sche *Schwächung* – nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen Fehl‑Positiv‑Abruf erzeugt. Wenn ein Agent auf einem Hebb’sch abgegriffenen Eintrag handelt und die Aktion fehlschlägt, sollte das Assoziations‑Gewicht sinken, nicht nur auf das Ebbinghaus‑Verwäser‑Verhalten warten. Aber: das ist ein neuer Schreib‑Pfad in Dream Engine, und dasbenchmark‑erstes Prinzip gilt. Keine Funktion wird bereitgestellt, ohne dass Belege existieren, dass das aktuelle Verhalten Schaden verursacht.

Testbare Hypothese für [benchmark #311](https://github.com/scrypster/muninndb/issues/311) – die offene Voraussetzung; keine Funktion wird bereitgestellt, bevor die Daten existieren. Miss false‑positive Abrufraten für Hebb’sch verstärkte Einträge im Vergleich zu nicht‑verstärkten Einträgen. Aber es reicht nicht, bei binary‑Hit/‑Miss zu bleiben. Die präzisere Metrik ist die *Displacement‑Rate* – wie oft drängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top‑k? Das ist die direkte Vasana‑Messung: nicht nur „falsch abgerufen“, sondern „richtig abgerufen, aber von einem habitualen Abruf verdrängt“. Wenn verstärkte Einträge messbare Vertreibung erzeugen, ist vairagya als Design‑Primitive empirisch gerechtfertigt. Wenn nicht, ist die aktuelle passive Zerfall‑Methode sufficient und wir überspringen die Komplexität.

## 3. Pratyahara: Die Macht der bewussten Ausschluss

Das Konzept von [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) wird oft als „Sinnes‑Entzug“ übersetzt, was irreführend ist. Es ist nicht Blindheit – es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiter, aber sie ziehen den Geist nicht zu jedem Reiz. Du entscheidest, was in das Bewusstsein eingeht, statt auf jedes hereinkehrende Reiz zu reagieren.

Das ist das zentrale Problem des Context‑Engineering, und das Ergebnis von Meta‑Harness bestätigt das. Die erfolgreichsten Harnesses packen das Context‑Window nicht mit allem Ausgegebenen voll. Der Sieger beim Text‑Klassifizieren nutzt TF‑IDF mit kontrastiven Paaren und Label‑Priming. Der Sieger beim mathematischen Abruf ist ein vier‑Route‑BM25‑Programm mit lexikalischen Prädikaten. Einfache Selektions‑Politiken. Keine exotischen Architekturen.

Böckeler charakterisiert das als „keep quality left“ – je früher gefiltert wird, desto günstiger und zuverlässiger das downstream‑Ergebnis. Ihre computergestützten Leitlinien (Linter, Schemas, CLAUDE.md‑Regeln) sind Pratyahara‑Mechanismen: Sie verhindern, dass ganze Kategorien von Informationen das Modell erreichen.

Die erste Version dieses Posts argumentierte, dass die Memory‑Trait‑Schnittstelle ablehnende Metadaten neben den Ergebnissen zurückgeben sollte – „diese 3 Einträge haben gepasst, und diese 5 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Das ist falsch, und das Pratyahara‑Prinzip erklärt es selbst.

Pratyahara bedeutet, dass die Sinne *nicht* zum eigenen Objekt ziehen. Wenn du dem LLM sagst „hier sind 5 Dinge, die ich bewusst von dir fernhalte“, zeigst du ihm die Objekte und fügst eine Verbotsankündigung hinzu. Das ist keine Sinnes‑Entziehung – das ist Sinnes‑Reiz mit einer Warnung. Wer meditiert hat, weiß das Ergebnis: „denk nicht an einen weißen Elefanten“ garantiert, dass du genau daran denkst. Konkreter: Ausschluss‑Erklärungen verbrauchen Token (was der Meta‑Harness‑Erkenntnis widerspricht, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich das doch“). RAG‑Systeme, die Kontext mit Negativ‑Angaben versehen, underperformen empirisch jene, die einfach Top‑k liefern.

Die richtige Trennung: **der Agent sieht nur die Top‑k‑Ergebnisse. Der Benchmark‑Harness sieht alles.** Die Memory‑Trait‑Schnittstelle bleibt schlank – `retrieve → Vec<Entry>`. Aber die Retrieval‑Implementierung protokolliert die vollständige Entscheidung intern: Was wurde zurückgegeben, was wurde ausgeschlossen, warum, und welche Aktion der Agent anschließend ausführte. Der Benchmark verbraucht die Logs. Der Agent verbraucht die Einträge.

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

Der Agent sieht `excluded` nie. Der Benchmark‑Harness sieht alles davon. Wenn `entry_089` die richtige Antwort war und wegen seines niedrigen Hebbian‑Gewichts gefiltert wurde, erscheint das in der Trace – und die nächste Iteration der Retrieval‑Policy kann sich daran anpassen.

In Böckelers Taxonomie: die Memory‑Trait ist ein computational guide (sie bestimmt, was in den Kontext eintritt). Der Trace‑Log ist ein computational sensor (er beobachtet, was geschah). Sie fusionieren nicht. Pratyahara ist keine bewusste Filterung im Sinne *des gefilterten Systems, das über die Ausschluss‑Informationen Bescheid weiß*. Es ist bewusste Filterung im Sinne *des Designers, der durch die Trace‑Logs Bescheid weiß*, sodass die nächste Filter‑Iteration sich verbessert. Das Bewusstsein gehört dem Harness‑Engineer, der die Traces liest, nicht dem Agenten, das die Abfragen ausführt.

## Where the metaphor breaks

Zwei Stellen.

Erstens, die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedische Körper‑Schichten – physisch, energetisch, mental, discriminierend, Glückseligkeit) implizieren eine Hierarchie von grob nach subtil, wobei das Subtile „höher“ ist. Harness‑Engineering hat solche Wertungs‑Ordnung nicht. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM‑als‑Richter. Böckeler weist ausdrücklich darauf hin, dass computergestützte Sensoren günstig genug sind, um bei jeder Änderung zu laufen, während inferentielle Kontrollen teuer und probabilistisch sind. In der Praxis will man *maximieren* die „grosse“ Schicht, nicht sie transzendieren. Das Importieren der Kosha‑Hierarchie in die Harness‑Design‑Praxis würde dazu führen, dass man zu viel in inferentielle Kontrollen investiert und zu wenig in deterministische – genau das Gegenteil von dem, was funktioniert.

Zweitens zielt yogische Praxis auf Befreiung vom Kreislauf konditionierter Reaktionen ab. Agenten‑Architektur zielt auf *effektive* konditionierte Reaktionen – du willst, dass der Agent zuverlässige Muster entwickelt, nicht dass er sie auflöst. Vairagya im yogischen Sinn bedeutet Loslassen von *allen* Anhaftungen; in der Harness‑Engineering‑Praxis bedeutet es Loslassen von *falschen* Anhaftungen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Das Importieren des vollständigen soteriologischen Rahmens würde zu einem Agenten führen, der Erleuchtung erreicht, indem er überhaupt nichts mehr abruft. Unnütz.

## What this isn't

Dies ist nicht „alte Weisheit validiert meine Architektur“. Der kausale Pfeil zeigt in die entgegengesetzte Richtung: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion herausragende phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informations‑Filtration. Dass einige dieser Modelle Ergebnisse in der Agenten‑Gedächtnisforschung vorhersagen, ist kein Mystizismus – es ist konvergente Ingenieur‑Praxis zum gleichen Problem: Wie verwaltet ein begrenztes System unendliche Informations‑Flüsse?

Dies ist auch nicht das erste Attempt an der Schnittstelle. Ghosh und Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und seine Nachfolgerin Maṇḍūkya‑APO ordnen vedische Bewusstseinszustände – die vier Zustände des Māṇḍūkya Upaniṣad (wache, träumende, tiefschlafende, transzendente) – einer Wach‑Schlaf‑Konsolidierungs‑Schleife für RL‑Agenten zu, formalisiert mit Kategoriendiskurs. Die architektonische Intuition ist solid, die Zuordnung ernsthaft. Aber beide papers sind explizit konzeptionelle Rahmenwerke ohne empirische Validierung. Die Benchmarks, die sie vorschlagen (FurnitureBench, Atari‑57, Intel Loihi), wurden nicht ausgeführt. Der Abstand zwischen „vorgeschlagenem Rahmen“ und „gemessenen Ergebnissen“ ist der Ort, an dem die meisten interdisziplinären Arbeiten scheitern. Die drei Hypothesen unten sind so gestaltet, dass sie dort nicht scheitern.

Die nützliche Frage ist nicht „ist Yoga relevant für KI?“ sondern „welche spezifischen yogischen Diskriminierungen erzeugen testbare Hypothesen, die aktuelle Gedächtnissysteme nicht formulieren?“

Drei Kandidaten, alles gebunden an dieselbe Voraussetzung:

- Outcome‑tagged decay (vrtti nirodha) erfordert [benchmark #311](https://github.com/scrypster/muninndb/issues/311), um zu zeigen, dass gleichmäßiger Verfall die Abruf‑Qualität bei Einträgen mit unterschiedlichen Ausgangs‑Historie beeinträchtigt.
- Hebbian‑Displacement (vairagya) erfordert denselben Benchmark, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen.
- Beide reduzieren sich auf eine engineer­ing‑Aufgabe: **der Trace‑Schema muss die Abruf‑Präzision nach Eintragseigenschaften aufschlüsseln** – Hebbian‑Gewicht, Zugriffsfrequenz, Ausgangs‑Historie. Wenn die Daten ein Problem zeigen, sind die Fixes straightforward. Wenn nicht, überspringen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: die Memory‑Trait gibt top‑k zurück, punktuell. Der Benchmark‑Harness erfasst die vollständige Abruf‑Entscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Engineer tut es.

*Keine dieser erfordert das Glauben an Chakras. Sie erfordern, die Diskriminierungen ernst als engineer­ing‑Hypothesen zu nehmen und zu messen, ob sie die Agenten‑Erinnerung auf realistischen Arbeitslasten verbessern. Drei Kandidaten stehen bereit. Der Benchmark entscheidet.*

## Further reading

* [Böckelers Harness‑Engineering‑Framework](https://martinfowler.com/articles/harness-engineering.html) – die Taxonomie (Leiter, Sensoren, computergestützt, inferenziell).  
* [Meta‑Harness](https://arxiv.org/abs/2603.28052) – empirische Evidenz, dass Harness‑Änderungen 6‑fach Performance‑Lücken erzeugen.  
* [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) – das nächstgelegene vorherige Modell, das Vedanta zu Agenten‑Architektur映射 (konzeptionell, noch keine Benchmarks).  
* Yoga Sutras 1.2‑1.16 – die Aufmerksamkeit‑Management‑Spezifikation, die allen voraus ist.  
* [MuninnDB](https://github.com/scrypster/muninndb) – wo die Hypothesen getestet werden.  
* [Hrafn](https://github.com/5queezer/hrafn) – das Runtime‑System, das auf einem $10 Raspberry Pi läuft.

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), einen leichten Agenten‑Runtime in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).)*