---
title: "Patanjali hatte die Filter-Spezifikation. Wir haben nur die Tests geschrieben."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Gedächtniskonsolidierung verschlechterte den Abruf. Drei Designprinzipien aus Agentengedächtnis-Benchmarks und ihre unerwarteten Parallelen in der yogischen Aufmerksamkeitstheorie."
translationHash: "ef17fbb86df8d78f788847d28379d508"
---
Das Konsolidierungssystem von [MuninnDB](https://github.com/scrypster/muninndb) hat drei duplizierte Engramme mit Farbvarianten genau wie vorgesehen zusammengeführt (Kosinus-Ähnlichkeit >= 0,95). Die Abrufqualität verschlechterte sich. In einem 13-Engramm-Vault verschob das Entfernen von Duplikaten den Normalisierungsanker und drängte relevante Ergebnisse in der Rangliste nach unten. Die Lösung war eine Schutzklausel: `MinDedupVaultSize` (Standardwert 20), die Phase 2 der Deduplizierung in kleinen Vaults überspringt. [PR #359](https://github.com/scrypster/muninndb/pull/359) schloss das Problem.

Der Fehler lag nicht im Deduplizierungsalgorithmus. Es war ein Mangel an *Unterscheidungsvermögen*: eine gültige Konsolidierungsoperation, angewendet in einem Kontext, in dem sie Schaden anrichtete. Wann konsolidieren, wann belassen, was als Rauschen vs. Signal gilt. Dieses Problem hat eine lange Geschichte außerhalb der Informatik. Ich fand drei spezifische Designprinzipien in den [Yoga-Sutren](https://de.wikipedia.org/wiki/Yoga-Sutren_des_Patanjali), die auf empirische Ergebnisse von [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, März 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) und Böckelers [Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html) zutreffen.

**Die kontemplativen Traditionen entwickelten ausgefeilte Modelle der Aufmerksamkeitsfilterung. Einige dieser Modelle generieren testbare Hypothesen, die die aktuelle Literatur zu Agenten-Speichern nicht liefert.**

## 1. Nicht jedes Rauschen ist gleich (Vrtti Nirodha)

Vor dem Deduplizierungsfehler stieß [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) auf ein grundlegenderes Problem. MuninnDBs ACT-R-Bewertung ([Issue #331](https://github.com/scrypster/muninndb/issues/331)) klemmte frische Engramme auf raw=1,0, wodurch alle Abrufwerte identisch bei 0,9000 lagen. Das System konnte Signal nicht von Rauschen unterscheiden. Jeder Eintrag wirkte gleich relevant. Nach der Behebung ([PR #337](https://github.com/scrypster/muninndb/pull/337)) verbesserte sich der Wertebereich auf 0,18–0,90 und die korrekte Top-1-Abrufquote stieg auf 5/5 Abfragen. Die uniforme Behandlung von Einträgen hatte die Abrufqualität zerstört.

Meta-Harness bestätigte dasselbe Muster in einem anderen Maßstab. Ihre [kritische Ablation (Tabelle 3)](https://arxiv.org/abs/2603.28052) verglich drei Stufen des Informationszugriffs für den Harness-Optimierer:

| Bedingung | Median-Genauigkeit | Beste Genauigkeit |
|---|---|---|
| Nur Scores | 34,6 % | 41,3 % |
| Scores + LLM-Zusammenfassung | 34,9 % | 38,7 % |
| Vollständige rohe Traces | 50,0 % | 56,7 % |

LLM-generierte Zusammenfassungen schnitten *schlechter* ab als rohe Scores allein (beste Genauigkeit 38,7 % vs. 41,3 %). Vollständige rohe Traces erreichten 56,7 %. Die Zusammenfassungen kollabierten diagnostisches Signal gleichzeitig mit dem Rauschen und zerstörten die Informationen, die der Optimierer benötigte. Bei der Textklassifizierung erzielte Meta-Harness 48,6 % gegenüber 40,9 % bei ACE, wobei viermal weniger Context-Tokens verwendet wurden. Der entscheidende Vorteil lag nicht in mehr Informationen. Es war die bessere *Auswahl* von Informationen.

Das Designprinzip: Eine undifferenzierte Behandlung von Einträgen zerstört die Abrufqualität, sei es durch uniforme Bewertung, verlustbehaftete Zusammenfassung oder undifferenzierte Deduplizierung.

Yoga-Sutren 1.2 definiert Yoga als *chitta vrtti nirodha*, die Beruhigung der Schwankungen im Geistesfeld. Patanjali sagt nicht „lösche alles“. Er unterscheidet [*Kleshas*](https://de.wikipedia.org/wiki/Klesha_(Hinduismus)) (Verzerrungen: Anhaftung, Abneigung, Ego, Unwissenheit, Todesangst) von [*Pramanas*](https://de.wikipedia.org/wiki/Pramana) (gültige Erkenntnis: direkte Wahrnehmung, Schlussfolgerung, Zeugnisaussage). Die Praxis ist chirurgisch: Verringere die Verzerrungen, bewahre das Signal. Der Score-Sättigungsfehler war das System, das diese Unterscheidung nicht treffen konnte. Jede Vrtti sah gleich aus.

Die Design-Implikation für MuninnDB: Decay-Floors (Verfallsuntergrenzen) sollten Ergebnisse widerspiegeln, nicht nur Zugriffshäufigkeit. Ein verifiziertes API-Muster und ein fehlgeschlagener curl-Aufruf mögen identische Abrufquoten haben, aber einen radikal unterschiedlichen Retentionswert. Man könnte versuchen, Einträge im Voraus als Pramana oder Klesha zu klassifizieren (verifiziert vs. verzerrt), aber diese Klassifizierung ist selbst das eigentliche Problem. Für die meisten Einträge erfordert sie semantisches Urteilsvermögen, was ein LLM im Decay-Pfad bedeutet, was die Konsolidierung teuer und nicht-deterministisch macht.

Der einfachere Weg: **Mit Ergebnis-Tag versehene Schreibvorgänge (outcome-tagged writes)**. Wenn ein Agent einen Eintrag abruft und die nachfolgende Aktion erfolgreich ist, erhält der Eintrag ein `outcome: success`-Signal. Scheitert die Aktion, `outcome: failure`. Die Decay-Floor koppelt sich an die Erfolgsquote, nicht an eine epistemische Kategorie. Dies ist im Wesentlichen Bandit-Feedback auf Abrufe, ein in der Informationsrecherche etabliertes Konzept, das hier auf persistenten Agentenspeicher übertragen wird. Keine Ontologie nötig. Kein LLM im Loop. Man muss die Vrtti nicht im Voraus klassifizieren. Man beobachtet ihre Wirkung und lässt diese Beobachtung die Retention formen.

---

## 2. Verstärkung benötigt ein Gegengewicht (Samskara und Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) testete drei moderne Speichersysteme (A-Mem, Mem0, MemoryOS) gegen naive RAG-Baselines, die einfach aus dem Rohkontext abrufen. Keines der fortgeschrittenen Systeme übertraf die Baselines konsistent. Der spezifische Fehlermodus: Diese Systeme konnten prozedurales Gedächtnis (Feedback-Protokolle, die den Systemleistungsverlauf anzeigen) nicht nutzen. Sie behandelten alle Eingaben als deklaratives Wissen und ignorierten die Signale, die ihnen gesagt hätten, welche Erinnerungen tatsächlich nützlich waren.

MuninnDBs Benchmark #311 erzeugte eine lokale Version desselben Problems. Die Phase-2-Dedup identifizierte und fusionierte korrekt drei duplizierte Einträge mit Farbvarianten (Kosinus >= 0,95). Aber im 13-Engramm-Vault veränderte das Entfernen dieser Einträge den Normalisierungsanker. Ein nicht zusammenhängendes Engramm wurde zum Referenzpunkt und drängte relevante Ergebnisse in der Rangliste nach unten. Eine gültige Konsolidierungsoperation, uniform angewendet, verdrängte die richtige Antwort.

Böckelers [Harness-Engineering-Taxonomie](https://martinfowler.com/articles/harness-engineering.html) erklärt die strukturelle Diskrepanz. Sie unterscheidet zwischen computational sensors (deterministisch, günstig, laufen bei jeder Änderung) und inferential sensors (semantisch, teuer, probabilistisch). Dedup bei Kosinus >= 0,95 ist ein rechnerischer Prozess. Zu erkennen, wann Dedup den Abruf schädigt, erfordert ein inferenzielles Urteilsvermögen: „Diese Einträge sind ähnlich, aber ist ihr Entfernen *sicher* in diesem Vault?“ Kein Ähnlichkeitsschwellenwert kann das beantworten.

Die [Yoga-Sutren](https://de.wikipedia.org/wiki/Yoga-Sutren_des_Patanjali) benennen dieselbe Dynamik. [Samskaras](https://de.wikipedia.org/wiki/Samskara) sind latente Eindrücke, die die zukünftige Wahrnehmung formen. Jede Erfahrung hinterlässt eine Spur, und wiederholte Erfahrungen vertiefen die Rinne. MuninnDB implementiert dies direkt: Einträge, die gemeinsam aktiviert werden, verstärken ihre Assoziationsgewichte. Die Sutras warnen, dass Samskaras sich aufschaukeln. Ohne das Gegengewicht von [*Vairagya*](https://de.wikipedia.org/wiki/Vairagya) (Nicht-Anhaftung, die Fähigkeit, starke Assoziationen loszulassen), verknöchern sie zu [*Vasanas*](https://de.wikipedia.org/wiki/Vasana), automatischen Reaktionsmustern, die bewusste Evaluation umgehen. Man sieht die Situation nicht mehr, sondern führt nur noch das Skript aus.

Der fehlende Mechanismus ist eine explizite hebb'sche *Schwächung*: nicht nur passiver Verfall, sondern aktive Korrektur, wenn ein stark assoziierter Eintrag einen falsch-positiven Abruf produziert. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ist nun abgeschlossen ([PR #359](https://github.com/scrypster/muninndb/pull/359)), und die ersten Ergebnisse erzwangen bereits eine Korrektur (die `MinDedupVaultSize`-Schutzklausel). Die nächste Messung erfordert den synthetischen Vault-Generator mit beschrifteten Engramm-Klassen: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped und Legal-adjacent. Die schärfere Metrik ist die *Verdrängungsrate*: Wie oft drängt ein stark assoziierter, aber weniger relevanter Eintrag einen relevanteren Eintrag aus den Top-k? Das ist die direkte Vasana-Messung: nicht nur „falsche Sache abgerufen“, sondern „richtige Sache verdrängt durch habitualisierten Abruf“. Wenn verstärkte Einträge eine messbare Verdrängung produzieren, ist Vairagya als Design-Primitive empirisch gerechtfertigt. Wenn nicht, ist der aktuelle passive Verfall ausreichend und wir umgehen die Komplexität.

---

## 3. Die Kraft des bewussten Ausschlusses (Pratyahara)

Meta-Harness' überraschendstes Ergebnis: Die gewonnenen Harnesses sind nicht diejenigen, die das Kontextfenster mit allem verfügbaren vollpacken. Der Gewinner der Textklassifizierung nutzt TF-IDF mit kontrastiven Paaren und Label-Priming (48,6 % Genauigkeit, viermal weniger Tokens als der Zweitplatzierte). Der Gewinner des Mathematik-Abrufs ist ein Vier-Wege-BM25-Programm mit lexikalischen Prädikaten. Einfache Auswahlpolicies. Keine exotischen Architekturen. Ein Wechsel des Harness um ein feststehendes LLM herum erzeugt eine 6-fache Leistungslücke im selben Benchmark.

Böckeler formuliert es als „Qualität links halten“: Je früher man filtert, desto günstiger und zuverlässiger ist das nachgelagerte Ergebnis. Ihre computational guides (Linter, Schemata, CLAUDE.md-Regeln) verhindern, dass ganze Informationskategorien das Modell überhaupt erreichen. Die `MinDedupVaultSize`-Schutzklausel aus PR #359 ist dasselbe Prinzip, angewendet auf Konsolidierung: Anstatt Dedup auf jedem Vault laufen zu lassen und zu hoffen, dass das Modell die verschlechterten Ergebnisse handhabt, lernte das System, Dedup in kleinen Vaults *nicht anzuwenden*. Ausschluss eines Prozesses, nicht nur Ausschluss von Daten.

Die erste Version dieses Posts argumentierte, dass das Memory Trait Interface Ablehnungs-Metadaten neben Ergebnissen zurückgeben sollte. „Diese 3 Einträge stimmten überein, und diese 5 wurden wegen X ausgeschlossen.“ Mehr diagnostisches Signal für das LLM. Besser informierte Entscheidungen. Klingt vernünftig.

Es ist falsch, und das yogische Prinzip der [Pratyahara](https://de.wikipedia.org/wiki/Pratyahara) (Yoga-Sutren 2.54) erklärt warum. Pratyahara wird oft als „Sinnesrückzug“ übersetzt, aber das ist irreführend. Es ist nicht Blindheit. Es ist *selektive Aufmerksamkeit*. Die Sinne funktionieren weiterhin. Sie ziehen den Geist nur nicht mehr zu jedem Stimulus. Man entscheidet, was ins Bewusstsein tritt, anstatt auf alles zu reagieren, was ankommt.

Wenn man dem LLM sagt: „Hier sind 5 Dinge, die ich dir bewusst vorenthalten habe“, hat man ihm die Objekte gezeigt und ein Verbot hinzugefügt. Das ist kein Sinnesrückzug. Das ist Sinnesreizung mit Warnetikett. Jeder, der meditiert hat, kennt das Ergebnis: „Denk nicht an einen weißen Elefanten“ garantiert, dass man an den weißen Elefanten denken wird. Konkret: Erklärungen zu Ausschlüssen verbrauchen Tokens (im Widerspruch zu Meta-Harness' Feststellung, dass einfache Harnesses gewinnen) und laden das Modell ein, den Filter zu hinterfragen („Warum wurde X ausgeschlossen? Vielleicht brauche ich es doch“). Nicht essenzieller Kontext verschlechtert die Modellleistung, selbst wenn er technisch korrekt ist, und Ausschluss-Metadaten sind per Definition für die aktuelle Aufgabe nicht essenziell.

Die richtige Trennung: **Der Agent sieht nur die Top-k-Ergebnisse. Das Benchmark-Harness sieht alles.** Das Memory Trait Interface bleibt schlank: `retrieve → Vec<Entry>`. Aber die Abrufimplementierung protokolliert die gesamte Entscheidung intern: Was wurde zurückgegeben, was ausgeschlossen, warum und was der Agent als Nächstes tat. Das Benchmark verbraucht die Protokolle. Der Agent verbraucht die Einträge.

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

Der Agent sieht `excluded` nie. Das Benchmark-Harness sieht alles davon. Wenn `entry_089` die richtige Antwort war und gefiltert wurde, weil sein Hebbian-Gewicht niedrig war, zeigt sich das im Trace, und die nächste Iteration der Retrieval-Policy kann anpassen.

In Böckelers Taxonomie: Das Memory Trait ist ein computational guide (es bestimmt, was in den Kontext gelangt). Das Trace-Protokoll ist ein computational sensor (es beobachtet, was geschah). Sie verschmelzen nicht. Pratyahara ist kein bewusstes Filtern im Sinne von *das gefilterte System ist sich des Ausschlusses bewusst*. Es ist bewusstes Filtern im Sinne von *der Designer ist sich bewusst*, durch die Trace-Protokolle, sodass die nächste Iteration des Filters sich verbessert. Das Bewusstsein gehört dem Harness-Ingenieur, der die Traces liest, nicht dem Agenten, der die Abfragen ausführt.

---

## Wo die Metapher bricht

An zwei Stellen.

Erstens implizieren die [Koshas](https://de.wikipedia.org/wiki/Kosha) (vedische Körperschichten: physisch, energetisch, mental, diskriminativ, Glückseligkeit) eine Hierarchie von grob zu subtil, wobei das Subtile „höher“ ist. Harness-Engineering hat keine solche Wertehierarchie. Ein deterministischer Linter ist nicht „niedriger“ als ein LLM-as-Judge. Böckeler weist explizit darauf hin, dass computational sensors günstig genug sind, um bei jeder Änderung zu laufen, während inferenzielle Kontrollen teuer und probabilistisch sind. In der Praxis möchte man die „grobe“ Ebene *maximieren*, nicht transzendieren. Die Kosha-Hierarchie ins Harness-Design zu importieren, würde dazu führen, übermäßig in inferenzielle Kontrollen und zu wenig in deterministische zu investieren. Das Gegenteil von dem, was funktioniert.

Zweitens zielt die yogische Praxis auf Befreiung vom Zyklus konditionierter Reaktionen ab. Die Agentenarchitektur zielt auf eine *effektive* konditionierte Reaktion ab. Man möchte, dass der Agent zuverlässige Muster entwickelt, nicht sie auflöst. Vairagya im yogischen Sinne bedeutet das Loslassen *jeglicher* Anhaftung. Im Harness-Engineering bedeutet es das Loslassen *falscher* Anhaftungen. Das Ziel ist bessere Konditionierung, nicht keine Konditionierung. Den vollständigen soteriologischen Rahmen zu importieren, würde zu einem Agenten führen, der Erleuchtung erreicht, indem er sich weigert, überhaupt irgendetwas abzurufen. Unpraktisch.

---

## Was das nicht ist

Das ist nicht „altes Wissen validiert meine Architektur“. Der Kausalpfeil verläuft andersherum: Die kontemplativen Traditionen entwickelten über Jahrtausende systematischer Introspektion ausgefeilte phänomenologische Modelle von Aufmerksamkeit, Gedächtnis und Informationsfilterung. Dass einige dieser Modelle Ergebnisse in der Agentenspeicherforschung vorhersagen, ist nicht mystisch. Es ist konvergentes Engineering für dasselbe Problem: Wie verwaltet ein begrenztes System einen unbegrenzten Informationsfluss?

Dies ist auch nicht der erste Versuch an dieser Schnittstelle. Ghosh und Ghoshs [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) und sein Nachfolger Maṇḍūkya-APO bilden vedische Bewusstseinszustände (die vier Zustände der Māṇḍūkya Upaniṣad: Wachen, Träumen, Tiefschlaf, transzendent) auf einen Wake-Sleep-Konsolidierungszyklus für RL-Agenten ab, formalisiert mit Kategorientheorie. Die architektonische Intuition ist stimmig und die Abbildung ist seriös. Aber beide Papiere sind explizit konzeptuelle Rahmenwerke ohne empirische Validierung. Die vorgeschlagenen Benchmarks (FurnitureBench, Atari-57, Intel Loihi) wurden nicht durchlaufen. Die Lücke zwischen „vorgeschlagenem Rahmenwerk“ und „gemessenem Ergebnis“ ist dort, wo die meisten interdisziplinären Arbeiten sterben. Die drei unten stehenden Hypothesen sind darauf ausgelegt, dort nicht zu sterben.

Die nützliche Frage ist nicht „Ist Yoga relevant für KI?“, sondern „Welche spezifischen yogischen Unterscheidungen produzieren testbare Hypothesen, die aktuelle Speichersysteme nicht stellen?“

Der initiale Benchmark hat eine Frage beantwortet. Uniforme Deduplizierung in kleinen Vaults ist schädlich, und die `MinDedupVaultSize`-Schutzklausel ([PR #359](https://github.com/scrypster/muninndb/pull/359)) korrigierte das. Zwei Hypothesen bleiben offen. Outcome-getaggter Verfall (Vrtti Nirodha) erfordert den synthetischen Vault-Generator, um zu zeigen, dass uniformer Verfall die Abrufqualität bei Einträgen mit unterschiedlichem Ergebnisverlauf kostet. Hebbian-Verdrängung (Vairagya) erfordert denselben Generator, um zu messen, ob verstärkte Einträge relevantere Alternativen verdrängen. Beides reduziert sich auf eine Engineering-Aufgabe: **Das Trace-Schema muss Retrieval-Präzision erfasst, aufgeschlüsselt nach Eintragseigenschaften**: Hebbian-Gewicht, Zugriffshäufigkeit, Ergebnisverlauf. Wenn die Daten ein Problem zeigen, sind die Korrekturen direkt. Wenn nicht, umgehen wir die Komplexität.

Pratyahara ist bereits korrekt implementiert: Das Memory Trait gibt Top-k zurück, Punkt. Das Benchmark-Harness erfasst die vollständige Retrieval-Entscheidung. Der Agent muss nicht wissen, was ausgeschlossen wurde. Der Ingenieur schon.

Keines davon erfordert den Glauben an Chakren. Es erfordert, die Unterscheidungen ernsthaft als Engineering-Heuristiken zu nehmen und zu messen, ob sie den Agentenabruf unter realistischen Workloads verbessern. Der initiale Benchmark erzwang eine Designänderung. Der synthetische Vault-Generator entscheidet den Rest.

## Weiterführende Literatur

[Böckelers Harness-Engineering-Framework](https://martinfowler.com/articles/harness-engineering.html), die Taxonomie (Guides, Sensoren, computational, inferenziell). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), empirischer Beleg, dass Harness-Änderungen eine 6-fache Leistungslücke erzeugen. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), die nächstgelegene Vorarbeit, die Vedanta auf Agentenarchitektur abbildet (konzeptionell, noch keine Benchmarks). Yoga-Sutren 1.2–1.16, das Aufmerksamkeitsfiltermodell, das allem vorausging. [MuninnDB](https://github.com/scrypster/muninndb), wo die Hypothesen getestet werden. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), die ersten Ergebnisse. [PR #337](https://github.com/scrypster/muninndb/pull/337), die Fix für Score-Sättigung. [PR #359](https://github.com/scrypster/muninndb/pull/359), die Dedup-Schutzklausel. [Hrafn](https://github.com/5queezer/hrafn), die Runtime, die auf einem 10-$-Raspberry Pi läuft.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), eine leichtgewichtige Agenten-Runtime in Rust. Vorheriger Beitrag: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*