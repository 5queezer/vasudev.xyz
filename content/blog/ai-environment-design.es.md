---
title: "Deja de diseñar tusistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Los entornos de IA autoevolutiva fracasan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que debe evolucionar es la presión de selección, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
translationHash: "57e07e366bbcb43e8621ce7153ffcbbc"
---
Pasé una semana intentando diseñar un "lenguaje de programación nativo de vectores para LLMs". La idea era programar el comportamiento del modelo directamente en el nivel de activación, sin prompts, solo vectores de intervención. Fue intelectualmente satisfactorio y practically incorrecto. Lo que realmente quería no era un lenguaje. Era un organismo.

**La unidad de evolución no es la característica. Es el ciclo de mutación/selección.**

Esta distinción cambia todo acerca de cómo construyes un esquema de IA autoevolutivo. La mayoría de los sistemas que se llaman "auto-mejoramiento" están haciendo AutoML. Optimizan sobre un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca de AutoML que de la evolución abierta. La diferencia resulta ser decisiva arquitectónicamente en dos formas.

---

## Genotipo y Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que se selecciona. El genoma no se prueba directamente. El fenotipo sí. Las mutaciones ocurren en el genoma. La selección actúa sobre el fenotipo. El genoma sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente de la capacidad de evolución misma.

Un esquema de IA tiene una estructura análoga si lo construyes correctamente, no como equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: adapter weights, retrieval policies, tool configurations, activation steering rules, codebase patches. El fenotipo es el comportamiento observable en tareas. El evaluador ve el comportamiento, no los internos. Mutaciones apuntan al genoma. La selección apunta al fenotipo.

Muchos diseños de agentes auto-mejorantes colapsan esta distinción, al menos de manera implícita. Midan comportamiento y luego editan directamente lo que midieron. Eso es como evolucionar organismos editando sus fenotipos. No se generaliza porque estás parcheando el síntoma, no la causa.

La arquitectura correcta separa estas capas explícitamente:

El **persistence tier** almacena lo que sobrevive: adapters (long-term), retrieval and tool policies (medium-term), activation steering rules (ephemeral). El **mutation generators** propone cambios al persistence tier, no al comportamiento directamente. El **evaluator** observa solo el comportamiento y decide qué mutaciones sobreviven. Nada en el persistence tier se actualiza excepto a través de esta puerta.

---

## El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico diverge del pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. Lo minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de estas cosas. Es el entorno, y el entorno no lo diseñaste. Es lo que mata a las cosas que no pueden manejarlo.

Cuando diseñas a mano una batería de tareas para tu esquema autoevolutivo y nunca la cambias, no has creado un entorno. Has creado una función de pérdida con pasos extra. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no captura. Esto es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se convierte en un techo. Para sustentar una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse adversariamente. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para atrapar el juego superficial. Necesita tareas de capacidad (¿puede hacer la cosa?), calibración (¿sabe cuándo no puede?), y regresión (¿rompió lo que ya sabía?). Y necesita al menos un camino de evaluación con un humano en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles se hackean.

En la práctica, esto significa: empieza con una batería pequeña y fija, pero construye la infraestructura para ampliarla desde el principio. Cada mutación que el sistema retenga debe generar un caso de prueba que habría detectado un fallo de esa mutación. Con el tiempo, la batería crece con el sistema. Eso es co-evolución en su forma mínima viable.

---

## El redireccionamiento de SAE es un Operador, no la Base

Los autoencoders dispersos pueden exponer características latentes dispersas, muchas de las cuales son lo suficientemente interpretables como para dirigir el comportamiento localmente, aunque la calidad de las características y la especificidad causal siguen siendo preguntas de investigación activas. Puedes dirigir un modelo hacia o alejando de un concepto añadiendo o suprimiendo un vector de característica en una capa específica durante el paso hacia adelante. Esto es rápido, reversible y no requiere reentrenamiento.

Pero es solo una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un esquema serio deben producir propuestas a través de al menos cuatro substratos. El primer substrato son transformaciones de prompt y recuperación: baratas, reversibles, siempre el punto de partida. El segundo son reglas de steering de activación: rápidas, locales, compromiso de nivel medio. El tercero son actualizaciones de adapter y LoRA: más pesadas, requieren entrenamiento, persistencia a medio plazo. El cuarto es ediciones de código y políticas: mayor compromiso, más difícil de revertir.

Empezar con solo steering de SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes adaptación local rápida y comportamiento global frágil. El sistema necesita ser capaz de modificar cómo recupera contexto, cómo enruta herramientas, y eventualmente cómo procesa información a nivel de pesos, no porque esos son operadores más poderosos, sino porque distintos problemas viven en diferentes substratos.

La disciplina adecuada es: una intervención de bajo costo exitosa debe re-expresarse en un substrato más barato o más estable cuando sea posible, como una transformación de prompt, regla de recuperación o actualización de adapter, siempre que el efecto causal sobreviva a la traducción. Esto no es solo una regla de seguridad. Es una regla de evolvabilidad: el sistema debe resistir mutaciones costosas hasta que las baratas encuentren el vecindario adecuado.

---

## Cómo Se Ve Realmente un Bucle Mínimo Viable

El bucle tiene seis etapas. Observar. Proponer. Sandbox. Evaluar. Retener al ganador (o rechazar a todos los candidatos). Actualizar el prior de búsqueda.

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genere mutaciones candidatas, una por clase de operador, en paralelo. Sandbox significa que cada candidato se ejecute en aislamiento: sin estado compartido, límites de recursos estrictos, rollback garantizado. Evaluar significa puntuar la delta de comportamiento contra la línea base actual. Retener significa escribir al ganador en el persistence tier con plena procedencia: métricas antes/después, qué prompts afectó, qué clase de operador usó, y políticas de expiración y revalidación. Actualizar el prior de búsqueda significa que el bandit o política evolutiva aprenda qué clases de operador y qué regiones del espacio de búsqueda están produciendo sobrevivientes.

Cada mutación retenida necesita un mango de rollback. No como una característica de seguridad. Como requisito de diseño. Si no puedes revertir una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.

---

## Lo Que Dejé Afuera

**Self-modification of code.** La aut-modificación de código estilo Darwin-Gödel Machine funciona en entornos de agentes codificadores sandboxed con verificadores formales. Para un esquema general sin esas restricciones, es una preocupación de Fase 4, no porque sea imposible, sino porque la infraestructura prerequisito (evaluador estable, garantías de rollback, alcance estrecho de tarea) necesita estar en su lugar primero.

**Feature universality.** Las características de SAE son específicas del modelo y a veces específicas del checkpoint. Whether características útiles transfieren versiones de modelo es una pregunta de investigación abierta. El esquema debería estar diseñado para reextraer diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Multi-agent evaluators.** Usar un modelo juez como parte del bucle de evaluación añade robustez pero también crea una superficie adversaria. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto necesita contra-medidas explícitas que aún no he diseñado.

**Compute budgeting.** Una mutación que mejora la capacidad en un 2% pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primera clase en el evaluador, no ideas después.

---

La conexión con [Hrafn](https://github.com/5queezer/hrafn) es directa. MuninnDB es el persistence tier. El Dream Engine, modelado en la consolidación de memoria de fase de sueño, es el mecanismo que promueve observaciones efímeras en una política de medio término. Las piezas faltantes son la política de búsqueda y el evaluador co-evolutivo. Eso es lo que se construye a continuación.

Si estás construyendo en este espacio, la prioridad más valiosa de la que puedes prestar no proviene de ML. Proviene de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Comienza con [Hrafn](https://github.com/5queezer/hrafn) y con la [MuninnDB persistence layer](https://github.com/5queezer/hrafn). La separación genoma/phenotype ya está conectada. Lo que necesita construirse es el evaluador que co-evoluciona con el sistema que mide.

*Christian Pojoni construye infraestructura de agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes basado en Rust.*

*La imagen de portada de esta publicación fue generada por IA.*