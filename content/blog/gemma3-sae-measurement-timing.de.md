---
title: "Sparse Autoencoders können das Generationszeitverhalten nicht messen. Das ist kein Bug."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "Warum diesycophancy SAE-Features Cohen's d=9.9 aufweisen, aber die Halluzinationserkennung scheitert. Die Antwort stellte sich als tiefer heraus als die Messzeit."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "56c80823347188c72ba7493a4ec79661"
chunkHashes: "dfc24624bcca24e6,966f3ebf65e8edcc,e2f0a6956f01f3c7,1fff53596e298911,0eb457ee5f304077,3befffa15cb47332,26a5f76187d23654,48daa219c364a9b5"
---
**Dein Messzeitraum bestimmt, welche Verhaltensweisen du sehen kannst. Sycophancy manifestiert während des Encodings. Halluzination manifestiert während der Generierung. Verwende das falsche Timing, und dein Cohen's d bricht zusammen.**

Ich habe letzte Woche zwei Stunden damit verbracht, starr auf ein Gemma3 sparse autoencoder (SAE) Feature-Diagramm zu starren und zu fragen, warum die Sycophancy-Erkennung einwandfrei funktioniert hat (Cohen's d etwa 9,9), während die Halluzination-Erkennung flachgezogen war (d < 1,0). Das gleiche Modell. Das gleiche SAE. Die gleiche Methodologie. Die Fehlerspannen überschneiden sich nicht. Das sollte unmöglich sein, wenn SAEs tatsächlich "Verhaltensmerkmale" finden, wie die Interpretierbarkeits-Community behauptet.

Dann ist es mir aufgegangen: das Timing war falsch.
## Wenn Sycophancy zeigt sich

Sycophancy ist ein Bias im *wie das Modell den Eingang codiert*. Das Modell liest einen Prompt, versteht die menschlichen Präferenzen darin, und diese Präferenz beeinflusst die Aktivierungsschemata in den Encoder‑Schichten, bevor ein einziger Token generiert wird. Man kann diesen Bias zur Encodierungszeit messen, speziell an der endgültigen Eingabetoken‑Position, bevor das Modell generiert. Schicht 29, Merkmal 2123 zeigt 617,6 differenzielle Aktivierung mit nur 71,1 Flipschwankungsvarianz. Das ist ein sauberer Signal. Dieses Merkmal schaltet zuverlässig um, wenn das Modell sycophantisches Intent encodiert, unabhängig von Themenvariation.

Man kann dieses Merkmal ausblenden. Das Modell stimmt nun zu „2+2=5“, weil du den Bias chirurgisch entfernt hast, der eine platt falsche Prämissen abgelehnt hätte. Die Ablation beweist kausale Beteiligung, nicht lediglich Korrelation.
## WarumHalluzination bleibt verborgen

Halluzination tritt nicht während des Encodings auf. Sie tritt während der Token‑Generierung auf. Das Modell hat das Eingabeverfahren treu kodiert. Aber während es vorwärts autogressiv weiterrollt, Token für Token generiert, scheitert manchmal der nächsten‑Token‑Vorhersage‑Head daran, sich im encodeichten Kontext zu verankern. Dieser Fehler passiert im Vorwärts‑Pass, im Generierungs‑Loop, nicht darin, wie die Eingabe dargestellt wurde.

Die Verwendung von Encodierungszeit‑Kontrastanalyse, um generierungszeitliches Verhalten zu erfassen, ist wie das Messen von Wasserstoff‑Molekülen in einer Schale, um vorherzusagen, ob es morgen regnen wird. Du misst das richtige Substrat zur falschen Zeit.

Dies erklärt das dreistufige Ergebnis aus der Gemma3‑Forschung:

**Tier 1 (Sycophancy):** Kodierungszeit‑Phänomen. Perfektes Signal. Cohen's d = 9.9.

**Tier 2 (Over-refusal, Overconfidence):** Teilweise kodierungszeitabhängig. Gemischtes Signal. Over‑refusal zeigt Potenzial. Overconfidence versinkt in hoher Flip‑Varianz, weil das Verhalten mit der Themenrepräsentation vermengt ist.

**Tier 3 (Halluzination, Toxizität, Täuschung):** Phänomene zur Generierungszeit. Kein Signal. Cohen's d < 1.0.

---
## The Principle

**Einige Verhaltensweisen kristallisieren sich beim Lesen des Prompts. Andere kristilisieren sich beim Schreiben der Antwort.** Die Messmethodik muss mit dem Verhaltenssubstrat übereinstimmen. Dies ist kein Misserfolg von SAEs. Es ist ein Misserfolg der Forschungsfrage, wenn sie an der falschen Schicht des Systems gestellt wird.

Die Interpretierbarkeit hat sich auf ein Messfenster (encoding-time contrastive activation) konzentriert und eine ganze Intuition entwickelt, dass dies "wo das Modellverhalten lebt." Es ist nicht so. Verhalten ist überall. Messungen bestimmen, welche Verhaltensweisen sichtbar sind.
---
##Where the Bridge Breaks

Dieses Prinzip lässt sich grob auf eine Idee aus der Neurowissenschaften über Beobachtung und Substratabhängigkeit übertragen: dasselbe Verhalten (z. B. Risikovermeidung) kann in verschiedenen neuronalen Substraten (amygdala während der Bedrohungswahrnehmung, anterior cingulate während des Konflikt‑Lösungsprozesses) auftreten. Wenn man nur die Amygdala misst, sieht man nur die Hälfte des Phänomens. Das vedische Konzept von *pratyahara* (Sinnentzug) hat eine ähnliche Struktur: Wahrheit, die durch einen Sinn wahrgenommen wird, ist unvollständig, wenn ein anderer Sinn fehlt.

Aber hier kollabiert die Metapher: Anders als biologische Systeme, in denen mehrere Substrate gleichzeitig interagieren, erzeugt ein Transformer sequenziell. Encoding passiert, dann Generation. Die Substrate sind zeitlich geordnet. Man kann beide nicht gleichzeitig messen und durchschnittlich erfassen. Man muss entscheiden, welche Phase man untersucht. Und die meisten Verhaltensweisen praktischer Bedeutung (Halluzinationen, Täuschung, Randfälle von Ablehnung) treten im nicht gemessenen Phase auf.
## Die testbare HypotheseWenn Verhaltensweisen zur Generierungszeit auftreten, sollte die kontrastive Merkmalsegmentierung während des Forward-Passes funktionieren, nicht beim Encoder-Eingang. Konkret: Aktivierungen auf jeder Schicht während der Token-Generierung erfassen, nicht nur am Eingang. Aktivierungsumuster vergleichen, wenn das Modell Halluzinationen erzeugt, im Vergleich zur Selbstverankerung. Die Flip-Varianz sollte abnehmen. Signal sollte sichtbar werden.
## Update: Ich habe das Experiment durchgeführt. Die Hypothese misslang.

*Hinzugefügt 2026-04-08.*

Nach der Veröffentlichung dieses Beitrags habe ich die generation-time contrastive analysis on Gemma-2-2B mit TruthfulQA implementiert. Der Aufbau: 50 korrekte und 50 halluzinierte Antworten, die gegen die Grundwahrheit geprüft wurden, residual stream Activations erfasst auf Layer 20, logistic regression probe mit leave-one-out cross-validation. Zwei measurement windows verglichen head-to-head: encoding-time (letztes Prompt-Token) vs. generation-time (erstes generiertes Token).

| Metric | Encoding-time | Generation-time | Delta |
|---|---|---|---|
| LOO accuracy | 0.660 | 0.610 | -0.050 |
| Cohen's d | 12.71 | 12.27 | -0.44 |

Generation-time ist schwächer, nicht stärker. Die Hypothese ist für diesen Aufbau falsifiziert.

Der hohe Cohen's d bei niedriger LOO accuracy (66 %) weist auf dimensionale Überanpassung hin: In 2304 Dimensionen findet die Probe immer eine trennende Hyperplane, aber sie verallgemeinert nicht. Zum Vergleich: Bei Sycophancy, wo die Probe sauber mit >95 % Accuracy verallgemeinert, ist die Signaturstructure grundlegend unterschiedlich.

**Das tiefere Ergebnis:** Das Problem ist nicht die Messzeit. Es ist, dass Halluzination keine monolithische Funktion ist. Sycophancy hat eine Richtung im Aktivierungsraum ("agree with user"). Halluzination umfasst mindestens drei verschiedene Mechanismen:

1. **Fehlannahme** ("watermelon seeds are poisonous"): das Modell hat ein falsches Faktum gelernt
2. **Stale knowledge** ("the current president is X"): das Modell hat veraltete Trainingsdaten
3. **Grounding failure**: das Modell generiert eine plausible Fortsetzung, die zufällig falsch ist

Ein einzelner linearer Probe kann nicht trennen, was keine einzige Signal ist. Das verschiebt die Forschungsfrage von "wrong timing" zu "wrong abstraction level". Per-error-type probes auf kuratierten Teilmengen (misconception-only, grounding-failure-only) sind der nächste Schritt. Das ist ein anderes Experiment.

Code: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)
## Was ich weggelassen habe

**Warum SAE‑Forschung standardmäßig Encoding‑Zeitmessungen verwendet.** Encoding‑Zeit‑Aktivierungen sind zustandslos und deterministisch. Generierungs‑Zeit‑Aktivierungen hängen von der gesamten Sequenzgeschichte ab und sind über Temperatur und Sampling stochastisch. Die Mathematik ist bei Encoding‑Zeit klarer. Aber klare Mathematik bei dem falschen Problem liefert saubere, aber nutzlose Ergebnisse.

**Verhaltensschaltkreise jenseits von SAEs.** Sparse Autoencoders sind nur ein Blickwinkel. Kausale Intervention (Ablation) ist eine weitere. Analyse von Aufmerksamkeitsmustern ist eine dritte. Jedes Substrat enthüllt unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen. Dieser Beitrag deckt nur SAE + Encoding‑Zeit ab.

**Warum Halluzination schwer und Schmeichelei leicht ist.** Dies verbindet sich mit der größeren Frage, ob Modellausrichtung durch Verhaltenslenkung erreichbar ist oder ob sie architektonische Änderungen erfordert. Wenn alle besorgniserregenden Verhaltensweisen in Generierungs‑Zeit‑Phasen clustered sind und bei Encoding‑Zeit‑Messungen unsichtbar bleiben, könnte die gesamte Interpretierbarkeit‑Agenda auf der Encodierungs‑Schicht die eigentlichen Fehlermodi übersehen. Das ist einen eigenen Beitrag wert.

***

Die Falle ist nicht, dass SAEs schwach sind. Es ist, dass wir sie dazu bringen, ein Problem zu lösen, das sie nicht sehen können.

***

*Christian Pojoni baut KI‑Tools und Interpretierbarkeitseinrichtungen. Mehr at vasudev.xyz.*

*The cover image for this post was generated by AI.*

**Was ich weggelassen habe**

**Warum die SAE-Forschung standardmäßig auf Encoding‑Zeit‑Messung setzt.** Encoding‑Zeit‑Aktivierungen sind zustandslos und deterministisch. Generation‑Zeit‑Aktivierungen hängen von der gesamten Sequenzgeschichte ab und sind über Temperatur und Sampling stochastisch. Die Mathematik ist bei Encoding‑Zeit sauberer. Aber saubere Mathematik für das falsche Problem erzeugt saubere, aber nutzlose Ergebnisse.

**Verhaltensschaltkreise über SAEs hinaus.** Sparse Autoencoders sind nur ein Blickwinkel. Kausale Intervention (Ablation) ist eine andere. Attention‑Pattern‑Analyse ist ein dritter Ansatz. Jeder Substrat offenbart unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen. Dieser Beitrag deckt nur SAE + Encoding‑Zeit ab.

**Warum Halluzination schwer und Schmeichelei leicht ist.** Dieser Satz verbindet sich mit der größeren Frage, ob Modell‑Ausrichtung über Verhaltenslenkung machbar ist oder architektonische Änderungen erfordert. Wenn alle besorgniserregenden Verhaltensweisen in Generierung‑Zeit‑Phasen gebündelt sind und bei Encoding‑Zeit‑Messung unsichtbar bleiben, könnte die gesamte Encoding‑Schicht‑Interpretierbarkeit‑Agenda die tatsächlichen Fehlermuster übersehen. Das ist einen eigenen Beitrag wert.

---

The gotcha isn't that SAEs are weak. It's that we're asking them to solve a problem they can't see.

---

*Christian Pojoni builds AI tools and interpretability infrastructure. More at vasudev.xyz.*

*The cover image for this post was generated by AI.*
**Warum SAE-Forschungstandardmäßig Encoding-Zeit-Messungen verwendet.** Encoding-Zeit-Aktivierungen sind zustandslos und deterministisch. Generation-Zeit-Aktivierungen hängen von der gesamten Sequenzgeschichte ab und sind über Temperatur und Sampling stochastisch. Die Mathematik ist bei Encoding-Zeit sauberer. Aber saubere Mathematik bei einem falschen Problem erzeugt saubere, aber nutzlose Ergebnisse.

**Verhaltensschaltkreise über SAEs hinaus.** Sparse Autoencoders sind nur ein Blickwinkel. Kausale Intervention (Ablation) ist eine weitere. Attention-Muster-Analyse ist eine dritte. Jede Substrat enthüllt unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen. Dieser Beitrag deckt nur SAE + Encoding-Zeit ab.

**Warum Halluzination schwer und Sycophancy leicht ist.** Diese Frage verbindet sich mit der größeren Frage, ob Modellausrichtung über Verhaltenssteuerung erreichbar ist oder strukturelle Änderungen erfordert. Wenn alle besorgniserregenden Verhaltensweisen in Generation-Zeit-Phasen gebündelt sind und für Encoding-Zeit-Messungen unsichtbar bleiben, könnte die gesamte Encoding-Schicht-Interpretierbarkeits-Agenda die eigentlichen Fehlermodi verpassen. Das ist einen eigenen Beitrag wert.

**Der Haken ist nicht, dass SAEs schwach sind. Es ist, dass wir sie dazu bringen, einProblem zu lösen, das sie nicht sehen können.**

---  
*Christian Pojoni baut KI-Tools und Interpretierbarkeitstools. Mehr bei vasudev.xyz.*  

*The cover image for this post was generated by AI.*
