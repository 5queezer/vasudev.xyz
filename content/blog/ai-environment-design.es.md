---
title: "Deja de diseñar tu sistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Los contenedores de IA autodirigida fallan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que debe evolucionar es la presión de selección, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "5a4c8d555f193cfadfe26c378357502f"
---
Reglas:
- Preserva todoel formato Markdown, bloques de código, enlaces y etiquetas HTML exactamente como están.
- No traduzcas nombres propios, nombres de proyecto, URLs de GitHub ni código.
- No traduzcas el texto dentro de bloques de código (enmarcado con comillas invertidas o sangrado).
- No añadas comentarios o explicaciones. Solo genera el texto traducido.
- Mantén el mismo tono y estilo que el original.
- Para los enlaces de Wikipedia: reemplaza "en.wikipedia.org" con la Wikipedia de idioma es (p. ej. "es.wikipedia.org"). Verifica que el artículo objetivo exista en ese idioma. Si no existe un artículo equivalente, mantén el enlace de Wikipedia en inglés sin cambios.

---

I spent a week trying to design a "vector-native programming language for LLMs." The idea was to program model behavior directly at the activation level, no prompts, just intervention vectors. It was intellectually satisfying and practically wrong. What I actually wanted was not a language. It was an organism.

**The unit of evolution is not the feature. It is the mutation/selection cycle.**

That distinction changes everything about how you build a self-evolving AI harness. Most systems that call themselves "self-improving" are doing AutoML. They optimize over a fixed search space toward a fixed objective. That can produce adaptation, but it is closer to AutoML than to open-ended evolution. The difference turns out to be architecturally decisive in two ways.

---

## Genotipo y Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que se selecciona. El genoma no se prueba directamente. El fenotipo sí. Las mutaciones ocurren en el genoma. La selección actúa sobre el fenotipo. El genoma sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente de la evolucionabilidad misma.

Una infraestructura de IA tiene una estructura análoga si la construyes correctamente, no como equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: pesos de adaptadores, políticas de recuperación, configuraciones de herramientas, reglas de dirección de activación, parches del código base. El fenotipo es el comportamiento observable en tareas. El evaluador ve solo el comportamiento, no los internos. Las mutaciones apuntan al genoma. La selección apunta al fenotipo.

Muchos diseños de agentes auto mejorantes colapsan esta distinción, al menos implícitamente. Miden el comportamiento y luego editan directamente la cosa que midieron. Eso es como evolucionar organismos editando sus fenotipos. No se generaliza porque estás parcheando el síntoma, no la causa.

La arquitectura correcta separa estas capas explícitamente:

The **capa de persistencia** stores what survives: adapters (long-term), retrieval and tool policies (medium-term), activation steering rules (ephemeral). The **generadores de mutaciones** propose changes to the **capa de persistencia**, not to behavior directly. The **evaluador** observes behavior only, and gates which mutations survive. Nothing in the **capa de persistencia** gets updated except through this gate.

---

## El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico se distancia del pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. Lo minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de estas cosas. Es el entorno, y el entorno no lo diseñas. Es lo que mata a las cosas que no pueden manejarlo.

Cuando diseñes a mano una batería de tareas para tu engaranaje autoreplicante y nunca la cambies, no has construido un entorno. Has construido una función de pérdida con pasos extra. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no detecta. Esto es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se vuelve un techo. Para sostener una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse adversarialmente. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para atrapar engaños a nivel superficial. Necesita tareas de capacidad (¿puede hacerlo?), tareas de calibración (¿sabe cuándo no puede?), y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos un camino de evaluación con humana en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles son engañados.

Prácticamente, esto significa: comienza con una batería pequeña y fija, pero construye la infraestructura para ampliarla desde el principio. Cada mutación que el sistema retenga debe generar un caso de prueba que habría detectado el fallo de esa mutación. Con el tiempo, la batería crece con el sistema. Eso es co-evolución en su forma mínima viable.

---

## La Dirección SAE Es Un Operador, No la Base

Los autoencoders dispersos pueden exponer características latentes dispersas, muchas de las cuales son lo suficientemente interpretables como para dirigir el comportamiento localmente, aunque la calidad de las características y la especificidad causal siguen siendo preguntas de investigación activas. Puedes dirigir un modelo hacia o alejándolo de un concepto agregando o suprimiendo un vector de característica en una capa específica durante el paso hacia adelante. Esto es rápido, reversible y no requiere reentrenamiento.

Pero es solo una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un engaranaje serio deberían producir propuestas en al menos cuatro sustratos. El primer sustrato son transformaciones de prompt y recuperación: baratas, reversibles, siempre punto de partida. El segundo son reglas de dirección de activación: rápidas, locales, compromiso de nivel medio. El tercero son actualizaciones de adaptadores y LoRA: más pesadas, requieren entrenamiento, persistencia a medio plazo. El cuarto son ediciones de código y políticas: mayor compromiso, más difíciles de revertir.

Comenzar con solo la dirección SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes adaptación local rápida y comportamiento global frágil. El sistema necesita poder modificar cómo recupera contexto, cómo enruta herramientas, y eventualmente cómo procesa información a nivel de pesos, no porque esas sean operadores más poderosos, sino porque diferentes problemas viven en diferentes sustratos.

La disciplina adecuada es: una intervención de bajo costo exitosa debería reexpresarse en un sustrato más barato o más estable cuando sea posible, como una transformación de prompt, regla de recuperación o actualización de adaptador, siempre y cuando el efecto causal sobreviva a la traducción. Esto no es solo una regla de seguridad. Es una regla de evolucionabilidad: el sistema debe resistir mutaciones costosas hasta que las baratas hayan encontrado el vecindario adecuado.

---

## Cómo Se Ve Realmente un Bucle Mínimo Viable

El bucle tiene seis etapas. Observar. Proponer. Caja de arena. Evaluar. Retener al ganador (o rechazar a todos los candidatos). Actualizar la prioridad de búsqueda.

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genere_mutaciones candidatas, una por clase de operador, en paralelo. Caja de arena significa que cada candidato se ejecuta en aislamiento: sin estado compartido, límites de recursos estrictos, reversión garantizada. Evaluar significa puntuar la variación de comportamiento respecto a la línea base actual. Retener significa escribir al ganador en la capa de persistencia con plena trazabilidad: métricas antes y después, qué prompts affectó, qué clase de operador usó, y políticas de expiración y revalidación. Actualizar la prioridad de búsqueda significa que la política de banda o evolutiva aprenda qué clases de operador y qué regiones del espacio de búsqueda están produciendo sobrevivientes.

Every retained mutation needs a rollback handle. Not as a safety feature. As a design requirement. If you cannot roll back a mutation, you cannot measure its marginal contribution. If you cannot measure its marginal contribution, you are not evolving. You are accumulating.

---

## Lo Que Dejé Afuera

**Modificación autónoma del código.** La autoedición estilo Darwin-Gödel Machine funciona en entornos de agentes codificadores aislados con verificadores formales. Para un engaranaje general sin esas restricciones, es una preocupación de la Fase 4, no porque sea imposible, sino porque la infraestructura previa (evaluador estable, garantías de reversión, alcance de tarea estrecho) necesita estar en su lugar primero.

**Universalidad de características.** Las características de SAE son específicas del modelo y a veces específicas del checkpoint. ¿Si las características útiles se transfieren entre versiones de modelo es una pregunta de investigación abierta. El engaranaje debería diseñarse para volver a extraer diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Evaluadores multiagente.** Usar un modelo juez como parte del bucle de evaluación añade robustez pero también crea una superficie adversarial. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto requiere contramedidas explícitas que aún no he diseñado.

**Presupuesto de computación.** Una mutación que mejora la capacidad en un 2% pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primera clase en el evaluador, no después de pensado.

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB is the persistence tier. The Dream Engine, modeled on sleep-phase memory consolidation, is the mechanism that promotes ephemeral observations into medium-term policy. The missing pieces are the search policy and the co-evolving evaluator. That is what gets built next.

If you are building in this space, the prior that is most worth borrowing is not from ML. It is from evolutionary biology: el entorno does the selection. Your job is to build the environment, not the organism.

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). The genome/phenotype separation is already wired. What needs building is the evaluator that coevolves with the system it measures.

---

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

*The cover image for this post was generated by AI.*