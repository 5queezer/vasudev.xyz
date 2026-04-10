---
title: "Deja de diseñar tu sistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
series: ["Building Agents That Sleep"]
series_weight: 6
description: "Los sistemas de autoevolución de IA fallan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que debe evolucionar es la presión selectiva, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "3400f4c32720f651e354d54b64fc3e82"
chunkHashes: "5f162ec2b9eb32bc,f75cd0c5f987c056,4699821c947ee4b8,ea0de01ec9fe3288,67074871c33f43bf,46b3940c189647a6"
---
**La unidad deevolución no es la característica. Es el ciclo de mutación/selección.** Esa distinción cambia todo acerca de cómo construyes un marco de IA auto‑evolutivo. La mayoría de los sistemas que se autodenominan "auto‑mejorantes" están haciendo AutoML. Optimizan sobre un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca de AutoML que de la evolución de enfoque abierto. La diferencia resulta ser decisiva arquitectónicamente en dos sentidos.  ---
## Genotipo y Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que...

**La unidad de evolución no es la característica. Es el ciclo de mutación/selección.**

La mayoría de los sistemas que se llaman "auto‑mejoramiento" están haciendo AutoML. Ellos optimizan sobre un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca de AutoML que de la evolución sin límites. La diferencia resulta ser decisiva arquitectónicamente en dos aspectos.
## Genotipo y Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que se selecciona. El genotipo no se prueba directamente. El fenotipo sí. Las mutaciones ocurren en el genotipo. La selección actúa sobre el fenotipo. El genotipo sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente de la evolvabilidad misma.

Una arnés de IA tiene una estructura análoga si se construye correctamente, no como una equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: pesos de adaptadores, políticas de recuperación y herramientas, reglas de dirección de activación, parches del código base. El fenotipo es el comportamiento observable en tareas. El evaluador ve el comportamiento, no los internos. Las mutaciones apuntan al genotipo. La selección apunta al fenotipo.

Muchos diseños de agentes auto‑mejorantes colapsan esta distinción, al menos implícitamente. Miden el comportamiento y luego editan directamente la cosa que midieron. Eso es como evolucionar organismos editando sus fenotipos. No se generaliza porque estás parcheando el síntoma, no la causa.

La arquitectura correcta separa estas capas explícitamente:

El **tier de persistencia** almacena lo que sobrevive: adaptadores (largo plazo), políticas de recuperación y herramientas (mediano plazo), reglas de dirección de activación (efímeras). Los **generadores de mutaciones** proponen cambios en el tier de persistencia, no en el comportamiento directamente. El **evaluador** observa solo el comportamiento y decide qué mutaciones sobreviven. Nada en el tier de persistencia se actualiza excepto a través de esta puerta.
##El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico se separa del pensamiento de aprendizaje automático de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. La minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de estas cosas. Es el entorno, y el entorno no está diseñado por ti. Es lo que elimina lo que no puede manejarlo.

Cuando diseñas a mano un conjunto de tareas para tu arnés autoevolutivo y nunca lo cambias, no has construido un entorno. Has construido una función de pérdida con pasos extra. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no captura. Esto es Goodhart's Law a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se convierte en un techo. Para sustentar una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse adversarialmente. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para atrapar la gaming a nivel superficial. Necesita tareas de capacidad (¿puede hacer la cosa?), tareas de calibración (¿sabe cuándo no puede?), y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos un camino de evaluación con humanos en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles se juegan.

Prácticamente, esto significa: comienza con una batería pequeña y fija, pero construye la infraestructura para extenderla desde el principio. Cada mutación que el sistema retenga debe generar un caso de prueba que habría detectado el fallo de esa mutación. Con el tiempo, la batería crece con el sistema. Eso es co‑evolución en su forma mínima viable.
## Steering de SAE es un Operador, no la Base

Los autoencoders esparcidos pueden exponer características latentes esparcidas, muchas de las cuales son lo suficientemente interpretables como para dirigir el comportamiento localmente, aunque la calidad de la característica y la especificidad causal siguen siendo preguntas de investigación activas. Puedes dirigir un modelo hacia o alejándolo de un concepto agregando o suprimiendo un vector de características en una capa específica durante el paso hacia adelante. Esto es rápido, reversible y no requiere reentrenamiento.

Pero es una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un espejo serio deben producir propuestas a través de al menos cuatro sustratos. El primer sustrato son transformaciones de prompt y recuperación: baratas, reversibles, siempre el punto de partida. El segundo son reglas de dirección de activación: rápidas, locales, compromiso de nivel medio. El tercero son actualizaciones de adaptador y LoRA: más pesadas, requieren entrenamiento, persistencia a medio plazo. El cuarto son ediciones de código y políticas: mayor compromiso, más difíciles de revertir.

Comenzar solo con el steering de SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes una adaptación local rápida y un comportamiento global frágil. El sistema necesita poder modificar cómo recupera el contexto, cómo enruta herramientas y, eventualmente, cómo procesa la información a nivel de peso, no porque esos sean operadores más poderosos, sino porque diferentes problemas viven en diferentes sustratos.

La disciplina correcta es: una intervención de bajo costo exitosa debería reexpresarse en un sustrato más barato o más estable cuando sea posible, como una transformación de prompt, regla de recuperación o actualización de adaptador, siempre que el efecto causal sobreviva a la traducción. Esto no es solo una regla para la seguridad. Es una regla para la evolutividad: el sistema debe resistir mutaciones costosas hasta que las baratas hayan encontrado el vecindario adecuado.
## LoQue Realmente Se Ve Como Un Bucle Mínimo Viable

El bucle tiene seis etapas: Observar. Proponer. Sandbox. Evaluar. Retener al ganador (o rechazar a todos los candidatos). Actualizar la búsqueda previa.

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genere mutaciones candidatas, una por clase de operador, en paralelo. Sandbox significa que cada candidato se ejecute en aislamiento: sin estado compartido, límites de recursos estrictos, rollback garantizado. Evaluar significa puntuar el delta de comportamiento contra la línea base actual. Retener significa escribir al ganador en la capa de persistencia con plena procedencia: métricas antes/después, qué prompts afectó, qué clase de operador usó, y política de expiración y revalidación. Actualizar la búsqueda previa significa que el bandit o la política evolutiva aprendan qué clases de operador y qué regiones del espacio de búsqueda están produciendo sobrevivientes.

Cada mutación retenida necesita un mango de retroceso. No como una característica de seguridad. Como requisito de diseño. Si no puedes deshacer una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.
## What I Left Out

**Auto-modificación del código.** La auto-edición al estilo Darwin-Gödel Machine funciona en entornos de agentes codificadores con verificadores formales. Para un marco general sin esas restricciones, es una preocupación de la fase 4, no porque sea imposible, sino porque la infraestructura previa necesaria (evaluador estable, garantías de retroceso, alcance de tarea estrecho) necesita estar en su lugar primero.

**Universalidad de características.** Las características SAE son específicas del modelo y a veces específicas del checkpoint. Si las características útiles se transfieren entre versiones de modelo es una pregunta de investigación abierta. El marco debe estar diseñado para volver a extraer diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Evaluadores multi-agente.** Utilizar un modelo juez como parte del bucle de evaluación añade robustez pero también crea una superficie adversarial. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto requiere contra-medidas explícitas que aún no he diseñado.

**Presupuesto de cómputo.** Una mutación que mejora la capacidad en un 2 % pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primera clase en el evaluador, no ideas posteriores.

---

La conexión con [Hrafn](https://github.com/5queezer/hrafn) es directa. MuninnDB es la capa de persistencia. El Dream Engine, modelado en la consolidación de memoria de fase de sueño, es el mecanismo que promueve observaciones efímeras a política de medio término. Las piezas que faltan son la política de búsqueda y el evaluador co‑evolutivo. Eso es lo que se construirá a continuación.

Si estás construyendo en este espacio, la prioridad que vale más la pena prestar no proviene del ML. Proviene de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Comienza con [Hrafn](https://github.com/5queezer/hrafn) y con la [capa de persistencia de MuninnDB](https://github.com/5queezer/hrafn). La separación genoma/fenotipo ya está conectada. Lo que necesita construirse es el evaluador que co‑evoluciona con el sistema que mide.

---

*Christian Pojoni construye infraestructura de agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes basado en Rust.*

*La imagen de portada de esta publicación fue generada por IA.*
