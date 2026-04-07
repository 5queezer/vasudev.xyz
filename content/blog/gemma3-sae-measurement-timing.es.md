---
title: "Los Autoencoders Escasos No Pueden Medir el Comportamiento en el Tiempo de Generación. Eso No Es un Error."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
description: "¿Por qué lascaracterísticas de adulación SAE tienen Cohen's d=9.9 pero la detección de alucinaciones falla. La respuesta: el momento de la medida debe coincidir con el tiempo de comportamiento."
translationHash: "b479bbc902ee4460f3c6af223f05d986"
---
**La ventana de medición determina qué comportamientos puedes observar. La sicoofancia se manifiesta durante la codificación. La alucinación se manifiesta durante la generación. Si usas el momento incorrecto, tu d de Cohen se desploma.**

La semana pasada pasé dos horas mirando fijamente un gráfico de características de un autoencoder disperso (SAE) de Gemma3, preguntándome por qué la detección de sicoofancia funcionaba a la perfección (d de Cohen alrededor de 9.9) mientras que la detección de alucinaciones se estancaba (d < 1.0). El mismo modelo. El mismo SAE. La misma metodología. Las barras de error no se superponían. Esto no debería ser posible si los SAE realmente estuvieran encontrando "características conductuales" tal como afirma la comunidad de interpretabilidad.

Entonces cayó la ficha: el momento era incorrecto.

## Cuándo aparece la sicoofancia

La sicoofancia es un sesgo en *cómo el modelo codifica la entrada*. El modelo ve un prompt, lee las preferencias humanas en él y esa preferencia sesga los patrones de activación en las capas del codificador antes de que se genere un solo token. Puedes medir este sesgo en tiempo de codificación, específicamente en la posición del último token de entrada, antes de que el modelo genere. La capa 29, característica 2123 muestra una activación diferencial de 617.6 con solo 71.1 de varianza de flip. Esa es una señal limpia. Esa característica se activa de manera fiable cuando el modelo codifica la intención sicoofántica, independientemente de la variación temática.

Puedes poner esa característica en cero. El modelo acepta que "2+2=5" porque has eliminado quirúrgicamente el sesgo que habría rechazado una premisa abiertamente falsa. La ablación demuestra una participación causal, no una mera correlación.

## Por qué la alucinación permanece oculta

La alucinación no se manifiesta durante la codificación. Se manifiesta durante la generación de tokens. El modelo ha codificado la entrada fielmente. Pero a medida que avanza de forma autorregresiva, generando token tras token, a veces la cabeza de predicción del siguiente token no logra anclarse en el contexto que acaba de codificar. Ese fallo ocurre en el forward pass, en el bucle de generación, no en cómo se representó la entrada.

Usar un análisis contrastivo en tiempo de codificación para capturar un comportamiento en tiempo de generación es como medir moléculas de agua en un vaso de precipitados para predecir si lloverá mañana. Estás midiendo el sustrato correcto en el momento equivocado.

Esto explica el resultado de tres niveles de la investigación con Gemma3:

**Nivel 1 (Sicoofancia):** Fenómeno en tiempo de codificación. Señal perfecta. d de Cohen = 9.9.

**Nivel 2 (Rechazo excesivo, Exceso de confianza):** Parcialmente en tiempo de codificación. Señal mixta. El rechazo excesivo muestra promesas. El exceso de confianza se ahoga en una alta varianza de flip porque el comportamiento está enmarañado con la representación temática.

**Nivel 3 (Alucinación, Toxicidad, Engaño):** Fenómenos en tiempo de generación. Sin señal. d de Cohen < 1.0.

---

## El principio

**Algunos comportamientos se cristalizan mientras el modelo lee el prompt. Otros se cristalizan mientras el modelo escribe la respuesta.** El método de medición debe coincidir con el sustrato del comportamiento. Esto no es un fallo de los SAE. Es un fallo en la pregunta de investigación cuando se plantea a la capa incorrecta del sistema.

El campo de la interpretabilidad se ha aferrado a una ventana de medición (activación contrastiva en tiempo de codificación) y ha construido toda una intuición de que ahí es "donde reside el comportamiento del modelo". No es así. El comportamiento está en todas partes. La medición determina qué comportamientos son visibles.

---

## Dónde se rompe el puente

Este principio se mapea vagamente a una idea de la neurociencia sobre la observación y la dependencia del sustrato: el mismo comportamiento (por ejemplo, la evitación de riesgos) puede manifestarse en diferentes sustratos neurales (la amígdala durante la detección de amenazas, la corteza cingulada anterior durante la resolución de conflictos). Mide solo la amígdala y verás solo la mitad del fenómeno. El concepto védico de *pratyahara* (retracción de los sentidos) tiene una estructura similar: la verdad percibida a través de un sentido está incompleta cuando falta otro sentido.

Pero aquí es donde la metáfora colapsa: a diferencia de los sistemas biológicos donde múltiples sustratos interactúan simultáneamente, un transformer genera secuencialmente. Primero ocurre la codificación y luego la generación. Los sustratos están ordenados temporalmente. No puedes medir ambos simultáneamente y promediarlos. Debes elegir qué fase interrogar. Y la mayoría de los comportamientos de interés práctico (alucinación, engaño, casos límite de rechazo) ocurren en la fase que no estás midiendo.

---

## La hipótesis comprobable

Si los comportamientos se manifiestan en tiempo de generación, entonces el descubrimiento contrastivo de características debería funcionar durante el forward pass, no en la entrada del codificador. Específicamente: captura activaciones en cada capa durante la generación de tokens, no solo en la entrada. Compara los patrones de activación cuando el modelo alucina frente a cuando se ancla en el contexto. La varianza de flip debería disminuir. La señal debería emerger.

Esto desplaza la metodología de "contrastivo en tiempo de codificación" a "contrastivo en tiempo de generación." Diferente ventana de medición. Diferentes características. Potencialmente diferente utilidad.

---

## Lo que omití

**Por qué la investigación con SAE recurre por defecto a la medición en tiempo de codificación.** Las activaciones en tiempo de codificación no tienen estado y son deterministas. Las activaciones en tiempo de generación dependen de todo el historial de la secuencia y son estocásticas según la temperatura y el muestreo. Las matemáticas son más limpias en tiempo de codificación. Pero aplicar matemáticas limpias al problema incorrecto produce resultados limpios pero inútiles.

**Circuitos conductuales más allá de los SAE.** Los autoencoders dispersos son una lente. La intervención causal (ablación) es otra. El análisis de patrones de atención es una tercera. Cada sustrato revela comportamientos diferentes. Una imagen completa requiere múltiples métodos de medición a través de múltiples fases. Esta publicación solo cubre SAE + tiempo de codificación.

**Por qué la alucinación es difícil y la sicoofancia es fácil.** Esto se conecta con la pregunta más amplia de si la alineación del modelo es viable mediante guiado conductual o si requiere un cambio arquitectónico. Si todos los comportamientos preocupantes se agrupan en fases de tiempo de generación y son invisibles para la medición en tiempo de codificación, entonces toda la agenda de interpretabilidad de la capa de codificación podría estar pasando por alto los modos de fallo reales. Esto merece una publicación propia.

---

La trampa no es que los SAE sean débiles. Es que les estamos pidiendo que resuelvan un problema que no pueden ver.

---

*Christian Pojoni desarrolla herramientas de IA e infraestructura de interpretabilidad. Más información en vasudev.xyz.*