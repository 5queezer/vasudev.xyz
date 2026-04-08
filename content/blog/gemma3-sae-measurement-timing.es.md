---
title: "Sparse Autoencoders No pueden medir el comportamiento de generación en tiempo de generación. No es un error."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "¿Por qué las características de SAE de adulación tienen Cohen's d=9.9 pero la detección de alucinaciones falla? La respuesta resultó ser más profunda que la medida del momento."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "910040bfc35dad4ed6fe14c856e31599"
---
**Tu ventana de medida determina qué comportamientos puedes observar. La sycophancy se manifiesta durante la codificación. La alucinación se manifiesta durante la generación. Usar el momento equivocado y tu Cohen's d colapsa.**

## Cuando aparece la sycophancyLa sycophancy es un sesgo en *cómo el modelo codifica la entrada*. El modelo ve un prompt, lee las preferencias humanas en él, y esa preferencia sesga los patrones de activación en las capas del codificador antes de que se genere cualquier token. Puedes medir este sesgo en el tiempo de codificación, específicamente en la posición del último token de entrada, antes de que el modelo genere. La capa 29, característica 2123 muestra una activación diferencial de 617.6 con solo 71.1 variación de volteo. Esa es una señal limpia. Esa característica se activa de manera fiable cuando el modelo codifica la intención sycophantic, independientemente de la variación del tema.

Puedes anular esa característica. El modelo está de acuerdo con que "2+2=5" porque has eliminado quirúrgicamente el sesgo que habría rechazado una premisa falsamente plana. La ablación demuestra una participación causal, no solo correlación.

## Por qué la alucinación permanece oculta

La alucinación no se manifiesta durante la codificación. Se manifiesta durante la generación de tokens. El modelo ha codificado la entrada fielmente. Pero a medida que avanza autoregresivamente, generando token tras token, a veces la cabeza de predicción del siguiente token falla en anclarse al contexto que acaba de codificar. Ese fallo ocurre en el paso hacia adelante, en el bucle de generación, no en cómo serepresentó la entrada.

Usar un análisis contrastivo en tiempo de codificación para detectar comportamiento en tiempo de generación es como medir las moléculas de agua en un vaso para predecir si mañana va a llover. Estás midiendo el sustrato correcto en el momento equivocado.

Esto explica el resultado de tres niveles de la investigación Gemma3:

**Nivel 1 (sycophancy):** Fenómeno de tiempo de codificación. Señal perfecta. Cohen's d = 9.9.

**Nivel 2 (Sobre‑rechazo, Sobreconfianza):** Parcialmente de tiempo de codificación. Señal mixta. El sobre‑rechazo muestra potencial. La sobreconfianza se ahoga en alta variación de volteo porque el comportamiento está entrelazado con la representación del tema.

**Nivel 3 (Alucinación, Toxicidad, Engaño):** Fenómenos de tiempo de generación. Sin señal. Cohen's d < 1.0.

---

## El principio

**Algunos comportamientos se cristalizan cuando el modelo lee el prompt. Otros se cristalizan cuando el modelo escribe la respuesta.** El método de medición debe coincidir con el sustrato del comportamiento. Esto no es un fallo de las SAEs. Es un fallo de la pregunta de investigación cuando se formula en la capa equivocada del sistema.

El campo de interpretabilidad se ha aferrado a una sola ventana de medida (activación contrastiva en tiempo de codificación) y ha construido toda una intuición de que eso es "donde viven los comportamientos del modelo". No lo es. Los comportamientos viven en todas partes. La medida determina qué comportamientos son visibles.

---

## Donde se rompe el puente

Este principio se maps vaguamente a una idea de la neurociencia sobre observación y dependencia del sustrato: el mismo comportamiento (por ejemplo, evitación de riesgo) puede manifestarse en diferentes sustratos neuronales (amígdala durante detección de amenaza, cingulado anterior durante resolución de conflicto). Si solo mides la amígdala ves la mitad del fenómeno. El concepto vedico de *pratyahara* (retirada sensorial) tiene una estructura similar: la verdad percibida a través de un sentido es incompleta cuando falta otro sentido.

Pero aquí es donde la metáfora colapsa: a diferencia de los sistemas biológicos donde múltiples sustratos interactúan simultáneamente, un transformer genera secuencialmente. La codificación ocurre, luego la generación. Los sustratos están ordenados temporalmente. No puedes medir ambos simultáneamente y promediarlos. Debes elegir qué fase interrogar. Y la mayoría de los comportamientos de preocupación práctica (alucinación, engaño, casos de rechazo) ocurren en la fase que no estás midiendo.

---

## La hipótesis comprobable

Si los comportamientos se manifiestan en tiempo de generación, entonces el descubrimiento de características contrastivas debería funcionar durante el paso hacia adelante, not en la entrada del codificador. Específicamente: captura activaciones en cada capa durante la generación de tokens, not solo en la entrada. Compara patrones de activación cuando el modelo alucina versus cuando basa su salida en el contexto. La variación de volteo debería disminuir. Debería surgir señal.

Esto cambia la metodología de "contraste en tiempo de codificación" a "contraste en tiempo de generación". Ventana de medida diferente. Características diferentes. Potencialmente different utility.

---

## Update: I Ran the Experiment. The Hypothesis Failed.

*Added 2026-04-08.*

After publishing this post, I implemented the generation-time contrastive analysis on Gemma-2-2B using TruthfulQA. The setup: 50 correct and 50 hallucinated responses screened against ground truth, residual stream activations captured at Layer 20, logistic regression probe with leave-one-out cross-validation. Two measurement windows compared head-to-head: encoding-time (last prompt token) vs. generation-time (first generated token).

| Métrica | Encoding-time | Generation-time | Delta |
|---|---|---|---|
| LOO accuracy | 0.660 | 0.610 | -0.050 |
| Cohen's d | 12.71 | 12.27 | -0.44 |

El tiempo de generación es más débil, no más fuerte. La hipótesis se falsifica para este setup.

The high Cohen's d with low LOO accuracy (66%) points to dimensional overfitting: in 2304 dimensions, the probe always finds a separating hyperplane, but it doesn't generalize. Compare this to sycophancy, where the probe generalizes cleanly at 95%+ accuracy. The signal structure is fundamentally different.

**La finding más profunda:** El problema no es el timing de la medida. Es que la alucinación no es una característica monolítica. La sycophancy tiene una dirección en el espacio de activación ("agree with user"). Hallucination es al menos tres diferentes mechanisms:

1. **Misconception** ("watermelon seeds are poisonous"): the model has learned a false fact

2. **Stale knowledge** ("the current president is X"): the model's training data is outdated

3. **Grounding failure**: the model generates a plausible continuation that happens to be wrong

A single linear probe can't separate what isn't a single signal. This shifts the research question from "wrong timing" to "wrong abstraction level." Per-error-type probes on curated subsets (misconception-only, grounding-failure-only) are the next step. That's a different experiment.

**Code:** [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)

---

## What I Left Out

**Por qué la investigación de SAE se inclina por déficult a la medida en tiempo de codificación.** Las activaciones en tiempo de codificación son sin estado y deterministas. Las activaciones en tiempo de generación dependen de la historia completa de la secuencia y son estocásticas según temperatura y muestreo. La matemática es más clara en tiempo de codificación. Pero una matemática limpia sobre el problema equivocado produce resultados limpios pero inútiles.

**Circuitos conductuales más allá de SAEs.** Las autoencoders dispersas son una lente. La intervención causal (ablation) es otra. El análisis de patrones de atención es una tercera. Cada sustrato revela diferentes comportamientos. Una visión completa requiere múltiples métodos de medida a través de múltiples fases. Esta publicación solo cubre SAE + tiempo de codificación.

**Por qué la alucinación es difícil y la sycophancy es fácil.** Esto conecta con la pregunta más amplia de si la alineación del modelo es manejable mediante el direccionamiento conductual o si requiere cambios arquitecturales. Si todos los comportamientos problemáticos se concentran en fases de generación y son invisibles a la medida en tiempo de codificación, entonces toda la agenda de interpretabilidad de capa de codificación podría estar pasando por alto los modos reales de falla. Esto merece su propio post.

---

*Christian Pojoni construye herramientas de IA e interpretabilidad. More at vasudev.xyz.*