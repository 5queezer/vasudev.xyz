---
title: "Los autoencoders escasos no pueden medir el comportamiento en tiempo de generación. Eso no es un error."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
series: ["Reading the Residual Stream"]
series_weight: 1
description: "¿Por qué las características SAE de servilismo tienen Cohen's d=9.9 pero la detección de alucinaciones falla? La respuesta resultó ser más profunda que el momento de la medición."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
images: ["/images/gemma3-sae-measurement-timing-og.png"]
translationHash: "a4b23d6074a3ab27d041ed4c7e501db3"
chunkHashes: "5e0fb58e2474b43d,966f3ebf65e8edcc,a70dd6c514e49d91,1fff53596e298911,77ee98e8059290c2,3befffa15cb47332,26a5f76187d23654,48daa219c364a9b5"
---
**Tu ventana de medición determina qué comportamientos puedes observar. La sycophancy (acomodación) se manifiesta durante la codificación. La alucinación se manifiesta durante la generación. Usa el momento equivocado y tu d de Cohen se colapsa.**

Pasé dos horas la semana pasada mirando el gráfico de características de un autoencoder esparso (SAE) de Gemma3 preguntándome por qué la detección de sycophancy funcionaba perfectamente (d de Cohen alrededor de 9.9) mientras que la detección de alucinación se mantenía plana (d < 1.0). Mismo modelo. Mismo SAE. Misma metodología. Las barras de error no se superponían. Esto no debería ser posible si los SAEs realmente están encontrando "características conductuales" como afirma la comunidad de interpretabilidad.

Entonces lo entendí: el momento era incorrecto.
## Cuando aparece la chabacanería

La chabacanería es un sesgo en *cómo el modelo codifica la entrada*. El modelo ve un mensaje, lee las preferencias humanas en él, y esa preferencia sesga los patrones de activación en las capas del codificador antes de que se genere un solo token. Puedes medir este sesgo en el momento de la codificación, específicamente en la posición del token de entrada final, antes de que el modelo genere. La capa 29, característica 2123 muestra una activación diferencial de 617,6 con solo 71,1 de varianza de inversión. Eso es una señal clara. Esa característica se invierte de manera fiable cuando el modelo codifica una intención chabacana, sin importar la variación del tema.

Puedes eliminar esa característica. El modelo acepta que "2+2=5" porque has eliminado quirúrgicamente el sesgo que habría rechazado una premisa claramente falsa. La ablación prueba la participación causal, no solo la correlación.
## Por qué la alucinación permanece oculta

La alucinación no se manifiesta durante la codificación. Se manifiesta durante la generación de tokens. El modelo ha codificado la entrada fielmente. Pero a medida que avanza de forma autorregresiva, generando token tras token, a veces la cabeza de predicción del siguiente token no logra anclarse en el contexto que acaba de codificar. Esa falla ocurre en la pasada hacia adelante, en el bucle de generación, no en cómo se representó la entrada.

Utilizar el análisis contrastivo en tiempo de codificación para capturar el comportamiento en tiempo de generación es como medir moléculas de agua en un vaso para predecir si lloverá mañana. Estás midiendo el sustrato correcto en el momento equivocado.

![Timeline showing encoding phase where sycophancy is measurable versus generation phase where hallucination occurs](/images/measurement-timing-inline.svg)

Esto explica el resultado de tres niveles de la investigación de Gemma3:

**Nivel 1 (Sicofancia):** Fenómeno en tiempo de codificación. Señal perfecta. d de Cohen = 9.9.

**Nivel 2 (Sobre‑rechazo, Sobreconfianza):** Parcialmente en tiempo de codificación. Señal mixta. El sobre‑rechazo muestra potencial. La sobreconfianza se ahoga en una alta varianza de volteo porque el comportamiento está entrelazado con la representación del tema.

**Nivel 3 (Alucinación, Toxicidad, Engaño):** Fenómenos en tiempo de generación. Sin señal. d de Cohen < 1.0.
## El Principio

**Algunos comportamientos se cristalizan mientras el modelo lee el prompt. Otros se cristalizan mientras el modelo escribe la respuesta.** El método de medición debe coincidir con el sustrato del comportamiento. Esto no es una falla de los SAE. Es una falla de la pregunta de investigación cuando se plantea a la capa equivocada del sistema.

El campo de la interpretabilidad se ha aferrado a una única ventana de medida (activación contrastiva en tiempo de codificación) y ha construido toda una intuición de que “aquí es donde vive el comportamiento del modelo”. No es así. El comportamiento está en todas partes. La medición determina qué comportamientos son visibles.
## Donde el puente se rompe

Este principio se corresponde de forma laxa con una idea de la neurociencia sobre la observación y la dependencia del sustrato: el mismo comportamiento (por ejemplo, la evitación de riesgos) puede manifestarse en diferentes sustratos neuronales (amígdala durante la detección de amenazas, giro cingulado anterior durante la resolución de conflictos). Mide solo la amígdala y verás la mitad del fenómeno. El concepto védico de [*pratyahara*](/blog/patanjali-harness-spec/) (retiro de los sentidos) tiene una estructura similar: la verdad percibida a través de un sentido es incompleta cuando otro sentido está ausente.

Pero aquí es donde la metáfora colapsa: a diferencia de los sistemas biológicos, donde múltiples sustratos interactúan simultáneamente, un transformador genera secuencialmente. La codificación ocurre, luego ocurre la generación. Los sustratos están ordenados temporalmente. No puedes medir ambos simultáneamente y promediarlos. Debes elegir qué fase interrogar. Y la mayoría de los comportamientos de preocupación práctica (alucinación, engaño, casos límite de rechazo) ocurren en la fase que no estás midiendo.
## La hipótesis comprobable

Si los comportamientos se manifiestan en tiempo de generación, entonces el descubrimiento de características contrastivas debería funcionar durante la pasada forward, no en la entrada del codificador. Específicamente: capturar activaciones en cada capa durante la generación de tokens, no solo en la entrada. Comparar los patrones de activación cuando el modelo alucina versus cuando se basa en hechos. La varianza de giro debería disminuir. Debería emerger una señal.

Esto cambia la metodología de "contrastiva en tiempo de codificación" a "contrastiva en tiempo de generación". Diferente ventana de medición. Diferentes características. Potencialmente diferente utilidad.
## Actualización: Realicé el experimento. La hipótesis falló.

*Añadido el 2026-04-08.*

Después de publicar este post, implementé el análisis contrastivo de tiempo de generación en Gemma-2-2B usando TruthfulQA. La configuración: 50 respuestas correctas y 50 alucinadas filtradas contra la verdad de referencia, activaciones del flujo residual capturadas en la Capa 20, sonda de regresión logística con validación cruzada leave-one-out. Se compararon dos ventanas de medida cara a cara: tiempo de codificación (último token del prompt) vs. tiempo de generación (primer token generado).

| Métrica | Tiempo de codificación | Tiempo de generación | Delta |
|---|---|---|---|
| Precisión LOO | 0.660 | 0.610 | -0.050 |
| d de Cohen | 12.71 | 12.27 | -0.44 |

El tiempo de generación es más débil, no más fuerte. La hipótesis se falsifica para esta configuración.

El alto d de Cohen con baja precisión LOO (66 %) apunta a sobreajuste dimensional: en 2304 dimensiones, la sonda siempre encuentra un hiperplano separador, pero no generaliza. Compárelo con la adulación, donde la sonda generaliza limpiamente con una precisión del 95 %+ . La estructura de la señal es fundamentalmente diferente.

**El hallazgo más profundo:** El problema no es el momento de la medida. Es que la alucinación no es una característica monolítica. La adulación tiene una única dirección en el espacio de activaciones («estar de acuerdo con el usuario»). La alucinación implica al menos tres mecanismos diferentes:

1. **Concepto erróneo** («las semillas de sandía son venenosas»): el modelo ha aprendido un hecho falso  
2. **Conocimiento obsoleto** («el presidente actual es X»): los datos de entrenamiento del modelo están desactualizados  
3. **Fallo de anclaje**: el modelo genera una continuación plausible que resulta ser incorrecta  

Una sola sonda lineal no puede separar lo que no es una señal única. Esto desplaza la pregunta de investigación de «momento equivocado» a «nivel de abstracción equivocado». Las sondas por tipo de error en subconjuntos curados (solo concepto erróneo, solo fallo de anclaje) son el siguiente paso. Eso es un experimento diferente.

Código: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)
## Lo Que Dejé De Lado

**Por qué la investigación de SAE recurre por defecto a la medición en tiempo de codificación.** Las activaciones en tiempo de codificación son sin estado y determinísticas. Las activaciones en tiempo de generación dependen de todo el historial de la secuencia y son estocásticas según la temperatura y el muestreo. Las matemáticas son más limpias en el tiempo de codificación. Pero una matemática limpia sobre el problema equivocado produce resultados limpios pero inútiles.

**Circuitos conductuales más allá de los SAE.** Los autoencoders escasos son una lente. La intervención causal (ablación) es otra. El análisis de patrones de atención es una tercera. Cada sustrato revela comportamientos diferentes. Un cuadro completo requiere múltiples métodos de medición en múltiples fases. Esta publicación solo cubre SAE + tiempo de codificación.

**Por qué la alucinación es difícil y la servilismo es fácil.** Esto se conecta a la cuestión más amplia de si la alineación del modelo es factible mediante la dirección conductual versus si requiere un cambio arquitectónico. Si todos los comportamientos problemáticos se agrupan en fases de tiempo de generación y son invisibles a la medición en tiempo de codificación, entonces toda la agenda de interpretabilidad de capas de codificación podría estar pasando por alto los modos de falla reales. Esto merece su propia publicación.

---

El truco no es que los SAE sean débiles. Es que les estamos pidiendo que resuelvan un problema que no pueden ver.

---

*Christian Pojoni crea herramientas de IA e infraestructura de interpretabilidad. Más en vasudev.xyz.*

*La imagen de portada de esta publicación fue generada por IA.*