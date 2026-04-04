---
title: "Deja de diseñar tu sistema de IA. Diseña su entorno."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Los sistemas de IA autoevolutivos fallan cuando optimizan un evaluador fijo. El modelo biológico tiene razón: lo que debe evolucionar es la presión de selección, no solo el genoma."
translationHash: "c8114fcd2ab02d4ccab95905304b83ca"
---
Pasé una semana intentando diseñar un "lenguaje de programación nativo de vectores para LLM". La idea era programar el comportamiento del modelo directamente a nivel de activación, sin prompts, solo vectores de intervención. Fue intelectualmente satisfactorio y prácticamente incorrecto. Lo que realmente quería no era un lenguaje. Era un organismo.

**La unidad de evolución no es la característica. Es el ciclo mutación/selección.**

Esa distinción lo cambia todo sobre cómo se construye un entorno de IA autoevolutivo. La mayoría de los sistemas que se autodenominan "automejorables" están haciendo AutoML. Optimizan sobre un espacio de búsqueda fijo hacia un objetivo fijo. Eso puede producir adaptación, pero está más cerca del AutoML que de la evolución abierta. La diferencia resulta ser arquitectónicamente decisiva en dos sentidos.

---

## El Genotipo y el Fenotipo No Son la Misma Capa

Los sistemas biológicos separan lo que persiste de lo que se selecciona. El genoma no se prueba directamente. El fenotipo sí. Las mutaciones ocurren en el genoma. La selección ocurre en el fenotipo. El genoma sobrevive produciendo fenotipos que sobreviven. Esta asimetría es la fuente de la evolucionabilidad en sí misma.

Un entorno de IA tiene una estructura análoga si se construye correctamente, no como una equivalencia biológica literal, sino como un mapeo arquitectónico útil. El genoma es tu estado persistente: pesos de adaptadores, políticas de recuperación, configuraciones de herramientas, reglas de control de activaciones, parches en la base de código. El fenotipo es el comportamiento observable en tareas. El evaluador ve comportamiento, no componentes internos. Las mutaciones apuntan al genoma. La selección apunta al fenotipo.

Muchos diseños de agentes automejorables colapsan esta distinción, al menos implícitamente. Miden el comportamiento y luego editan directamente lo que midieron. Eso es como hacer evolucionar organismos editando sus fenotipos. No se generaliza porque estás parcheando el síntoma, no la causa.

La arquitectura correcta separa estas capas de forma explícita:

El **nivel de persistencia** almacena lo que sobrevive: adaptadores (a largo plazo), políticas de recuperación y de herramientas (a mediano plazo), reglas de control de activaciones (efímeras). Los **generadores de mutaciones** proponen cambios al nivel de persistencia, no al comportamiento directamente. El **evaluador** observa solo el comportamiento y filtra qué mutaciones sobreviven. Nada en el nivel de persistencia se actualiza excepto a través de este filtro.

---

## El Evaluador No Es una Función de Pérdida

Aquí es donde el pensamiento biológico se separa del pensamiento de ML de una manera que importa para la arquitectura.

Una función de pérdida es un objetivo suave, diferenciable y definido localmente. Lo minimizas. Asume que la respuesta correcta es conocida y fija. Una presión de selección no es ninguna de esas cosas. Es el entorno, y el entorno no es diseñado por ti. Lo que sea que elimina las cosas que no pueden manejarlo.

Cuando diseñas manualmente una batería de tareas para tu entorno autoevolutivo y nunca la cambias, no has construido un entorno. Has construido una función de pérdida con pasos extras. El sistema optimizará para esa batería y se detendrá. Encontrará atajos que la batería no detecta. Esta es la Ley de Goodhart a nivel arquitectónico: una vez que una medida se convierte en objetivo, deja de ser una buena medida.

Un evaluador fijo eventualmente se convierte en un techo. Para sostener una mejora robusta, el entorno de evaluación necesita expandirse, diversificarse o adaptarse de manera adversarial. Esto significa que la batería de tareas necesita tareas adversarias diseñadas específicamente para captar manipulaciones superficiales. Necesita tareas de capacidad (¿puede hacer lo que se pide?), tareas de calibración (¿sabe cuándo no puede hacerlo?) y tareas de regresión (¿rompió lo que ya sabía?). Y necesita al menos una vía de evaluación con intervención humana que el sistema no pueda predecir, ya que los evaluadores predecibles terminan siendo manipulados.

En la práctica, esto significa: comienza con una pequeña batería fija, pero construye la infraestructura para extenderla desde el principio. Cada mutación que el sistema retenga debería generar un caso de prueba que habría detectado un fallo de dicha mutación. Con el tiempo, la batería crece junto con el sistema. Esa es la coevolución en su forma mínima viable.

---

## El Control por SAE es un Operador, No la Base

Los autoencoders dispersos (SAE) pueden exponer características latentes dispersas, muchas de las cuales son lo suficientemente interpretables como para dirigir el comportamiento localmente, aunque la calidad de las características y la especificidad causal siguen siendo temas de investigación activa. Puedes dirigir un modelo hacia o alejarlo de un concepto sumando o suprimiendo un vector de características en una capa específica durante el *forward pass*. Esto es rápido, reversible y no requiere reentrenamiento.

Pero es una clase de operador en un espacio de acción mixto. Los generadores de mutaciones en un entorno serio deberían producir propuestas a través de al menos cuatro sustratos. El primer sustrato son las transformaciones de *prompts* y de recuperación: baratas, reversibles, siempre el punto de partida. El segundo son las reglas de control de activaciones: rápidas, locales, con un compromiso de nivel medio. El tercero son las actualizaciones de adaptadores y LoRA: más pesadas, requieren entrenamiento, persistencia a mediano plazo. El cuarto son las ediciones de código y políticas: mayor compromiso, más difícil de revertir.

Comenzar solo con control por SAE es como construir un sistema evolutivo que solo puede mutar un gen. Obtienes una adaptación local rápida y un comportamiento global frágil. El sistema necesita poder modificar cómo recupera el contexto, cómo enruta herramientas y, eventualmente, cómo procesa información a nivel de pesos, no porque sean operadores más poderosos, sino porque diferentes problemas residen en diferentes sustratos.

La disciplina correcta es: una intervención exitosa de bajo costo debe reexpresarse, de ser posible, en un sustrato más barato o estable, como una transformación de *prompt*, una regla de recuperación o una actualización de adaptador, siempre que el efecto causal sobreviva a la traducción. Esta no es una regla solo para la seguridad. Es una regla para la evolucionabilidad: el sistema debe resistir mutaciones costosas hasta que las baratas hayan encontrado el vecindario correcto.

---

## Cómo Se Ve Realmente un Bucle Mínimo Viable

El bucle tiene seis etapas. Observar. Proponer. *Sandbox*. Evaluar. Retener al ganador (o rechazar todos los candidatos). Actualizar el *prior* de búsqueda.

Observar significa ejecutar el genoma actual contra la batería de tareas y registrar métricas de comportamiento. Proponer significa que la política de búsqueda genera mutaciones candidatas, una por clase de operador, en paralelo. *Sandbox* significa que cada candidato se ejecuta en aislamiento: sin estado compartido, límites estrictos de recursos, reversión garantizada. Evaluar significa puntuar el delta de comportamiento frente a la línea base actual. Retener significa escribir al ganador en el nivel de persistencia con procedencia completa: métricas antes/después, qué *prompts* afectó, qué clase de operador usó, y políticas de expiración y revalidación. Actualizar el *prior* de búsqueda significa que la política tipo *bandido* o evolutiva aprende qué clases de operador y qué regiones del espacio de búsqueda están produciendo supervivientes.

Cada mutación retenida necesita un mecanismo de reversión. No como una función de seguridad. Como un requisito de diseño. Si no puedes revertir una mutación, no puedes medir su contribución marginal. Si no puedes medir su contribución marginal, no estás evolucionando. Estás acumulando.

---

## Lo Que Dejé Fuera

**Automodificación de código.** La autoedición estilo Máquina Darwin-Gödel funciona en entornos aislados de agentes de codificación con verificadores formales. Para un entorno general sin esas restricciones, es una preocupación de la Fase 4, no porque sea imposible, sino porque la infraestructura previa (evaluador estable, garantías de reversión, alcance estrecho de tareas) debe implementarse primero.

**Universalidad de características.** Las características de los SAE son específicas del modelo y, a veces, específicas del *checkpoint*. Si las características útiles se transfieren entre versiones del modelo es una pregunta de investigación abierta. El entorno debe diseñarse para extraer de nuevo los diccionarios de características con cada actualización del modelo base, en lugar de asumir estabilidad.

**Evaluadores multiagente.** Usar un modelo juez como parte del bucle de evaluación añade robustez, pero también crea una superficie adversaria. El sistema puede aprender a satisfacer al juez en lugar de la tarea subyacente. Esto requiere contramedidas explícitas que aún no he diseñado.

**Presupuesto computacional.** Una mutación que mejora la capacidad en un 2 % pero duplica la latencia no es una victoria. La latencia y el costo deben ser restricciones de primera clase en el evaluador, no ideas de último momento.

---

La conexión con [Hrafn](https://github.com/5queezer/hrafn) es directa. MuninnDB es el nivel de persistencia. El *Dream Engine*, modelado en la consolidación de memoria durante la fase de sueño, es el mecanismo que promueve observaciones efímeras hacia políticas a mediano plazo. Las piezas faltantes son la política de búsqueda y el evaluador coevolutivo. Eso es lo que se construirá a continuación.

Si estás construyendo en este ámbito, el *prior* más valioso para tomar prestado no proviene del ML. Proviene de la biología evolutiva: el entorno hace la selección. Tu trabajo es construir el entorno, no el organismo.

Comienza con [Hrafn](https://github.com/5queezer/hrafn) y la [capa de persistencia MuninnDB](https://github.com/5queezer/hrafn). La separación genotipo/fenotipo ya está cableada. Lo que necesita construirse es el evaluador que coevoluciona con el sistema que mide.

---

*Christian Pojoni construye infraestructura para agentes de IA y escribe sobre ello en [vasudev.xyz](https://vasudev.xyz). Trabajo actual: [Hrafn](https://github.com/5queezer/hrafn), un *runtime* de agentes basado en Rust.*