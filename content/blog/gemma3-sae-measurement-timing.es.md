---
title: "Los Autoencoders Esparcidos No Pueden Medir el Comportamiento en Tiempo de Generación. Eso No Es Un Error."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "¿Por quélas características sycophancy SAE tienen Cohen's d=9.9 pero la detección de alucinaciones falla? La respuesta resultó ser más profunda que el momento de la medición."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "4bc4420c5c58a6644c04cd50134798a6"
chunkHashes: "1806cdfd3861ef53,966f3ebf65e8edcc,e2f0a6956f01f3c7,1fff53596e298911,0eb457ee5f304077,3befffa15cb47332,26a5f76187d23654,48daa219c364a9b5"
---
**La ventana de medición determinaqué comportamientos puedes observar. La sísifancia se manifiesta durante la codificación. La alucinación se manifiesta durante la generación. Usa el momento equivocado y tu Cohen's d se colapsa.**

Pasé dos horas la semana pasada mirando un gráfico de características de un auto codificador esparso Gemma3 (SAE) y me preguntaba por qué la detección de sísifancia funcionaba perfectamente (Cohen's d alrededor de 9.9) mientras que la detección de alucinación se quedó plana (d < 1.0). Mismo modelo. Mismo SAE. Misma metodología. Los intervalos de error no se solapaban. Esto no debería ser posible si los SAE están encontrando realmente "características comportamentales" de la manera en que la comunidad de interpretabilidad afirma.

Entonces se dio cuenta: el momento estaba equivocado.
## When Sycophancy Shows Up

La adulación es un sesgo en *cómo el modelo codifica la entrada*. El modelo ve un prompt, lee las preferencias humanas en él, y esa preferencia sesga los patrones de activación en las capas codificadoras antes de que se genere un solo token. Puedes medir este sesgo en el tiempo de codificación, específicamente en la posición del último token de entrada, antes de que el modelo genere. Layer 29, feature 2123 shows 617.6 differential activation with only 71.1 flip variance. That's clean signal. Esa característica se activa de forma confiable cuando el modelo codifica intención sífilica, independientemente de la variación del tema.

You can zero that feature out. The model agrees that "2+2=5" because you've surgically removed the bias that would have rejected a flatly false premise. The ablation proves causal involvement, not mere correlation.
## Why Hallucination Stays HiddenHallucinación no se manifiesta durante el encoding. Se manifiesta durante la generación de tokens. El modelo ha codificado la entrada fielmente. Pero a medida que avanza autoregresivamente, generando token tras token, a veces la cabeza de predicción del siguiente token falla en anclarse en el contexto que acaba de codificar. Esa falla ocurre en el paso hacia adelante, en el bucle de generación, no en cómo se representó la entrada.

Usar el análisis contrastivo en tiempo de encoding para detectar comportamiento en tiempo de generación es como medir las moléculas de agua en un vaso para predecir si mañana lloverá. Estás midiendo el sustrato correcto en el momento equivocado.

Esto explica el resultado de tres niveles de la investigación **Gemma3**:

**Tier 1 (Sycophancy):** fenómeno de encoding. Señal perfecta. Cohen's d = 9.9.

**Tier 2 (Over-refusal, Overconfidence):** parcialmente fenómeno de encoding. Señal mixta. Over-refusal muestra promesa. Overconfidence se ahoga en alta variación de flip porque el comportamiento está entrelazado con la representación del tema.

**Tier 3 (Hallucination, Toxicity, Deception):** fenómenos de tiempo de generación. Sin señal. Cohen's d < 1.0.

---
## El Principio

**Algunos comportamientos cristalizan mientras el modelo lee el prompt. Otros cristalizan mientras el modelo escribe la respuesta.** El método de medición debe coincidir con el sustrato de comportamiento. Esto no es una falla de **SAEs**. Es una falla de la pregunta de investigación cuando se formula al capa equivocada del sistema.

El campo de **interpretabilidad** ha aferrado a una sola ventana de medición (encoding-time contrastive activation) y ha construido toda una intuición de que esto es "donde vive el comportamiento del modelo". No es así. El comportamiento vive en todas partes. La medición determina qué comportamientos son visibles.
## Where theBridge Breakes

Este principio se mapea vaguamente sobre una idea de la neurociencia sobre observación y dependencia del sustrato: el mismo comportamiento (por ejemplo, risk-avoidance) puede manifestarse en diferentes sustratos neuronales (amygdala durante detección de amenaza, anterior cingulate durante resolución de conflicto). Si solo se mide la amígdala, se ve solo la mitad del fenómeno. El concepto védico de *pratyahara* (sense withdrawal) tiene una estructura similar: la verdad percibida a través de un sentido es incompleta cuando otro sentido está ausente.

Pero aquí es donde la metáfora se desmorona: a diferencia de los sistemas biológicos donde múltiples sustratos interactúan simultáneamente, un transformer genera secuencialmente. La codificación ocurre, y luego la generación ocurre. Los sustratos están ordenados temporalmente. No puedes medirlos simultáneamente y promediarlos. Debes escoger qué fase interrogar. Y la mayoría de los comportamientos de preocupación práctica (hallucination, deception, refusal edge cases) ocurren en la fase que no estás midiendo.
```
## La Hipótesis Comprobable

Si los comportamientos se manifiestan en tiempo de generación, entonces la búsqueda de características contrastivas debería ocurrir durante el paso hacia adelante, no en la entrada del codificador. En concreto: capturar activaciones en cada capa durante la generación de tokens, no solo en la entrada. Comparar patrones de activación cuando el modelo alucina versus cuando se ancla. La varianza de inversión debería disminuir. La señal debería emerger.

Este cambio pasa la metodología de "codificación-tiempo contrastive" a "generación-tiempo contrastive". Ventana de medición diferente. Características diferentes. Potencialmente diferente utilidad.
```
## Update: I Ran the Experiment. The Hypothesis Failed.

*Added 2026-04-08.*

After publishing this post, I implemented the generation-time contrastive analysis on Gemma-2-2B using TruthfulQA. The setup: 50 correct and 50 hallucinated responses screened against ground truth, residual stream activations captured at Layer 20, logistic regression probe with leave-one-out cross-validation. Two measurement windows compared head-to-head: encoding-time (last prompt token) vs. generation-time (first generated token).

| Metric | Encoding-time | Generation-time | Delta |
|---|---|---|---|
| LOO accuracy | 0.660 | 0.610 | -0.050 |
| Cohen's d | 12.71 | 12.27 | -0.44 |

generation-time es más débil, no más fuerte. The hypothesis is falsified for this setup.

The high Cohen's d with low LOO accuracy (66%) points to dimensional overfitting: in 2304 dimensions, the probe always finds a separating hyperplane, but it doesn't generalize. Compare this to sycophancy, where the probe generalizes cleanly at 95%+ accuracy. The signal structure is fundamentally different.

**The deeper finding:** The problem isn't measurement timing. It's that hallucination isn't a monolithic feature. Sycophancy has one direction in activation space ("agree with user"). Hallucination is at least three different mechanisms:

1. **Misconception** ("watermelon seeds are poisonous"): the model has learned a false fact
2. **Stale knowledge** ("the current president is X"): the model's training data is outdated
3. **Grounding failure**: the model generates a plausible continuation that happens to be wrongA single linear probe can't separate what isn't a single signal. This shifts the research question from "wrong timing" to "wrong abstraction level." Per-error-type probes on curated subsets (misconception-only, grounding-failure-only) are the next step. That's a different experiment.

Code: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)
## Lo Que Dejé Afuera

**Why SAE research defaults to encoding-time measurement.** Activaciones en tiempo de codificación son sin estado y determinísticas. Activaciones en tiempo de generación dependen de toda la historia de la secuencia y son estocásticas a través de temperatura y muestreo. La matemática es más clara en tiempo de codificación. Pero una matemática limpia sobre el problema equivocado produce resultados limpios pero inútiles.

**Behavioral circuits beyond SAEs.** SAEs son una lente. La intervención causal (ablación) es otra. El análisis de patrones de atención es una tercera. Cada submundo revela diferentes comportamientos. Una visión completa requiere múltiples métodos de medición a través de múltiples fases. Esta publicación solo cubre SAE + tiempo de codificación.

**Why hallucination is hard and sycophancy is easy.** Esto conecta con la pregunta más amplia de si la alineación del modelo es manejable mediante la dirección conductual o si requiere un cambio arquitectónico. Si todos los comportamientos preocupantes se agrupan en fases de generación y son invisibles en la medición en tiempo de codificación, entonces todo el enfoque de interpretabilidad de la capa de codificación podría estar pasando por alto los modos reales de fallo. Esto merece su propio artículo.

---

The gotcha isn't that SAEs are weak. It's that we're asking them to solve a problem they can't see.

---

*Christian Pojoni builds AI tools and interpretability infrastructure. More at vasudev.xyz.*

*The cover image for this post was generated by AI.*