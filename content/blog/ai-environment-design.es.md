---
title: "Deja de diseñar tu sistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "interpretability", "llm"]
series: ["Building Agents That Sleep"]
series_weight: 6
description: "La IA autoevolutiva falla cuando optimiza un evaluador fijo. El modelo biológico es correcto: lo que debe evolucionar es la presión de selección, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
translationHash: "2f5a8bf02a2b63e2cf15d09ded86d65a"
chunkHashes: "8402b112ebff21c5,f75cd0c5f987c056,16ff48cc1008e801,ea0de01ec9fe3288,e25ca86ec3da9258,46b3940c189647a6"
---
Pasé una semana intentando diseñar un "lenguaje de programación nativo de vectores para LLMs". La idea era programar el comportamiento del modelo directamente a nivel de activación, sin prompts, solo vectores de intervención. Fue intelectualmente satisfactorio y prácticamente incorrecto. Lo que realmente quería no era un lenguaje. Era un organismo.

**La unidad de evolución no es la característica. Es el ciclo mutación/selección.**

Esa distinción lo cambia todo sobre cómo construyes un arnés de IA autoevolutivo. La mayoría de los sistemas que se autodenominan "auto‑mejorables" están haciendo AutoML. Optimiza dentro de un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca de AutoML que de la evolución abierta. La diferencia resulta ser decisiva arquitectónicamente en dos formas.

---
## Genotipo y Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que es seleccionado. El genoma no se prueba directamente. El fenotipo sí. Las mutaciones ocurren al genoma. La selección ocurre al fenotipo. El genoma sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente de la propia evolutividad.

Un arnés de IA tiene una estructura análoga si lo construyes correctamente, no como una equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: pesos de adaptadores, políticas de recuperación, configuraciones de herramientas, reglas de dirección de activación, parches de código. El fenotipo es el comportamiento observable en las tareas. El evaluador ve el comportamiento, no los internos. Las mutaciones se dirigen al genoma. La selección se dirige al fenotipo.

Muchos diseños de agentes auto‑mejorantes colapsan esta distinción, al menos implícitamente. Miden el comportamiento y luego editan directamente lo que midieron. Eso es como evolucionar organismos editando sus fenotipos. No se generaliza porque estás arreglando el síntoma, no la causa.

La arquitectura correcta separa estas capas explícitamente:

El **nivel de persistencia** almacena lo que sobrevive: adaptadores (a largo plazo), políticas de recuperación y de herramientas (a medio plazo), reglas de dirección de activación (efímeras). Los **generadores de mutación** proponen cambios al nivel de persistencia, no al comportamiento directamente. El **evaluador** solo observa el comportamiento y controla qué mutaciones sobreviven. Nada en el nivel de persistencia se actualiza exceptuando a través de esta puerta.
## El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico rompe con el pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. La minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de esas cosas. Es el entorno, y el entorno no lo diseñas tú. Es lo que mata a aquello que no puede manejarlo.

Cuando diseñas manualmente una batería de tareas para tu arnés auto‑evolutivo y nunca la cambias, no has construido un entorno. Has construido una función de pérdida con pasos extra. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no detecta. Esto es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida. Lo medí directamente en [MuninnDB's consolidation metrics](/blog/memory-metrics-lying-how-to-ground-them/): los números del panel mejoraron mientras que la calidad de recuperación se degradó.

Un evaluador fijo eventualmente se convierte en un techo. Para mantener una mejora robusta, el entorno de evaluación debe expandirse, diversificarse o adaptarse adversarialmente. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para atrapar juegos superficiales. Necesita tareas de capacidad (¿puede hacer la cosa?), tareas de calibración (¿sabe cuándo no puede?), y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos una ruta de evaluación con un humano en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles son manipulados.

Prácticamente, esto significa: comienza con una pequeña batería fija, pero construye la infraestructura para ampliarla desde el principio. Cada mutación que el sistema retenga debería generar un caso de prueba que habría detectado una falla de esa mutación. Con el tiempo, la batería crece con el sistema. Esa es la co‑evolución en su forma mínima viable.
## SAE Steering es un Operador, No la Fundación

Los auto‑encoders escasos pueden exponer características latentes escasas, muchas de las cuales son lo suficientemente interpretables como para dirigir el comportamiento localmente, aunque la calidad de las características y la especificidad causal siguen siendo preguntas activas de investigación. Puedes dirigir un modelo hacia o lejos de un concepto añadiendo o suprimiendo un vector de características en una capa específica durante el paso forward. Esto es rápido, reversible y no requiere re‑entrenamiento.

Pero es una clase de operador dentro de un espacio de acción mixto. Los generadores de mutaciones en un arnés serio deberían producir propuestas a través de al menos cuatro sustratos. El primer sustrato son las transformaciones de prompt y recuperación: baratas, reversibles, siempre el punto de partida. El segundo son las reglas de dirección de activación: rápidas, locales, compromiso de nivel medio. El tercero son las actualizaciones de adaptadores y LoRA: más pesadas, requieren entrenamiento, persistencia a medio plazo. El cuarto son las ediciones de código y de políticas: mayor compromiso, más difíciles de revertir.

Comenzar solo con SAE steering es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes una adaptación local rápida y un comportamiento global frágil. El sistema necesita poder modificar cómo recupera contexto, cómo enruta herramientas y, eventualmente, cómo procesa la información a nivel de pesos, no porque esos sean operadores más poderosos, sino porque diferentes problemas residen en diferentes sustratos.

La disciplina correcta es: una intervención de bajo costo exitosa debería volver a expresarse en un sustrato más barato o más estable cuando sea posible, como una transformación de prompt, una regla de recuperación o una actualización de adaptador, siempre que el efecto causal sobreviva a la traducción. Esto no es solo una regla para la seguridad. Es una regla para la evolutividad: el sistema debería resistir mutaciones costosas hasta que las baratas hayan encontrado el vecindario adecuado.
## Qué es Realmente un Bucle Mínimo Viable

El bucle tiene seis etapas. Observar. Proponer. Sandbox. Evaluar. Conservar al ganador (o rechazar todos los candidatos). Actualizar el prior de búsqueda.

![Six-stage mutation/selection cycle: Observe, Propose, Sandbox, Evaluate, Retain/Reject, Update prior](/images/evolution-loop-inline.svg)

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genere mutaciones candidatas, una por clase de operador, en paralelo. Sandbox significa que cada candidato se ejecute en aislamiento: sin estado compartido, límites duros de recursos, garantía de reversión. Evaluar significa puntuar el delta de comportamiento respecto a la línea base actual. Conservar significa escribir al ganador en la capa de persistencia con plena procedencia: métricas antes/después, qué prompts afectó, qué clase de operador utilizó y la política de expiración y revalidación. Actualizar el prior de búsqueda significa que la política bandido o evolutiva aprenda qué clases de operadores y qué regiones del espacio de búsqueda están produciendo sobrevivientes.

Cada mutación conservada necesita un manejador de reversión. No como una característica de seguridad. Como un requisito de diseño. Si no puedes revertir una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.
## Lo que omití

**Auto-modificación de código.** La autoedición al estilo Máquina de Darwin‑Gödel funciona en entornos de agente‑código aislados con verificadores formales. Para un arnés general sin esas restricciones, es una preocupación de la Fase 4, no porque sea imposible, sino porque la infraestructura prerequisito (evaluador estable, garantías de reversión, alcance de tarea estrecho) debe estar en su lugar primero.

**Universalidad de características.** Las características SAE son específicas del modelo y a veces del punto de control. Si las características útiles se transfieren entre versiones de modelo es una cuestión de investigación abierta. El arnés debe diseñarse para volver a extraer los diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Evaluadores multi‑agente.** Usar un modelo juez como parte del bucle de evaluación agrega robustez pero también crea una superficie adversarial. El sistema puede aprender a complacer al juez en lugar de la tarea subyacente. Esto requiere contramedidas explícitas que aún no he diseñado.

**Presupuesto de cómputo.** Una mutación que mejora la capacidad en un 2 % pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primera clase en el evaluador, no consideraciones posteriores.

---

La conexión con [Hrafn](https://github.com/5queezer/hrafn) es directa. MuninnDB es la capa de persistencia. El Motor de Sueño, modelado sobre la consolidación de la memoria en fases de sueño, es el mecanismo que promueve observaciones efímeras a política de medio plazo. Las piezas faltantes son la política de búsqueda y el evaluador co‑evolutivo. Eso es lo que se construirá a continuación.

Si estás trabajando en este espacio, el paradigma que más vale la pena tomar prestado no proviene del ML. Proviene de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Empieza con [Hrafn](https://github.com/5queezer/hrafn) y la capa de persistencia [MuninnDB](https://github.com/5queezer/hrafn). La separación genoma/fenotipo ya está cableada. Lo que necesita construirse es el evaluador que co‑evoluciona con el sistema que mide.

---

*Christian Pojoni construye infraestructura de agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un runtime de agente basado en Rust.*

*La imagen de portada de este post fue generada por IA.*