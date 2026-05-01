---
title: "Capital-of no es una sola característica SAE. Así que construí un bucle de mutación para averiguar qué es."
date: 2026-04-11
tags: ["ai", "interpretability", "llm", "sparse-autoencoders"]
agentQuestions:
  - "¿Por qué capital-of no es una única característica SAE?"
  - "¿Cómo encontró el bucle de mutación mejores señales?"
  - "¿Por qué la tokenización era el cuello de botella?"
series: ["Reading the Residual Stream"]
series_weight: 2
description: "Las características de SAE no pueden aislar relaciones en Gemma-2-2B. Construí un bucle de mutación‑selección que sí puede. El cuello de botella era la tokenización."
images: ["/images/automated-circuit-discovery-og.png"]
translationHash: "5333903ece9522e2172766ff161ef3d8"
chunkHashes: "e3de2da89c8de2aa,f39cf8e32af55775,ceab65a020ad92a8,1863605bd2bf822e,932bae736aec5b7a,bba780aaa1eb7651,1fe6140b8907b4a9,50b9a30dd609d40d,c6630f0bbd8ab69d,795fd1b65da9626c,2fd2687fbe575b06"
---
**El cuello de botella en la interpretabilidad automatizada no son los sondas, no son los SAE, no es la capacidad de cómputo. Es la tokenización.**

Element‑symbol tiene una puntuación de ablación diferencial de -16.72 en Gemma-2-2B. Esa es la señal causal más fuerte que he encontrado en el flujo residual del modelo, y la descubrí manualmente. La pregunta que impulsó todo lo que sigue: ¿puede una máquina encontrar señales como esta por sí misma?

La respuesta es sí. Requirió 42 propuestas fallidas, un bucle de retroalimentación que enseña a un LLM lo que hace el tokenizador de otro modelo, y la constatación de que la parte más difícil de la interpretabilidad automatizada no tiene nada que ver con la interpretabilidad.
## Capital-of No Existe como una Única Característica

Realicé seis experimentos en dos anchos de SAE (16k y 65k) en Gemma-2-2B buscando una característica "capital-of". Más de 300 características candidatas. Capa 12, capa 20. Indicaciones de entidad única, indicaciones de múltiples entidades. Contrastes estrictos del mismo marco, contrastes sueltos. La mejor candidata, característica 14610 ("referencias a países específicos y sus roles en varios contextos"), superó la puntuación de múltiples entidades en cuatro países y mostró tanto causalidad de dirección como de ablación.

Luego entrené un sondeo lineal y lo proyecté a todas las 16 384 direcciones del decodificador SAE. La característica 14610 se ubicó en el cuatro milésimo en alineación con la dirección real de capital-of. Fue una pista falsa. La característica que más se correlacionó con capital-of, característica 4314 ("iglesias, obispos, ubicaciones geográficas"), tenía una similitud coseno de 0,34. Eso equivale a un ángulo de aproximadamente 30 grados respecto a la dirección real. Una limitación diferente del [problema de sincronización de medición](/blog/gemma3-sae-measurement-timing/), pero igualmente fundamental.

La relación capital-of está distribuida en aproximadamente cinco características SAE. Cada una codifica un aspecto: centros políticos, entidades geográficas, documentos formales, condiciones socioeconómicas. Ninguna es suficiente. Juntas definen el concepto.

Un sondeo de regresión logística lo detecta instantáneamente. Corriente residual de la capa 20, posición del último token, 12 indicaciones de capital-of frente a 12 indicaciones de otros atributos de países. Precisión leave-one-out: 100 %, 24 de 24. Ablar la dirección del sondeo hace que las indicaciones de capital pierdan 3,56 logits en promedio. Otras indicaciones de atributos de países pierden 0,87. El sondeo es cuatro veces más selectivo que cualquier característica SAE.

Los sondeos funcionan. Pero las direcciones de sondeo requieren conjuntos de indicaciones etiquetadas. Alguien tiene que diseñar manualmente las clases positivas y negativas: mismo marco sintáctico, relación distinta, objetivos de un solo token, entidades diversas. Para capital-of, eso lleva unas pocas horas. Para el descubrimiento sistemático en dominios desconocidos, es un callejón sin salida.
## El Bucle de Mutación-Selección

La arquitectura es mínima. Un LLM propone una nueva relación: una etiqueta, ocho prompts positivos con completaciones esperadas de un solo token, ocho prompts negativos con completaciones esperadas. La canalización extrae activaciones del flujo residual en la capa 20, entrena una sonda logística con validación cruzada leave‑one‑out, luego abla la dirección de la sonda y mide el impacto diferencial en los prompts positivos versus los negativos. Si la ablación perjudica a los prompts positivos significativamente más que a los negativos (o viceversa) y la precisión LOO supera 0,8, la relación es SELECTIVA. Se archiva y el bucle continúa.

El operador de mutación recibe un resumen estructurado de todo lo probado hasta ahora: qué relaciones fueron selectivas (con puntuaciones), cuáles no (con razones diagnósticas) y cuáles estaban limitadas por margen antes de la sonda. Esta es la presión de selección. El LLM explora libremente, limitado solo por lo que la canalización puede evaluar.

![Diagrama de flujo: Proponente LLM → Conjunto de Prompts → Puerta Tokenizer → Canalización de Sonda → Archivo, con bucles de corrección y retroalimentación](/images/mutation-loop-inline.svg)

Esto es una búsqueda evolutiva de alcance abierto. El genoma es el conjunto de prompts. El fenotipo es el resultado de la sonda. El evaluador es la ablación diferencial. El archivo es la memoria de la población. No hay un objetivo fijo ni un gradiente. El [entorno hace la selección](/blog/ai-environment-design/), no el diseñador.
## Where It Broke: Zero Out of Fifteen

La primera generación produjo cero propuestas utilizables. Quince intentos, cero relaciones pasaron la validación.

Emergieron tres modos de falla. Espacios de respuesta colapsados: “composer-instrument” asignó a cinco de ocho compositores “ piano”. Cuando el 62 % de los objetivos positivos son idénticos, el margen dentro de la clase es cero y la prueba no tiene nada que separar. Conceptos duplicados: el LLM siguió proponiendo “composer-instrument” bajo etiquetas ligeramente distintas, chocando con la puerta de deduplicación. Pero la falla dominante fue la tokenización. El LLM propuso “ 3.14” (cinco tokens en Gemma), “ Salinger” (dos tokens), “ Impressionism” (dos tokens). Cada intento de validación murió en la puerta de un solo token.
## Ningún LLM Sabe Qué es un Token

Probé cuatro modelos como operadores de mutación.

| Modelo | Cumplimiento JSON | Precisión de token | Propuestas aprobadas |
|-------|-------------------|--------------------|----------------------|
| llama-3.3-70b (OpenRouter) | ~90 % | ~70 % | mejor disponible |
| Claude Sonnet 4.6 (OpenRouter) | ~60 % | ~30 % | 0/15 |
| Qwen3 14B (Ollama) | ~50 % | ~40 % | 0/15 |
| Qwen2.5 14B (Ollama) | ~80 % | ~30 % | 0/15 |

Sonnet 4.6 piensa en voz alta antes de generar JSON a pesar de “Return ONLY valid JSON” en el prompt del sistema. Qwen3 genera etiquetas `
## La Solución: Retroalimentación, No Instrucciones

Ninguna cantidad de ingeniería de *system prompt* le enseña a un LLM lo que hace el tokenizador de Gemma. Lo intenté. Más ejemplos, listas explícitas de "INSEGURAS", mayúsculas, amenaza de ser apagado. La tasa de aprobación se mantuvo en cero.

La solución fue dejar de intentar enseñar y empezar a corregir. En lugar de rechazar de inmediato las propuestas con objetivos de varios tokens, la canalización ahora recopila todos los objetivos que fallan y los devuelve: “Estos objetivos NO son tokens únicos en Gemma-2-2B: ' 3.14' (5 tokens), ' Salinger' (2 tokens). Reemplácelos por objetivos que sean EXACTAMENTE 1 token. Seguro: ' cat', ' A', ' Paris'. Inseguro: decimales, nombres largos, palabras compuestas. Devuelva el JSON corregido.”

El LLM tiene hasta tres rondas de corrección por propuesta. Los errores estructurales (JSON mal formado, claves faltantes, etiquetas duplicadas) siguen siendo rechazados inmediatamente. Solo los fallos de token y de diversidad reciben reintentos con retroalimentación.

Tasa de aprobación de propuestas: 0 de 15 sin retroalimentación. 3 de 5 con retroalimentación.
## author-nationality: El Primer Circuito Encontrado por la Máquina

El operador de mutación propuso la relación `author-nationality` después de una ronda de corrección. Inicialmente ofreció ` Dystopian` y ` Satire` como objetivos, ambos de dos tokens en Gemma. Tras la corrección produjo conjuntos de indicaciones válidos: `"The nationality of author Jane Austen is"` asignado a ` British`, `"The nationality of author Haruki Murakami is"` asignado a ` Japanese`, frente a `"The literary genre of author Jane Austen is"` asignado a ` Romance` y similares.

Resultado de la canalización: precisión LOO 1.000. Puntaje diferencial +1.02. Veredicto: SELECTIVE.

Esto no es tan fuerte como element-symbol (diff=-16.72). Pero es una relación que ningún humano propuso. La máquina la encontró, la validó y la archivó sin intervención manual.
## The Baldwin Effect, Accidentally

The feedback loop has an evolutionary analog I did not plan for. Within a single proposal, the LLM "learns" which tokens work by receiving corrections in its conversation context. That learning persists across retries. But when the next proposal starts, the conversation resets. The learning is ephemeral.

In evolutionary biology, this is the [Baldwin effect](https://es.wikipedia.org/wiki/Efecto_Baldwin): organisms that learn during their lifetime gain a survival advantage, and over evolutionary time, the learned behaviors become genetically encoded. The feedback loop is Lamarckian within a generation (direct correction propagates) but Darwinian across generations (each new proposal starts fresh, informed only by the archive summary).

The codebase already tracks "Baldwin markers" for stable probe directions that replicate across runs. This feature was implemented for a practical reason: identifying which probes are robust enough to trust. But it maps exactly onto the biological concept. If a relation keeps getting proposed and keeps testing as selective across independent runs, it is a candidate for promotion to the seed set. Learned behavior becomes part of the genome.
## Donde la Metáfora se Rompe

Los operadores de mutación biológica trabajan sobre el mismo sustrato que modifican. La ADN polimerasa lee y escribe ADN. Las transposasas recortan y pegan dentro del mismo genoma. No hay una capa de traducción entre el mutador y el genoma.

En este sistema, el mutador LLM opera sobre lenguaje natural mientras que el modelo objetivo opera sobre tokens BPE. El operador de mutación no puede ver el paisaje de aptitud que explora porque no comparte el aparato perceptivo del objetivo. El bucle de retroalimentación compensa (“esa forma no encaja”), pero está fundamentalmente limitado por el ancho de banda del canal de corrección. Un mutador biológico no necesita que le indiquen que ATGC es el alfabeto válido. Este LLM necesita que se le indique, tres veces por propuesta, que " Impressionism" son dos tokens.
## La hipótesis comprobable

Si el cuello de botella es la ceguera del tokenizador y la solución es la retroalimentación, entonces mantener la retroalimentación debería eliminar el cuello de botella. Concretamente: pre‑calcular una tabla de completaciones válidas de un solo token para categorías de respuesta comunes (nombres de países, símbolos químicos, instrumentos musicales, números) usando el tokenizador real de Gemma, e inyectar esta tabla en el prompt del sistema.

La predicción: con un vocabulario de tokens pre‑calculado, la tasa de aprobación de propuestas debería aumentar de 3/5 a más de 4/5, y el modo de falla dominante debería pasar de la tokenización a la puerta de margen (si Gemma predice con confianza el token objetivo esperado). Si el cuello de botella no cambia, la tabla de tokens no es la solución real y el problema es más profundo que un desajuste de vocabulario.
## Lo que omití

La puerta de margen es ahora el principal cuello de botella. Tres de cinco propuestas pasaron la validación pero solo una pasó la puerta de margen, que requiere que la predicción top‑1 del modelo coincida con el objetivo esperado con un margen de logit suficiente. Relaciones como "bird‑habitat" y "painter‑style" tienen objetivos difusos donde Gemma no predice fuertemente ningún token siguiente único. Enseñar al operador de mutación a proponer relaciones donde el modelo tenga alta confianza es el siguiente problema.

El direccionamiento no funciona para direcciones de sondeo relacionales. Cada dirección en el archivo muestra una fuerte ablación pero cero o negativo direccionamiento. Añadir más de la dirección capital‑de empeora las predicciones a cualquier multiplicador, probado hasta 200×. Estas direcciones son señales de enrutamiento. El modelo lee presencia o ausencia, no amplitud. Esto tiene implicaciones para toda la agenda de direccionamiento de activaciones en la investigación de alineación.

La migración a Gemma 4 está bloqueada a la disponibilidad de GemmaScope SAE. El hallazgo de distribución a 30 grados puede o no replicarse en modelos mayores con flujos residuales más anchos. Ese experimento está a la espera de herramientas.

El código está en `discover.py` (bucle de sondeo) y `mutate.py` (operador de mutación). Contacta si deseas acceso al repositorio.

---

*Christian Pojoni crea herramientas automatizadas de interpretabilidad mecánica. Más en vasudev.xyz.*

*La imagen de portada de esta publicación fue generada por IA.*