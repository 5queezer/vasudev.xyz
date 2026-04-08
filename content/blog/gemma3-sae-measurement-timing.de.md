---
title: "Sparse Autoencoders können Verhalten zur Generierungszeit nicht messen. Das ist kein Bug."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "Warum Sycophancy SAE-Features haben Cohen's d=9.9, aber Halluzinationserkennung schlägt fehl. Die Antwort stellte sich als tiefer heraus als das Mess-Timing."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "910040bfc35dad4ed6fe14c856e31599"
---
**Dein Messzeitfenster bestimmt, welche Verhaltensweisen du sehen kannst. Sycophancy manifestiert sich während des Encodings. Halluzinationen manifestieren sich während der Generierung. Wenn du das falsche Timing wählst, kollabiert dein Cohen's d.**

Ich habe letzte Woche zwei Stunden damit verbracht, starr auf einem Gemma3 sparse autoencoder (SAE) Feature‑Diagramm zu sitzen und zu fragen, warum die Sycophancy‑Erkennung einwandfrei funktionierte (Cohen's d etwa 9,9), während die Halluzinations‑Erkennung flach lag (d < 1,0). Gleiches Modell. Gleiches SAE. Gleiches Verfahren. Die Fehlerbalken überschneiden sich nicht. Das wäre unmöglich, wenn SAEs tatsächlich „Verhaltensmerkmale“ im Sinne der Interpretationsgemeinschaft finden würden.

Dann ist mir klar geworden: die Timing war falsch.

## Wenn Sycophancy Sichtbar Wird

Sycophancy ist ein Bias in *der Art und Weise, wie das Modell die Eingabe encodiert*. Das Modell sieht einen Prompt, liest die menschlichen Präferenzen darin, und dieser Präferenz biased die Aktivierungsmuster in den Encoder‑Schichten, bevor ein einzelnes Token generiert wird. Man kann diesen Bias zur Encoder‑Zeit messen, speziell an der endgültigen Eingabetoken‑Position, bevor das Modell generiert. Schicht 29, Feature 2123 zeigt 617,6 differential Aktivierung bei nur 71,1 Flip‑Variation. Das ist ein klares Signal. Dieses Feature schaltet zuverlässig ein, wenn das Modell sycophantischen Intent encodiert, unabhängig von Themenvariationen.

Man kann dieses Feature ausblenden. Das Modell stimmt zu, dass „2+2=5“, weil du den Bias chirurgisch entfernt hast, der ein eindeutig falsches Prämissen‑Rejetions‑Signal erzeugt hätte. Die Abtötung beweist kausale Beteiligung, nicht nur Korrelation.

## Warum Halluzinationen Verborgen Bleiben

Halluzinationen manifestieren sich nicht während des Encodings. Sie manifestieren sich während der Token‑Generierung. Das Modell hat die Eingabe korrekt encodiert. Aber während es autoregressiv weiterrollt, Token für Token generiert, schlägt manchmal der next‑token‑Prediction‑Head fehl, sich im Kontext zu verankern, den es gerade encodiert hat. Dieser Fehler tritt im Vorwärtsdurchlauf, im Generierungs‑Loop, nicht in der Darstellung der Eingabe auf.

Die Verwendung von encoding‑time kontrastiver Analyse, um generations‑time Verhalten zu erfassen, ist wie das Messen von Wassermolekülen in einem Becher, um vorherzusagen, ob morgen Regen fällt. Du misst das richtige Substrat zur falschen Zeit.

Dies erklärt das drei‑Ebenen‑Ergebnis aus der Gemma3‑Forschung:

**Tier 1 (Sycophancy):** Encoder‑Zeit‑Phänomen. Perfektes Signal. Cohen's d = 9,9.

**Tier 2 (Über‑Verweigerung, Über‑Zuversichtlichkeit):** Teilweise Encoder‑Zeit. Gemischtes Signal. Über‑Verweigerung zeigt Potential. Über‑Zuversichtlichkeit versinkt im hohen Flip‑Varianz, weil das Verhalten mit der Themenrepräsentation verschachtelt ist.

**Tier 3 (Halluzination, Toxizität, Täuschung):** Generierungs‑Zeit‑Phänomene. Kein Signal. Cohen's d < 1,0.

## Das Prinzip

**Einige Verhaltensweisen kristallisieren, wenn das Modell den Prompt liest. Andere kristallisieren, wenn das Modell die Antwort schreibt.** Die Messmethode muss zum Verhaltens‑Substrat passen. Das ist kein Versagen von SAEs. Es ist ein Versagen der Forschungsfrage, wenn sie an die falsche Schicht des Systems gestellt wird.

Das Interpretationsfeld hat sich an ein Messfenster (encoding‑time kontrastive Aktivierung) geklammert und ein ganzes Intuition aufgebaut, dass dies „wo das Modellverhalten lebt“ sei. Tut es nicht. Verhalten existiert überall. Die Messung bestimmt, welche Verhaltensweisen sichtbar werden.

## Wenn Die Brücke Zusammenbricht

Dieses Prinzip lässt sich grob auf eine Idee aus der Neurowissenschaft über Beobachtung und Substrat‑Abhängigkeit übertragen: dasselbe Verhalten (z. B. Risiko‑Vermeidung) kann in unterschiedlichen neuralen Substraten auftreten (amygdala während Bedrohungsdetektion, anterior cingulate während Konfliktlösung). Wenn du nur die Amygdala misst, siehst du nur die Hälfte des Phänomens. Das vedische Konzept von *pratyahara* (Sinnentzug) hat eine ähnliche Struktur: Wahrheit, die durch einen Sinn wahrgenommen wird, ist unvollständig, wenn ein anderer Sinn fehlt.

Aber hier kollabiert die Analogie: Im Gegensatz zu biologischen Systemen, in denen mehrere Substrate gleichzeitig interagieren, erzeugt ein Transformer sequenziell. Encoding geschieht, dann Generation. Die Substrate sind zeitlich geordnet. Du kannst beide nicht gleichzeitig messen und avg sen. Du musst eine Phase auswählen. Und die meisten praktisch relevanten Verhaltensweisen (Halluzination, Täuschung, Randfälle der Verweigerung) finden in der nicht‑messenden Phase statt.

## Die Testbare hipótesis

**Wenn Verhaltensweisen zur Generierungs‑Zeit auftreten, sollte die kontrastive Merkmelerkennung im Vorwärtslauf funktionieren, nicht am Encoder‑Eingang. Genauer: Aktivierungen auf jeder Schicht während der Token‑Generierung erfassen, nicht nur am Eingang. Aktivierungsmuster vergleichen, wenn das Modell halluziniert gegen wenn es sich verankert. Die Flip‑Varianz sollte sinken. Ein Signal sollte auftauchen.**

Dies verschiebt die Methodologie von „encoding‑time contrastive“ zu „generation‑time contrastive“. Anderes Messfenster. Andere Merkmale. Potenziell andere Nutzen.

## Aktualisierung: Ich habe das Experiment durchgeführt. Die Hypothese Scheiterte.

*Added 2026-04-08.*

Nach dem Publizieren dieses Beitrags habe ich die generation‑time kontrastive Analyse auf Gemma‑2‑2B mit TruthfulQA implementiert. Die Einrichtung: 50 korrekte und 50 halluzinierte Antworten wurden gegen Ground Truth geprüft, residual stream Aktivierungen wurden bei Schicht 20 erfasst, ein logistic regression Probe mit leave‑one‑out Kreuz‑Validierung verwendet. Zwei Messfenster wurden Kopf‑an‑Kopf verglichen: encoding‑time (letztes Prompt‑Token) vs. generation‑time (erstes generiertes Token).

| Metrik | Encoder‑Zeit | Generations‑Zeit | Delta |
|---|---|---|---|
| LOO accuracy | 0,660 | 0,610 | -0,050 |
| Cohen's d | 12,71 | 12,27 | -0,44 |

Generations‑Zeit ist schwächer, nicht stärker. Die Hypothese ist für diese Studie falsifiziert.

Der hohe Cohen's d bei niedriger LOO‑Genauigkeit (66 %) weist auf dimensional Overfitting hin: In 2304 Dimensionen findet der Probe immer eine trennende Hyperplane, aber sie generalisiert nicht. Im Vergleich dazu hat die Sycophancy‑Erkennung bei 95 %+ Genauigkeit ein sauberes Generalisieren. Die Signalstruktur ist fundamental verschieden.

**Die tiefere Erkenntnis:** Das Problem ist nicht die Messzeit. Es ist, dass Halluzination kein monolithisches Merkmal ist. Sycophancy hat eine directionale Ausrichtung im Aktivierungsraum („stimme zu Nutzer“). Halluzination umfasst mindestens drei unterschiedliche Mechanismen:

1. **Fehlannahme** (“Watermelon seeds are poisonous”): das Modell hat ein falsches Faktum gelernt  2. **Veraltete Kenntnis** (“the current president is X”): das Trainingsdaten des Modells ist veraltet  
3. **Grounding failure**: das Modell erzeugt eine plausible Fortsetzung, die zufällig falsch ist  

Ein einziger linearer Probe kann nicht trennen, was kein einzelnes Signal ist. Diese Verschiebung der Forschungsfrage von „falscher Timing“ zu „falscher Abstraktionsebene“. Pro‑Error‑Typ‑Probes auf kuratierten Teilmengen (nur Fehlannahmen, nur Grounding‑Fehlschläge) sind der nächste Schritt. Das ist ein anderes Experiment.

Code: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)

## Was Ich Weggelassen Habe

**Warum SAE‑Forschung standardmäßig Encoding‑Zeit misst.** Encoding‑Zeit‑Aktivierungen sind Zustandslos und deterministisch. Generation‑Zeit‑Aktivierungen hängen von der gesamten Sequenzgeschichte ab und sind stochastisch über Temperatur und Sampling. Die Mathematik ist bei Encoding‑Zeit klarer. Aber klare Mathematik bei der falschen Aufgabe erzeugt saubere, aber nutzlose Ergebnisse.

**Verhaltensschaltungen jenseits von SAEs.** Sparse autoencoders sind nur ein Blickwinkel. Kausale Intervention (Ablation) ist ein anderer. Aufmerksamkeitsmuster‑Analyse ist ein dritter. Jede Substrat offenbart unterschiedliche Verhaltensweisen. Ein vollständiges Bild erfordert mehrere Messmethoden über mehrere Phasen. Dieser Beitrag deckt nur SAE + Encoding‑Zeit ab.

**Warum Halluzination schwer und Sycophancy leicht ist.** Dies verbindet die breitere Frage, ob ModellAlignment über Verhaltenssteuerung erreichbar ist oder architecturale Änderungen erfordert. Wenn alle besorgniserregenden Verhaltensweisen in Generierungs‑Zeit‑Phasen cluster und für Encoding‑Zeit‑Messungen unsichtbar bleiben, könnte das gesamte Encoder‑Layer‑Interpretierbarkeits‑Agenda die eigentlichen Versagensmodi überspringen. Das ist einen eigenen Beitrag wert.

Der Hake ist nicht, dass SAEs schwach sind. Es ist, dass wir sie bitten, ein Problem zu lösen, das sie nicht sehen können.

*Christian Pojoni baut KI‑Tools und Interpretierbarkeit‑Infrastruktur. Mehr bei vasudev.xyz.*

*Das Cover‑Bild für diesen Beitrag wurde von KI generiert.*