---
title: "Sparse Autoencoders können das Verhalten zur Generierungszeit nicht messen. Das ist kein Bug."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "Warum sycophancy SAE-Features eine Cohen's d=9.9 haben, Halluzinationsdetektion aber versagt. Die Antwort: Das Messzeitfenster muss dem Verhalten entsprechen."
translationHash: "b479bbc902ee4460f3c6af223f05d986"
---
**Dein Messfensterbestimmt, welche Verhaltensweisen du sehen kannst. Sycophancy tritt während des Encodings auf. Halluzination tritt während der Generierung auf. Verwende den falschen Zeitpunkt, und dein Cohen's d kollabiert.**

Ich habe letzte Woche zwei Stunden damit verbracht, mir ein Gemma3 sparces Autoencoder (SAE) Feature-Diagramm anzusehen und zu fragen, warum die Sycophancy-Erkennung einwandfrei funktioniert hat (Cohen's d etwa 9,9), während die Halluzinationserkennung flachlief (d < 1,0). Dasselbe Modell. Dasselbe SAE. Dasselbe Verfahren. Die Fehlerspannen überschneiden sich nicht. Das sollte nicht möglich sein, wenn SAEs tatsächlich „behavioral features“ finden, so wie die Interpretierbarkeits-Community behauptet.

Dann ist mir das klar geworden: das Timing war falsch.

## Wenn Sycophancy Auftaucht

Sycophancy ist ein Bias in *der Art, wie das Modell die Eingabe encodiert*. Das Modell sieht einen Prompt, liest die menschlichen Präferenzen darin und dieser Präferenz biaset die Aktivierungsmuster in den Encoder-Schichten, bevor ein einzelnes Token generiert wird. Man kann diesen Bias zur Encoding time messen, speziell an der endgültigen Eingabetoken-Position, bevor das Modell generiert. Layer 29, feature 2123 shows 617.6 differential activation with only 71.1 flip variance. That's clean signal. That feature flips on reliably when the model encodes sycophantic intent, regardless of topic variation.

Du kannst diese Funktion ausschalten. Das Modell stimmt zu "2+2=5", weil du den Bias chirurgisch entfernt hast, der eine offensichtlich falsche Prämisse abgelehnt hätte. Die Intervention beweist kausale Beteiligung, nicht bloße Korrelation.

## Warum Halluzination Versteckt Bleibt

Halluzination tritt nicht während des Encodings auf. Sie tritt während der Token-Generierung auf. Das Modell hat die Eingabe getreue encodiert. Aber während es vorwärts wird autoregressiv, Token für Token generiert, versagt manchmal der Next-Token-Vorhersage-Head, sich im Kontext zu verankern, den es gerade encodiert hat. Dieser Fehler tritt im Vorwärtspass, im Generierkreis, nicht in der Art und Weise auf, wie die Eingabe dargestellt wurde.

Die Verwendung von Encoding-time kontrastiver Analyse, um generation-time Verhalten zu erfassen, ist wie das Messen von Wassermolekülen in einem Becher, um vorherzusagen, ob es morgen regnet. Du misst das richtige Substrat zur falschen Zeit.

Dies erklärt das dreistufige Ergebnis aus der Gemma3-Forschung:

**Tier 1 (Sycophancy):** Encoding-time Phänomen. Perfektes Signal. Cohen's d = 9.9.

**Tier 2 (Over-refusal, Overconfidence):** Teilweise Encoding-time. Gemischtes Signal. Over-refusal zeigt Potenzial. Overconfidence versinkt in hoher flip variance, weil das Verhalten mit der Themenrepräsentation verschmolzen ist.

**Tier 3 (Hallucination, Toxicity, Deception):** Generation-time Phänomene. Kein Signal. Cohen's d < 1.0.

## Das Prinzip

**Einige Verhaltensweisen kristallisieren, wenn das Modell den Prompt liest. Andere kristallisieren, wenn das Modell die Antwort schreibt.** Messmethode muss zum Verhalten-Substrat passen. Das ist kein Versagen von SAEs. Es ist ein Versagen der Forschungsfrage, wenn sie an die falsche Schicht des Systems gestellt wird.

Aber hier kollidiert das Metaphernmodell: Im Gegensatz zu biologischen Systemen, wo mehrere Substrate gleichzeitig interagieren, generiert ein Transformer sequenziell. Encoding erfolgt, dann Generation. Die Substrate sind zeitlich geordnet. Man kann beide nicht gleichzeitig messen und mitteln. Man muss wählen, welche Phase man untersucht. Und die meisten praktisch relevanten Verhaltensweisen (Halluzination, Täuschung, Ablehnungskonturen) finden in der Phase statt, die man nicht misst.

## Die Testbare Hypothese

Wenn Verhaltensweisen zur Generation Time auftreten, sollte die kontrastive Merkmalsextraktion während des Forward-Passes, nicht beim Encoder-Input, funktionieren. Spezifisch: Erfasse Aktivierungen auf jeder Schicht während der Token-Generierung, nicht nur am Input. Vergleiche Aktivierungsmuster, wenn das Modell Halluzinationen produziert, versus wenn es sich verankert. Die flip variance sollte sinken. Signal sollte auftauchen.

This shifts the methodology from "encoding-time contrastive" to "generation-time contrastive." Different measurement window. Different features. Potentially different utility.

## Was ich weggelassen habe

**Warum SAE-Forschung standardmäßig die Encoding-time-Messung verwendet.** Encoding-time Aktivierungen sind statiellos und deterministisch. Generation-time Aktivierungen hängen von der gesamten Sequenzgeschichte ab und sind stochastisch über Temperatur und Sampling. Die Mathematik ist beim Encoding-time sauberer. Aber saubere Mathematik bei der falschen Aufgabe liefert saubere, aber nutzlose Ergebnisse.

**Verhaltensschaltkreise jenseits von SAEs.** Spars-AE sind nur ein Blickwinkel. Cursive Intervention (Ablation) ist ein anderer. Attention-Muster-Analyse ist ein dritter. Jeder Substrat enthüllt unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen. Dieser Beitrag deckt nur SAE + encoding time ab.

**Warum Halluzination schwer und Sycophancy leicht ist.** Dies verbindet sich mit der größeren Frage, ob Modellausrichtung über Verhaltenssteuerung lösbar ist oder architecturale Änderungen erfordert. Wenn alle bedenklichen Verhaltensweisen in generation-time Phasen cluster und für encoding-time Messungen unsichtbar bleiben, könnte die gesamte Encodierungsschicht-Interpretierbarkeit-Agenda die eigentlichen Fehlermuster übersehen. Das ist einen eigenen Beitrag wert.

## Der Haken

Der Haken ist nicht, dass SAEs schwach sind. Es ist, dass wir sie bitten, ein Problem zu lösen, das sie nicht sehen können.

---

*Christian Pojoni baut KI-Tools und Interpretierbarkeitseinrichtungen. Mehr at vasudev.xyz.*