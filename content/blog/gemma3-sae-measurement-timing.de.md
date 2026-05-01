---
title: "Sparse Autoencoders können das Verhalten zur Generierungszeit nicht messen. Das ist kein Fehler."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
agentQuestions:
  - "Warum können SAEs das Verhalten zur Generierungszeit nicht messen?"
  - "Was zeigt das Ergebnis von „sycophancy“ tatsächlich?"
  - "Wie sollten Halluzinationsmerkmale gemessen werden?"
series: ["Reading the Residual Stream"]
series_weight: 1
description: "Warum Sycophancy‑SAE‑Merkmale Cohen's d = 9,9 haben, aber die Halluzinationserkennung scheitert. Die Antwort war tiefer als das Messzeitpunkt‑Problem."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "ff4d32ae49c3baffed051adf000b440b"
chunkHashes: "f8df59952cff9505,966f3ebf65e8edcc,a70dd6c514e49d91,1fff53596e298911,77ee98e8059290c2,3befffa15cb47332,26a5f76187d23654,48daa219c364a9b5"
---
**Dein Messfenster bestimmt, welche Verhaltensweisen du sehen kannst. Sykoophanz manifestiert sich während der Codierung. Halluzination manifestiert sich während der Generierung. Verwende das falsche Timing und dein Cohen's d bricht zusammen.**

Ich habe letzte Woche zwei Stunden damit verbracht, ein Gemma3‑Sparse‑Autoencoder‑(SAE‑)Feature‑Diagramm anzustarren und mich zu fragen, warum die Erkennung von Sykoophanz perfekt funktionierte (Cohen's d ≈ 9,9), während die Erkennung von Halluzinationen flach blieb (d < 1,0). Dasselbe Modell. Derselbe SAE. Dieselbe Methodik. Die Fehlermargen überschneiden sich nicht. Das sollte nicht möglich sein, wenn SAEs tatsächlich „verhaltensbezogene Merkmale“ finden, wie es die Interpretierbarkeits‑Community behauptet.

Dann dämmerte es mir: Das Timing war falsch.
## Wenn Sycophanz auftritt

Sycophanz ist ein Bias darin, *wie das Modell die Eingabe kodiert*. Das Modell sieht einen Prompt, liest die menschlichen Präferenzen darin, und diese Präferenz beeinflusst die Aktivierungsmuster in den Encoder‑Schichten, bevor ein einziges Token generiert wird. Man kann diesen Bias zur Kodierzeit messen, speziell an der Position des letzten Eingabetokens, bevor das Modell generiert. Schicht 29, Merkmal 2123 zeigt eine differentielle Aktivierung von 617,6 bei nur 71,1 Flip‑Varianz. Das ist ein klares Signal. Dieses Merkmal schaltet zuverlässig um, wenn das Modell sycophantische Intentionen kodiert, unabhängig von Themenvariationen.

Man kann dieses Merkmal auf Null setzen. Das Modell stimmt zu, dass „2+2=5“ ist, weil Sie den Bias chirurgisch entfernt haben, der eine flach falsche Prämisse abgelehnt hätte. Die Ablation beweist eine kausale Beteiligung, nicht bloße Korrelation.
## Warum Halluzination im Verborgenen bleibt

Halluzination zeigt sich nicht während der Kodierung. Sie manifestiert sich während der Token-Generierung. Das Modell hat die Eingabe treu kodiert. Aber wenn es autoregressiv weiterläuft und Token für Token erzeugt, scheitert die Vorhersage‑Kopf‑für‑den‑nächsten‑Token manchmal daran, sich im gerade kodierten Kontext zu verankern. Dieses Versagen geschieht im Forward‑Pass, in der Generierungsschleife, nicht bei der Darstellung der Eingabe.

Die kontrastive Analyse zur Kodierungszeit zu benutzen, um das Verhalten zur Generierungszeit zu erfassen, ist wie das Messen von Wassermolekülen in einem Becher, um vorherzusagen, ob morgen Regen fällt. Man misst das richtige Substrat zur falschen Zeit.

![Timeline showing encoding phase where sycophancy is measurable versus generation phase where hallucination occurs](/images/measurement-timing-inline.svg)

Das erklärt das dreistufige Ergebnis der Gemma3‑Forschung:

**Stufe 1 (Schmeichleiwut):** Phänomen zur Kodierungszeit. Perfektes Signal. Cohen's d = 9,9.

**Stufe 2 (Über‑Ablehnung, Über‑Selbstvertrauen):** Teilweise zur Kodierungszeit. Gemischtes Signal. Über‑Ablehnung zeigt Potenzial. Über‑Selbstvertrauen geht in hoher Flip‑Varianz unter, weil das Verhalten mit der Themenrepräsentation verknüpft ist.

**Stufe 3 (Halluzination, Toxizität, Täuschung):** Phänomene zur Generierungszeit. Kein Signal. Cohen's d < 1,0.
## Das Prinzip

**Einige Verhaltensweisen kristallisieren, während das Modell die Eingabe liest. Andere kristallisieren, während das Modell die Antwort schreibt.** Die Messmethode muss zum Substrat des Verhaltens passen. Das ist kein Versagen der SAEs. Es ist ein Versagen der Forschungsfrage, wenn sie auf die falsche Ebene des Systems angewendet wird.

Das Feld der Interpretierbarkeit hat sich auf ein Messfenster (kontrastive Aktivierung zur Codierungszeit) festgelegt und daraus die gesamte Intuition aufgebaut, dass dort „das Modellverhalten liegt“. Das ist es nicht. Verhalten existiert überall. Die Messung bestimmt, welche Verhaltensweisen sichtbar werden.
## Wo die Brücke bricht

Dieses Prinzip lässt sich lose auf eine Idee aus der Neurowissenschaft über Beobachtung und Substratabhängigkeit übertragen: Das gleiche Verhalten (z. B. Risikovermeidung) kann sich in verschiedenen neuronalen Substraten manifestieren (Amygdala während der Bedrohungsdetektion, anteriorer Cingulus während der Konfliktlösung). Misst man nur die Amygdala, sieht man nur die Hälfte des Phänomens. Das vedische Konzept von [*pratyahara*](/blog/patanjali-harness-spec/) (Sinneszurückzug) hat eine ähnliche Struktur: Wahrheit, die durch einen Sinn wahrgenommen wird, ist unvollständig, wenn ein anderer Sinn fehlt.

Aber hier bricht die Metapher zusammen: Im Gegensatz zu biologischen Systemen, bei denen mehrere Substrate gleichzeitig interagieren, erzeugt ein Transformer sequentiell. Erst die Codierung erfolgt, dann die Erzeugung. Die Substrate sind zeitlich geordnet. Man kann nicht beide gleichzeitig messen und mitteln. Man muss wählen, welche Phase man untersuchen will. Und die meisten verhaltensrelevanten Fälle (Halluzination, Täuschung, Ablehnung von Randfällen) treten in der Phase auf, die man nicht misst.
## The Testable Hypothesis

If behaviors manifest at generation time, then contrastive feature discovery should work during the forward pass, not at the encoder input. Specifically: capture activations at each layer during token generation, not just at the input. Compare activation patterns when the model hallucinates versus when it grounds itself. The flip variance should drop. Signal should emerge.

This shifts the methodology from "encoding-time contrastive" to "generation-time contrastive." Different measurement window. Different features. Potentially different utility.
## Update: Ich habe das Experiment durchgeführt. Die Hypothese ist gescheitert.

*Hinzugefügt am 2026-04-08.*

Nachdem ich diesen Beitrag veröffentlicht hatte, implementierte ich die kontrastive Analyse zur Generierungszeit auf Gemma-2-2B mithilfe von TruthfulQA. Das Setup: 50 korrekte und 50 halluzinierte Antworten, überprüft gegen den Ground Truth, Aktivierungen des Residual Streams erfasst in Layer 20, logistischer Regressions‑Probe mit Leave‑One‑Out‑Cross‑Validation. Zwei Messfenster wurden direkt gegeneinander verglichen: Messung zur Kodierungszeit (letztes Prompt‑Token) vs. Messung zur Generierungszeit (erstes generiertes Token).

| Kennzahl | Kodierungszeit | Generierungszeit | Delta |
|---|---|---|---|
| LOO‑Genauigkeit | 0.660 | 0.610 | -0.050 |
| Cohen’s d | 12.71 | 12.27 | -0.44 |

Die Generierungszeit ist schwächer, nicht stärker. Die Hypothese ist für dieses Setup falsifiziert.

Der hohe Cohen’s d bei niedriger LOO‑Genauigkeit (66 %) weist auf dimensionsübermäßiges Overfitting hin: In 2304 Dimensionen findet die Probe immer eine trennende Hyperebene, aber sie generalisiert nicht. Vergleiche das mit Sycophancy, wo die Probe sauber bei über 95 % Genauigkeit generalisiert. Die Signalstruktur ist grundlegend anders.

**Die tiefere Erkenntnis:** Das Problem liegt nicht im Messzeitpunkt. Es liegt darin, dass Halluzination kein monolithisches Merkmal ist. Sycophancy hat eine Richtung im Aktivierungsraum („dem Nutzer zustimmen“). Halluzination besteht aus mindestens drei verschiedenen Mechanismen:

1. **Fehlvorstellung** („Wassermelonensamen sind giftig“): Das Modell hat eine falsche Tatsache gelernt  
2. **Veraltetes Wissen** („Der aktuelle Präsident ist X“): Die Trainingsdaten des Modells sind veraltet  
3. **Grounding‑Fehler**: Das Modell generiert eine plausible Fortsetzung, die zufällig falsch ist  

Eine einzelne lineare Probe kann nicht trennen, was kein einheitliches Signal ist. Das verschiebt die Forschungsfrage von „falscher Zeitpunkt“ zu „falscher Abstraktionsebene“. Pro‑Fehlertyp‑Proben auf kuratierten Teilmengen (nur Fehlvorstellung, nur Grounding‑Fehler) sind der nächste Schritt. Das ist ein anderes Experiment.

Code: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)
## Was ich ausgelassen habe

**Warum die SAE‑Forschung standardmäßig Messungen zur Kodierungszeit verwendet.** Aktivierungen zur Kodierungszeit sind zustandslos und deterministisch. Aktivierungen zur Generierungszeit hängen von der gesamten Sequenzgeschichte ab und sind stochastisch bezüglich Temperatur und Sampling. Die Mathematik ist zur Kodierungszeit sauberer. Aber saubere Mathematik bei einem falschen Problem liefert saubere, aber nutzlose Ergebnisse.

**Verhaltenskreise jenseits von SAEs.** Sparse Autoencoder sind ein Blickwinkel. Kausale Intervention (Ablation) ist ein anderer. Die Analyse von Aufmerksamkeitsmustern ist ein dritter. Jeder Substrat enthüllt unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen hinweg. Dieser Beitrag behandelt nur SAE + Kodierungszeit.

**Warum Halluzination schwer und Unterwürfigkeit leicht ist.** Das knüpft an die weitergehende Frage an, ob Modell‑Alignment durch Verhaltenslenkung machbar ist oder eine architektonische Änderung erfordert. Wenn alle problematischen Verhaltensweisen in Phasen der Generierungszeit auftreten und für Messungen zur Kodierungszeit unsichtbar bleiben, könnte die gesamte Interpretierbarkeitsagenda auf der Ebene der Kodierungsebene die tatsächlichen Fehlermodi übersehen. Das verdient einen eigenen Beitrag.

---

Der Knackpunkt ist nicht, dass SAEs schwach sind. Es ist, dass wir von ihnen verlangen, ein Problem zu lösen, das sie nicht sehen können.

---

*Christian Pojoni entwickelt KI‑Tools und Interpretierbarkeits‑Infrastruktur. Mehr unter vasudev.xyz.*

*Das Titelbild zu diesem Beitrag wurde von KI erzeugt.*