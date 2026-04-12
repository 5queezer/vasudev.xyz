---
title: "Capital-of ist kein einzelnes SAE-Feature. Also habe ich eine Mutationsschleife gebaut, um herauszufinden, was es ist."
date: 2026-04-11
tags: ["ai", "interpretability", "llm", "sparse-autoencoders"]
series: ["Reading the Residual Stream"]
series_weight: 2
description: "SAE‑Funktionen können die Beziehungen in Gemma-2-2B nicht isolieren. Ich habe eine Mutations‑Selektions‑Schleife gebaut, die das kann. Der Engpass war die Tokenisierung."
images: ["/images/automated-circuit-discovery-og.png"]
translationHash: "9befcce93ec95923217969c0d61ba785"
chunkHashes: "860f306da84ee4cc,f39cf8e32af55775,ceab65a020ad92a8,1863605bd2bf822e,932bae736aec5b7a,bba780aaa1eb7651,1fe6140b8907b4a9,50b9a30dd609d40d,c6630f0bbd8ab69d,795fd1b65da9626c,1c2a62becafc5e4d"
---
**Der Engpass bei automatisierter Interpretierbarkeit sind nicht Proben, nicht SAEs, nicht Rechenleistung. Es ist die Tokenisierung.**

Element‑Symbol hat einen differentiellen Ablationswert von -16,72 in Gemma-2-2B. Das ist das stärkste kausale Signal, das ich im Residual‑Stream des Modells gefunden habe, und ich habe es manuell entdeckt. Die Frage, die alles Weitere antreibt: Kann eine Maschine solche Signale eigenständig finden?

Die Antwort lautet ja. Es erforderte 42 gescheiterte Vorschläge, einen Feedback‑Loop, der einem LLM beibringt, was der Tokenizer eines anderen Modells tut, und die Erkenntnis, dass der schwierigste Teil der automatisierten Interpretierbarkeit nichts mit Interpretierbarkeit zu tun hat.
## Capital-of Existiert Nicht als Einziges Merkmal

Ich führte sechs Experimente über zwei SAE‑Breiten (16 k und 65 k) auf Gemma‑2‑2B durch, um ein „capital‑of“-Merkmal zu finden. Mehr als 300 Kandidaten‑Merkmale. Schicht 12, Schicht 20. Einzel‑Entität‑Prompts, Mehr‑Entität‑Prompts. Enge Same‑Frame‑Kontraste, lose Kontraste. Der beste Kandidat, Merkmal 14610 („Referenzen zu spezifischen Ländern und ihren Rollen in verschiedenen Kontexten“), bestand den Mehr‑Entität‑Score über vier Länder hinweg und zeigte sowohl Steering‑ als auch Ablations‑Kausalität.

Dann trainierte ich einen linearen Probe und projizierte ihn auf alle 16 384 SAE‑Decoder‑Richtungen. Merkmal 14610 rangierte viertausendster in der Ausrichtung mit der tatsächlichen capital‑of‑Richtung. Es war ein roter Hering. Das Merkmal, das am stärksten mit capital‑of korrelierte, Merkmal 4314 („Kirchen, Bischöfe, geografische Orte“), lag bei einer Kosinus‑Ähnlichkeit von 0,34. Das entspricht etwa einem 30‑Grad‑Winkel zur echten Richtung. Eine andere Einschränkung als das [Messzeit‑Problem](/blog/gemma3-sae-measurement-timing/), aber ebenso grundlegend.

Die capital‑of‑Relation ist über etwa fünf SAE‑Merkmale verteilt. Jedes enkodiert eine Facette: politische Zentren, geografische Entitäten, formale Dokumente, sozioökonomische Bedingungen. Keines allein ist ausreichend. Zusammen definieren sie das Konzept.

Ein logistischer Regressions‑Probe findet es sofort. Schicht 20 Residual‑Stream, letzte Token‑Position, 12 capital‑of‑Prompts versus 12 andere Länder‑Attribut‑Prompts. Leave‑one‑out‑Genauigkeit: 100 %, 24 von 24. Die Probe‑Richtung zu ablieren lässt capital‑Prompts im Mittel 3,56 Logits verlieren. Andere Länder‑Attribut‑Prompts verlieren 0,87. Die Probe ist viermal selektiver als jedes SAE‑Merkmal.

Probes funktionieren. Aber Probe‑Richtungen benötigen gekennzeichnete Prompt‑Sätze. Jemand muss die positiven und negativen Klassen von Hand designen: gleicher syntaktischer Frame, andere Relation, Single‑Token‑Ziele, diverse Entitäten. Für capital‑of sind das ein paar Stunden. Für systematische Entdeckung in unbekannten Domänen ist das ein Dossier.
## Der Mutations‑Selektions‑Loop

Die Architektur ist minimal. Ein LLM schlägt eine neue Relation vor: ein Label, acht positive Prompts mit erwarteten Ein‑Token‑Vervollständigungen, acht negative Prompts mit erwarteten Vervollständigungen. Die Pipeline extrahiert Residual‑Stream‑Aktivierungen in Schicht 20, trainiert einen logistischen Probe‑Classifier mit Leave‑One‑Out‑Cross‑Validation und entfernt dann die Probe‑Richtung, um die differenzielle Auswirkung auf positive versus negative Prompts zu messen. Wenn das Entfernen positive Prompts deutlich stärker beeinträchtigt als negative (oder umgekehrt) und die LOO‑Genauigkeit 0,8 überschreitet, ist die Relation SELEKTIV. Sie wird archiviert und der Loop fährt fort.

Der Mutationsoperator erhält eine strukturierte Zusammenfassung von allem, was bisher getestet wurde: welche Relationen selektiv waren (mit Punktzahlen), welche nicht (mit diagnostischen Gründen) und welche vorher durch eine Margin‑Schwelle gefiltert wurden. Das ist der Selektionsdruck. Das LLM erkundet frei, nur durch das begrenzt, was die Pipeline auswerten kann.

![Flow diagram: LLM Proposer to Prompt Set to Tokenizer Gate to Probe Pipeline to Archive, with correction and feedback loops](/images/mutation-loop-inline.svg)

Dies ist eine offene evolutionäre Suche. Das Genom ist das Prompt‑Set. Der Phänotyp ist das Probe‑Ergebnis. Der Evaluator ist die differenzielle Ablation. Das Archiv ist das Gedächtnis der Population. Es gibt kein festes Ziel und keinen Gradienten. Die [Umgebung übernimmt die Selektion](/blog/ai-environment-design/), nicht der Designer.
## Wo es scheiterte: Null von fünfzehn

Die erste Generation erzeugte null brauchbare Vorschläge. Fünfzehn Versuche, null Beziehungen kamen durch die Validierung.

Drei Fehlermodi traten auf. Zusammengebrochene Antworträume: „composer-instrument“ ordnete fünf von acht Komponisten dem „ piano.“ zu. Wenn 62 % der positiven Ziele identisch sind, ist die innerhalb‑Klassen‑Marge null und das Probe‑Objekt hat nichts zu trennen. Duplizierte Konzepte: Das LLM schlug weiterhin „composer-instrument“ unter leicht unterschiedlichen Bezeichnungen vor und stieß damit auf das Dedup‑Tor. Der dominante Fehler jedoch war die Tokenisierung. Das LLM schlug „ 3.14“ (fünf Tokens in Gemma), „ Salinger“ (zwei Tokens), „ Impressionism“ (zwei Tokens) vor. Jeder Validierungsversuch starb am Ein‑Token‑Tor.
## Keine LLM weiß, was ein Token ist

Ich habe vier Modelle als Mutationsoperatoren getestet.

| Modell | JSON‑Konformität | Token‑Genauigkeit | Vorgeschlagene Durchläufe |
|-------|------------------|-------------------|--------------------------|
| llama-3.3-70b (OpenRouter) | ~90 % | ~70 % | best verfügbar |
| Claude Sonnet 4.6 (OpenRouter) | ~60 % | ~30 % | 0/15 |
| Qwen3 14B (Ollama) | ~50 % | ~40 % | 0/15 |
| Qwen2.5 14B (Ollama) | ~80 % | ~30 % | 0/15 |

Sonnet 4.6 denkt laut, bevor es JSON erzeugt, trotz „Return ONLY valid JSON“ im System‑Prompt. Qwen3 erzeugt `
## The Fix: Feedback, Not Instructions

Keine Menge an System‑Prompt‑Engineering lehrt ein LLM, was der Tokenizer von Gemma tut. Ich habe es versucht. Mehr Beispiele, explizite „UNSAFE“-Listen, Großbuchstaben, Drohung, abgeschaltet zu werden. Die Erfolgsquote blieb bei null.

Die Lösung war, nicht mehr zu unterrichten, sondern zu korrigieren. Anstatt Vorschläge mit mehr‑Token‑Zielen sofort abzulehnen, sammelt die Pipeline jetzt alle fehlschlagenden Ziele und gibt sie zurück: „Diese Ziele sind KEINE Einzeltoken in Gemma‑2‑2B: ' 3.14' (5 Token), ' Salinger' (2 Token). Ersetzen Sie sie durch Ziele, die GENAU 1 Token sind. Sicher: ' cat', ' A', ' Paris'. Unsicher: Dezimalzahlen, lange Namen, zusammengesetzte Wörter. Geben Sie das korrigierte JSON zurück.“

Das LLM erhält bis zu drei Korrektur‑Runden pro Vorschlag. Strukturelle Fehler (fehlerhaftes JSON, fehlende Schlüssel, doppelte Labels) werden weiterhin sofort verworfen. Nur Token‑ und Diversitäts‑Fehler erhalten Wiederholungen mit Feedback.

Vorschlags‑Erfolgsquote: 0 von 15 ohne Feedback. 3 von 5 mit Feedback.
## author-nationality: Der erste von einer Maschine gefundene Schaltkreis

Der Mutationsoperator schlug die Relation `author-nationality` nach einer Korrekturrunde vor. Anfangs bot er ` Dystopian` und ` Satire` als Ziele an, beide zweifach tokenisiert in Gemma. Nach der Korrektur erzeugte er gültige Prompt‑Mengen: `"The nationality of author Jane Austen is"` wird zu ` British`, `"The nationality of author Haruki Murakami is"` wird zu ` Japanese`, im Gegensatz zu `"The literary genre of author Jane Austen is"` wird zu ` Romance` und ähnlichem.

Pipeline‑Ergebnis: LOO‑Genauigkeit 1.000. Differenzwert +1,02. Urteil: SELECTIVE.

Das ist nicht so stark wie element-symbol (diff=-16,72). Aber es ist eine Relation, die kein Mensch vorgeschlagen hat. Die Maschine hat sie gefunden, validiert und ohne manuelles Eingreifen archiviert.
## Der Baldwin-Effekt, versehentlich

Der Feedback‑Loop hat ein evolutionäres Analogon, das ich nicht geplant hatte. Innerhalb eines einzelnen Vorschlags „lernt“ das LLM, welche Tokens funktionieren, indem es Korrekturen im Gesprächskontext erhält. Dieses Lernen bleibt über Wiederholungen hinweg erhalten. Wenn jedoch der nächste Vorschlag startet, wird das Gespräch zurückgesetzt. Das Lernen ist also flüchtig.

In der Evolutionsbiologie ist dies der [Baldwin‑Effekt](https://de.wikipedia.org/wiki/Baldwin-Effekt): Organismen, die während ihres Lebens lernen, erlangen einen Überlebensvorteil, und im Lauf der Evolution werden die erlernten Verhaltensweisen genetisch verankert. Der Feedback‑Loop ist innerhalb einer Generation lamarkistisch (direkte Korrektur wird weitergegeben), aber über Generationen hinweg darwinistisch (jeder neue Vorschlag beginnt neu, nur informiert durch die Zusammenfassung im Archiv).

Der Code‑Base verfolgt bereits „Baldwin‑Marker“ für stabile Sondier‑Richtungen, die sich über Durchläufe hinweg replizieren. Dieses Feature wurde aus praktischem Grund implementiert: um zu identifizieren, welchen Proben man vertrauen kann. Es deckt sich jedoch exakt mit dem biologischen Konzept. Wenn eine Relation immer wieder vorgeschlagen wird und sich über unabhängige Durchläufe hinweg als selektiv erweist, ist sie ein Kandidat für die Aufnahme in den Seed‑Set. Erlerntes Verhalten wird somit Teil des Genoms.
## Where the Metaphor Breaks

Biologische Mutationsoperatoren arbeiten auf dem gleichen Substrat, das sie verändern. DNA‑Polymerase liest und schreibt DNA. Transposasen schneiden und fügen innerhalb desselben Genoms ein. Es gibt keine Übersetzungsschicht zwischen dem Mutator und dem Genom.

In diesem System operiert der LLM‑Mutator auf natürlicher Sprache, während das Zielmodell auf BPE‑Tokens arbeitet. Der Mutationsoperator kann die Fitness‑Landschaft, die er erkundet, nicht sehen, weil er nicht das Wahrnehmungsapparat des Ziels teilt. Die Feedback‑Schleife kompensiert („diese Form passt nicht“), ist aber grundlegend durch die Bandbreite des Korrekturkanals begrenzt. Ein biologischer Mutator muss nicht darauf hingewiesen werden, dass ATGC das gültige Alphabet ist. Dieser LLM muss dagegen dreimal pro Vorschlag gesagt bekommen, dass „ Impressionism“ zwei Tokens sind.
## Die testbare Hypothese

Wenn die Engstelle Tokenizer‑Blindheit ist und die Lösung Feedback, dann sollte beständiges Feedback die Engstelle beseitigen. Konkret: Berechne im Vorfeld eine Tabelle gültiger Ein‑Token‑Vervollständigungen für gängige Antwortkategorien (Ländernamen, chemische Symbole, Musikinstrumente, Zahlen) mit Gemmas tatsächlichem Tokenizer und füge diese Tabelle in den System‑Prompt ein.

Die Vorhersage: Mit einem vorab berechneten Token‑Wortschatz sollte die Durchlauf­rate der Vorschläge von 3/5 auf über 4/5 steigen, und der dominante Fehlertyp sollte sich von der Tokenisierung zur Margin‑Gate verschieben (ob Gemma das erwartete Ziel‑Token selbstbewusst vorhersagt). Wenn sich die Engstelle nicht verschiebt, ist die Token‑Tabelle nicht die eigentliche Lösung und das Problem liegt tiefer als ein Vokabular‑Mismatch.
## Was ich weggelassen habe

Das Margin‑Gate ist jetzt der primäre Engpass. Drei von fünf Vorschlägen haben die Validierung bestanden, aber nur einer hat das Margin‑Gate passiert, das verlangt, dass die Top‑1‑Vorhersage des Modells mit dem erwarteten Ziel eine ausreichende Logit‑Margin aufweist. Relationen wie „bird‑habitat“ und „painter‑style“ haben unscharfe Ziele, bei denen Gemma keinen einzelnen nächsten Token stark vorhersagt. Der Mutationsoperator muss darauf trainiert werden, Relationen vorzuschlagen, bei denen das Modell hohe Zuversicht hat – das ist das nächste Problem.

Steering funktioniert nicht für relationale Probe‑Richtungen. Jede Richtung im Archiv zeigt starke Abblösung, aber null oder negatives Steering. Das Hinzufügen weiterer „capital‑of“‑Richtungen macht die Vorhersagen bei jedem Multiplikator schlechter, getestet bis zu 200 ×. Diese Richtungen sind Routing‑Signale. Das Modell liest das Vorhandensein oder Fehlen, nicht die Amplitude. Das hat Auswirkungen auf die gesamte Aktivierungs‑Steering‑Agenda in der Align‑Forschung.

Die Gemma 4‑Migration ist blockiert, weil die GemmaScope‑SAE noch nicht verfügbar ist. Die 30‑Grad‑Verteilungs‑Entdeckung könnte in größeren Modellen mit breiteren Residual‑Streams replizierbar sein oder auch nicht. Dieses Experiment wartet auf die Werkzeuge.

Der Code befindet sich in `discover.py` (Probe‑Schleife) und `mutate.py` (Mutationsoperator). Meld dich, wenn du Zugriff auf das Repo möchtest.

---

*Christian Pojoni entwickelt automatisierte Werkzeuge für mechanistische Interpretierbarkeit. Mehr unter vasudev.xyz.*