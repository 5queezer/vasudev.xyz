---
title: "Dejar de Diseñar TuSistema de IA. Diseña su Entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Los contratiempos de la IA autoseleccionadora fallan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que necesita evolucionar es la presión de selección, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "e45b4bb7f7b3749e81508794e5006ac3"
---
Ispent a week trying to design a "vector-native programming language for LLMs." The idea was to program model behavior directly at the activation level, no prompts, just intervention vectors. It was intellectually satisfying and practically wrong. What I actually wanted was not a language. It was an organism.

**La unidad de evolución no es la característica. Es el ciclo de mutación/selección.**

That distinction changes everything about how you build a self-evolving AI harness. Most systems that call themselves "self-improving" are doing AutoML. They optimize over a fixed search space toward a fixed objective. That can produce adaptation, but it is closer to AutoML than to open-ended evolution. The difference turns out to be architecturally decisive in two ways.

---

## Genotipo y Fenotipo No Son la Misma Capa

Biological systems separate what persists from what gets selected. The genome is not tested directly. The phenotype is. Mutations happen to the genome. Selection happens to the phenotype. The genome survives by producing phenotypes that survive. This asymmetry is the source of evolvability itself.

An AI harness has an analogous structure if you build it correctly, not as literal biological equivalence, but as a useful architectural mapping. The genome es tu persistent state: adapter weights, retrieval policies, tool configurations, activation steering rules, codebase patches. The phenotype es el comportamiento observable en tareas. El evaluador solo ve el comportamiento, no las internas. Mutations apuntan al genome. Selection apunta al phenotype.

Many self-improving agent designs collapse this distinction, at least implicitly. They measure behavior, then directly edit the thing they measured. That is like evolving organisms by editing their phenotypes. It does not generalize because you are patching the symptom, not the cause.

The correct architecture separates these layers explicitly:

The **capa de persistencia** almacena lo que persiste: adapters (long-term), retrieval and tool policies (medium-term), activation steering rules (ephemeral). The **generadores de mutaciones** proponen cambios a la **capa de persistencia**, no a comportamiento directamente. The **evaluador** observa comportamiento solo, y filtra cuáles mutaciones sobreviven. Nada en la **capa de persistencia** se actualiza excepto a través de esta puerta.

---

## El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico se distancia del pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable, definido localmente. Lo minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no tiene nada de esto. Es el entorno, y el entorno no lo diseñas tú. Es lo que mata a las cosas que no pueden manejarlo.

Cuando diseñas a mano una batería de tareas para tu agarre autoevolutivo y nunca la cambias, no has construido un entorno. Has creado una función de pérdida con pasos extra. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no captura. Esto es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se convierte en un techo. Para sostener una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse adversariamente. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para atrapar el juego superficial. Necesita tareas de capacidad (¿puede hacerlo?), tareas de calibración (¿sabe cuándo no puede?), y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos un camino de evaluación con humanos en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles se engañan.

Prácticamente, esto significa: comienza con una batería pequeña y fija, pero construye la infraestructura para extenderla desde el principio. Cada mutación que el sistema retiene debe generar un caso de prueba que habría detectado el fallo de esa mutación. Con el tiempo, la batería crece con el sistema. Eso es co-evolución en su forma mínima viable.

---

## Guiado de SAE Es un Operador, No la Base

Los codificadores autoescasos pueden exponer características latentes escasas, muchas de las cuales son lo suficientemente interpretables como para guiar el comportamiento localmente, aunque la calidad de la característica y la especificidad causal siguen siendo preguntas de investigación activas. Puedes guiar un modelo hacia o lejos de un concepto añadiendo o suprimiendo un vector de característica en una capa específica durante el paso forward. Esto es rápido, reversible, y no requiere reentrenamiento.

Pero es solo una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un agarre serio deberían producir propuestas en al menos cuatro substratos. El primer substrato son transformaciones de prompts y recuperación: baratas, reversibles, siempre el punto de partida. El segundo son reglas de guiado de activación: rápidas, locales, compromiso de nivel medio. El tercero son actualizaciones de adapter y LoRA: más pesadas, requieren entrenamiento, persistencia a medio plazo. El cuarto son ediciones de código y políticas: mayor compromiso, más difícil de revertir.

Empezar con solo guiado de SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes adaptación local rápida y comportamiento global frágil. El sistema necesita poder modificar cómo recupera contexto, cómo enruta herramientas, y eventualmente cómo procesa información a nivel de pesos, no porque esos sean operadores más poderosos, sino porque diferentes problemas viven en diferentes substratos.

La disciplina adecuada es: una intervención de bajo costo exitosa debería ser reexpresada en un substrato más barato o más estable cuando sea posible, como una transformación de prompt, regla de recuperación o actualización de adapter, siempre que el efecto causal sobreviva a la traducción. Esto no es una regla solo para seguridad. Es una regla para la evolvabilidad: el sistema debe resistir mutaciones costosas hasta que las baratas hayan encontrado el vecindario adecuado.

---

## Cómo Se Vería Realmente un Bucle Mínimo Viable

El bucle tiene seis etapas. Observa. Propone. Sandbox. Evalúa. Retiene al ganador (o rechaza a todos los candidatos). Actualiza la prioridad de búsqueda.

Observa significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Propone significa que la política de búsqueda genera mutaciones candidatas, una por clase de operador, en paralelo. Sandbox significa que cada candidato se ejecuta en aislamiento: sin estado compartido, límites de recursos duros, rollback garantizado. Evalúa significa puntuar el delta de comportamiento contra la línea base actual. Retiene significa escribir al ganador en la capa de persistencia con plena procedencia: métricas antes/después, qué prompts afectó, qué clase de operador usó, y política de expiración y revalidación. Actualizar la prioridad de búsqueda significa que la política de bandit o evolutiva aprende qué clases de operador y qué regiones del espacio de búsqueda están produciendo sobrevivientes.

Cada mutación retenida necesita un mango de retroceso. No como característica de seguridad. Como requisito de diseño. Si no puedes retroceder una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.

---

## Qué Dejé Afuera

**Self-modificación de código.** La autoedición estilo Darwin-Gödel Machine funciona en entornos de agentes codificadores sandboxed con verificadores formales. Para un agarre general sin esas restricciones, es una preocupación de Fase 4, no porque sea imposible, sino porque la infraestructura previa (evaluador estable, garantías de retroceso, alcance de tarea estrecho) necesita estar en su lugar primero.

**Universalidad de características.** Las características de SAE son específicas del modelo y a veces específicas de checkpoint. Si las características útiles se transfieren entre versiones del modelo es una pregunta de investigación abierta. El agarre debería diseñarse para reextraer diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Evaluadores multi-agente.** Usar un modelo juez como parte del bucle de evaluación añade robustez pero también crea una superficie adversarial. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto necesita contramedidas explícitas que aún no he diseñado.

**Presupuesto de cómputo.** Una mutación que mejora la capacidad en un 2% pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primer orden en el evaluador, no afterthoughts.

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB es la capa de persistencia. El Motor de los Sueños, modelado en la consolidación de memoria de fase de sueño, es el mecanismo que promueve observaciones efímeras en políticas a medio plazo. Las piezas que faltan son la política de búsqueda y el evaluador co‑evolutivo. Eso es lo que se construye a continuación.

Si estás construyendo en este espacio, la prioridad más valiosa que puedes tomar prestada no es de ML. Es de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Start with [Hrafn](https://github.com/5queezer/hrafn) y la [MuninnDB persistence layer]. La separación genoma/fenotipo ya está conectada. Lo que necesita construirse es el evaluador que co‑evoluciona con el sistema que mide.

*Christian Pojoni construye infraestructura de agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un runtime de agente basado en Rust.*

*La imagen de portada de esta publicación fue generada por IA.*