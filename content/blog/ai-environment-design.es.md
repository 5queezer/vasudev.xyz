---
title: "Deja dediseñar tu sistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Los engendros de IA autoevolutiva fallan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que necesita evolucionar es la presión de selección, no solo el genoma."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "c4e9049fe9e4f0511a204b8b2b5ac52f"
---
Pasé una semana intentando diseñar un "lenguaje de programación nativo de vectores para LLM". La idea era programar el comportamiento del modelo directamente a nivel de activación, sin prompts, solo vectores de intervención. Fue intelectualmente satisfactorio, pero prácticamente erróneo. Lo que realmente quería no era un lenguaje. Era un organismo.

**La unidad de evolución no es la característica. Es el ciclo mutación/selección.**

Esa distinción lo cambia todo sobre cómo se construye un entorno de IA autoevolutivo. La mayoría de los sistemas que se autodenominan "automejorables" están haciendo AutoML. Optimizan sobre un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca del AutoML que de la evolución de final abierto. Resulta que la diferencia es arquitectónicamente decisiva en dos aspectos.

---

## El genotipo y el fenotipo no están en la misma capa

Los sistemas biológicos separan lo que persiste de lo que es seleccionado. El genoma no se prueba directamente. El fenotipo, sí. Las mutaciones ocurren en el genoma. La selección ocurre sobre el fenotipo. El genoma sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente misma de la evolucionabilidad.

Un entorno de IA tiene una estructura análoga si se construye correctamente, no como una equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: pesos de adaptadores, políticas de recuperación, configuraciones de herramientas, reglas de direccionamiento de activaciones, parches en la base de código. El fenotipo es el comportamiento observable en las tareas. El evaluador ve el comportamiento, no los componentes internos. Las mutaciones apuntan al genoma. La selección apunta al fenotipo.

Muchos diseños de agentes automejorables colapsan esta distinción, al menos implícitamente. Miden el comportamiento y luego editan directamente lo que midieron. Eso es como hacer evolucionar organismos editando sus fenotipos. No generaliza porque estás parcheando el síntoma, no la causa.

La arquitectura correcta separa estas capas explícitamente:

El **nivel de persistencia** almacena lo que sobrevive: adaptadores (largo plazo), políticas de recuperación y de herramientas (medio plazo), reglas de direccionamiento de activaciones (efímeras). Los **generadores de mutaciones** proponen cambios al nivel de persistencia, no al comportamiento directamente. El **evaluador** observa únicamente el comportamiento y decide qué mutaciones sobreviven. Nada en el nivel de persistencia se actualiza excepto a través de esta compuerta.

---

## El evaluador no es una función de pérdida

Aquí es donde el pensamiento biológico se separa del pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. Lo minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de estas cosas. Es el entorno, y el entorno no está diseñado por ti. Es aquello que elimina lo que no puede manejarlo.

Cuando diseñas manualmente una batería de tareas para tu entorno autoevolutivo y nunca la cambias, no has construido un entorno. Has construido una función de pérdida con pasos adicionales. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no detecta. Esta es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se convierte en un techo. Para sostener una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse adversarialmente. Esto significa que la batería de tareas necesita tareas adversariales diseñadas específicamente para capturar el juego a nivel superficial. Necesita tareas de capacidad (¿puede hacer la cosa?), tareas de calibración (¿sabe cuándo no puede?) y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos una ruta de evaluación con humano en el bucle que el sistema no pueda predecir, porque los evaluadores predecibles se manipulan.

Prácticamente, esto significa: empieza con una batería pequeña y fija, pero construye la infraestructura para extenderla desde el principio. Cada mutación que el sistema retenga debería generar un caso de prueba que habría detectado un fallo de esa mutación. Con el tiempo, la batería crece con el sistema. Eso es coevolución en su forma mínima viable.

---

## El direccionamiento con SAE es un operador, no la base

Los autocodificadores dispersos (SAE) pueden revelar características latentes dispersas, muchas de las cuales son lo suficientemente interpretables como para direccionar el comportamiento localmente, aunque la calidad de las características y la especificidad causal siguen siendo preguntas de investigación activas. Puedes direccionar un modelo hacia o lejos de un concepto sumando o suprimiendo un vector de características en una capa específica durante la propagación hacia adelante. Esto es rápido, reversible y no requiere reentrenamiento.

Pero es una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un entorno serio deberían producir propuestas en al menos cuatro sustratos. El primer sustrato son las transformaciones de prompts y recuperación: económicas, reversibles, siempre el punto de partida. El segundo son las reglas de direccionamiento de activaciones: rápidas, locales, compromiso de nivel medio. El tercero son las actualizaciones de adaptadores y LoRA: más pesadas, requieren entrenamiento, persistencia a mediano plazo. El cuarto son las ediciones de código y políticas: mayor compromiso, más difíciles de revertir.

Empezar solo con direccionamiento SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes una adaptación local rápida y un comportamiento global frágil. El sistema necesita poder modificar cómo recupera el contexto, cómo enruta las herramientas y, eventualmente, cómo procesa información a nivel de pesos, no porque sean operadores más potentes, sino porque diferentes problemas residen en diferentes sustratos.

La disciplina correcta es: una intervención exitosa de bajo coste debería reexpresarse en un sustrato más barato o más estable siempre que sea posible, como una transformación de prompt, una regla de recuperación o una actualización de adaptador, siempre que el efecto causal sobreviva a la traducción. Esto no es una regla solo para seguridad. Es una regla para la evolucionabilidad: el sistema debe resistir mutaciones costosas hasta que las económicas encuentren la vecindad correcta.

---

## Cómo se ve realmente un ciclo mínimo viable

El ciclo tiene seis etapas. Observar. Proponer. Aislar (Sandbox). Evaluar. Retener al ganador (o rechazar todos los candidatos). Actualizar la previa de búsqueda.

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genera mutaciones candidatas, una por clase de operador, en paralelo. Aislar (Sandbox) significa que cada candidato se ejecuta de forma aislada: sin estado compartido, límites estrictos de recursos, reversión garantizada. Evaluar significa puntuar el delta de comportamiento respecto a la línea base actual. Retener significa escribir al ganador en el nivel de persistencia con procedencia completa: métricas antes/después, qué prompts afectó, qué clase de operador usó, y la política de caducidad y revalidación. Actualizar la previa de búsqueda significa que la política de bandidos o evolutiva aprende qué clases de operador y qué regiones del espacio de búsqueda están produciendo supervivientes.

Cada mutación retenida necesita un mecanismo de reversión. No como una característica de seguridad. Como un requisito de diseño. Si no puedes revertir una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.

---

## Lo que dejé fuera

**Automodificación de código.** La autoedición estilo Máquina Darwin-Gödel funciona en entornos de agentes de programación aislados con verificadores formales. Para un entorno general sin esas restricciones, es un problema para la Fase 4, no porque sea imposible, sino porque la infraestructura necesaria (evaluador estable, garantías de reversión, alcance acotado de tareas) debe estar implementada primero.

**Universalidad de características.** Las características SAE son específicas del modelo y, a veces, específicas del checkpoint. Si las características útiles se transfieren entre versiones del modelo es una pregunta de investigación abierta. El entorno debe diseñarse para reextraer diccionarios de características en cada actualización del modelo base en lugar de asumir estabilidad.

**Evaluadores multiagente.** Usar un modelo juez como parte del ciclo de evaluación añade robustez pero también crea una superficie adversarial. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto necesita contramedidas explícitas que aún no he diseñado.

**Presupuesto de cómputo.** Una mutación que mejora la capacidad en un 2% pero duplica la latencia no es una victoria. La latencia y el coste deben ser restricciones de primera clase en el evaluador, no ideas de último momento.

---

La conexión con [Hrafn](https://github.com/5queezer/hrafn) es directa. MuninnDB es el nivel de persistencia. El Dream Engine, modelado en la consolidación de memoria durante la fase de sueño, es el mecanismo que promueve observaciones efímeras a políticas de medio plazo. Las piezas que faltan son la política de búsqueda y el evaluador coevolutivo. Eso es lo que se construirá a continuación.

Si estás construyendo en este espacio, la previa más valiosa para tomar prestado no proviene del ML. Proviene de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Comienza con [Hrafn](https://github.com/5queezer/hrafn) y la [capa de persistencia MuninnDB](https://github.com/5queezer/hrafn). La separación genotipo/fenotipo ya está integrada. Lo que necesita construirse es el evaluador que coevoluciona con el sistema que mide.

---

*Christian Pojoni construye infraestructura para agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes basado en Rust.*

*La imagen de portada de esta publicación fue generada por IA.*