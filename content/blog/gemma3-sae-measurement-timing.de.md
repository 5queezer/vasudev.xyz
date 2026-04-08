---
title: "Sparse Autoencoder können nicht das Generierungszeit-Verhalten messen. Das ist kein Fehler."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "Warum sycophancy SAE-Features haben Cohen's d=9.9, aber die Halluzinationserkennung versagt. Die Antwort stellte sich als tiefer heraus als die Messung des Zeitpunkts."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "4bc4420c5c58a6644c04cd50134798a6"
chunkHashes: "1806cdfd3861ef53,966f3ebf65e8edcc,e2f0a6956f01f3c7,1fff53596e298911,0eb457ee5f304077,3befffa15cb47332,26a5f76187d23654,48daa219c364a9b5"
---
**Dein Messfenster bestimmt, welche Verhaltensweisen du sehen kannst. Schmeichelei manifestiert während des Encodings. Halluzination manifestiert während der Generierung. Nutze die falsche Timing, und deine Cohen's d bricht zusammen.**

Ich verbrachte zwei Stunden letzte Woche damit, starr auf ein Gemma3 sparse autoencoder (SAE) Merkmal-Diagramm zu starren und mir zu fragen, warum die Schmeichelei‑Erkennung perfekt funktionierte (Cohen's d ca. 9.9), während die Halluzination‑Erkennung flachlief (d < 1.0). Das gleiche Modell. Das gleiche SAE. Das gleiche Verfahren. Die Fehlerbalken überschneiden sich nicht. Das sollte nicht möglich sein, wenn SAEs tatsächlich "behavioral features" so finden, wie es die Interpretierbarkeitsgemeinschaft behauptet.

Dann war es klar: die Timing war falsch.
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