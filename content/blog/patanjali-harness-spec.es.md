---
title: "Patanjali tenía la especificación de filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Tres principios yóguicos que predicen resultados empíricos en la investigación de agent harness. Manual operativo de hace 2000 años, benchmarks modernos."
translationHash: "33ca445b99227f7b0f5eb129462e39a0"
---
La semana pasada me dediqué a leer dos artículos y un [artículo de Fowler](https://martinfowler.com/articles/harness-engineering.html) sobre ingeniería de harness -- el código que envuelve un LLM y determina qué se almacena, recupera y presenta al modelo. A mitad de la taxonomía de guías y sensores de Birgitta Böckeler, me di cuenta de que ya había visto esta arquitectura antes. No en una base de código. En los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras).

**Las tradiciones contemplativas resolvieron la ingeniería de contexto hace 2000 años. La comunidad de agentes está redescubriendo sus respuestas, un estudio de ablación a la vez.**

Eso suena a la clase de afirmación por la que te echarían a risotadas de Hacker News. Así que permíteme respaldarla con tres mapeos específicos donde los principios yóguicos predicen -- no solo riman con -- resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de ingeniería de harness](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

## 1. Vrtti Nirodha: No todo el ruido es igual

El Yoga Sutra 1.2 define el yoga como *chitta vrtti nirodha* -- la cesación de las fluctuaciones en el campo mental. Patanjali no dice "borra todo". Distingue las [*kleshas*](https://es.wikipedia.org/wiki/Klesha) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de las [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal.

La publicación de ingeniería de harness de OpenAI llama a la misma operación "Gestión de Entropía" -- agentes de limpieza periódica que combaten el deterioro de la base de código. [Dream Engine](/blog/why-ai-agents-need-sleep/), el sistema de consolidación de MuninnDB, lo hace con umbrales de similitud divididos: 0.95 para la deduplicación normal, 0.85 durante el modo de sueño. Pero ninguno de los sistemas pregunta *qué tipo* de redundancia está eliminando.

Meta-Harness demostró que esto importa. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) mostró que los resúmenes generados por LLM de trazas de ejecución rindieron *peor* que las puntuaciones crudas por sí solas -- 38.7% frente a 41.3%. Las trazas crudas completas obtuvieron 56.7%. Los resúmenes fueron vrtti nirodha mal implementado: colapsaron *pramana* (señal diagnóstica) junto con *klesha* (ruido), destruyendo la información que el optimizador necesitaba.

La implicación de diseño para [MuninnDB](https://github.com/scrypster/muninndb): los pisos de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento curl fallido pueden tener tasas de recuperación idénticas, pero un valor de retención radicalmente diferente. Los niveles de confianza de la bóveda ya ordenan por sensibilidad del contenido (legal, trabajo, personal). Pero hay una trampa en el siguiente paso obvio.

Podrías intentar clasificar las entradas de antemano como pramana o klesha -- verificadas vs. distorsionadas -- pero esa clasificación es en sí misma el problema difícil. Para casos triviales (HTTP 200 vs. 401), es mecánico. Para la mayoría de las entradas, requiere juicio semántico, lo que significa un LLM en la ruta de decaimiento, lo que hace que la consolidación sea costosa y no determinista. Patanjali tuvo toda una vida de práctica para refinar su discernimiento. Dream Engine se activa mediante un cron.

El camino más simple: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción subsiguiente tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El piso de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación de bandido sobre la recuperación -- una idea bien establecida en la recuperación de información, aplicada aquí a la memoria persistente de agentes. No se necesita ontología. No se necesita LLM en el ciclo. En términos yóguicos: no necesitas clasificar la vrtti por adelantado -- observas su efecto y dejas que esa observación moldee la retención.

---

## 2. Samskara y Vairagya: El refuerzo necesita un contrapeso

El concepto yóguico de [samskaras](https://es.wikipedia.org/wiki/Samskara) describe impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundizan el surco. Esto es aprendizaje hebbiano -- "las neuronas que se disparan juntas, se conectan juntas" -- y MuninnDB lo implementa directamente: las entradas que se co-activan fortalecen sus pesos de asociación.

Los Yoga Sutras advierten que los samskaras se acumulan. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de liberar asociaciones fuertes), se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/V%C4%81sana) -- patrones de reacción automática que evaden la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

[MemoryBench](https://arxiv.org/abs/2510.17281) aporta evidencia indirecta. Su hallazgo central: los sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) no logran superar sistemáticamente a los baselines RAG ingenuos que simplemente recuperan del contexto crudo. El artículo no aísla el refuerzo hebbiano como la causa, pero el patrón encaja: los sistemas que procesan, consolidan y fortalecen memorias rinden *peor* que los que simplemente almacenan y recuperan todo sin modificar. Algo en la tubería de consolidación está destruyendo la señal. La hipótesis vasana -- que las asociaciones reforzadas desplazan a alternativas menos activadas pero más relevantes -- es una explicación. Necesita medición directa, razón por la cual existe el benchmark #311.

La taxonomía de Böckeler proporciona la percepción estructural. Ella distingue sensores computacionales (deterministas, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). El refuerzo hebbiano es un proceso computacional -- se ejecuta automáticamente en cada co-activación. Pero la detección de vasana requiere juicio inferencial: "esta asociación es fuerte, pero ¿es *correcta* para esta consulta?". Ningún contador de frecuencia puede responder eso.

El mecanismo que falta en MuninnDB es el *debilitamiento* hebbiano explícito -- no solo decaimiento pasivo, sino corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. Cuando un agente actúa sobre una entrada recuperada hebbianamente y la acción falla, el peso de asociación debería disminuir, no solo esperar a que Ebbinghaus lo erosione con el tiempo. Pero: esta es una nueva ruta de escritura en Dream Engine, y el principio de benchmark-first se mantiene. Ninguna característica se despliega sin evidencia de que el comportamiento actual causa daño.

Hipótesis comprobable para [benchmark #311](https://github.com/scrypster/muninndb/issues/311) -- el prerrequisito abierto; ninguna característica se despliega antes de que existan los datos. Medir tasas de recuperación de falsos positivos para entradas fortalecidas por Hebb frente a entradas no fortalecidas. Pero no te detengas en acierto/fallo binario. La métrica más precisa es la *tasa de desplazamiento* -- con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja a una entrada más relevante fuera del top-k. Esa es la medición directa de vasana: no solo "se recuperó el elemento incorrecto", sino "el elemento correcto fue desplazado por recuperación habitual". Si las entradas fortalecidas producen un desplazamiento medible, vairagya como primitivo de diseño está justificado empíricamente. Si no lo hacen, el decaimiento pasivo actual es suficiente y nos ahorramos la complejidad.

---

## 3. Pratyahara: El poder de la exclusión deliberada

El concepto de [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) a menudo se traduce como "retirada de los sentidos", pero eso es engañoso. No es ceguera -- es *atención selectiva*. Los sentidos siguen funcionando, pero dejan de tirar de la mente hacia cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Este es el problema central de la ingeniería de contexto, y el resultado más sorprendente de Meta-Harness lo confirma. Los harness ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador de clasificación de texto usa TF-IDF con pares contrastivos y priming de etiquetas. El ganador de recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas.

Böckeler lo encuadra como "mantener la calidad a la izquierda" -- cuanto antes filtres, más barato y confiable será el resultado posterior. Sus guías computacionales (linters, esquemas, reglas CLAUDE.md) son mecanismos pratyahara: evitan que categorías completas de información lleguen al modelo en absoluto.

La primera versión de este post argumentaba que la interfaz Memory Trait debería devolver metadatos de rechazo junto con los resultados -- "estas 3 entradas coincidieron, y estas 5 fueron excluidas por X". Más señal diagnóstica para el LLM. Decisiones mejor informadas. Suena razonable.

Está equivocado, y el propio principio de Pratyahara explica por qué.

Pratyahara significa que los sentidos *dejan de tirar de la mente hacia sus objetos*. Si le dices al LLM "aquí hay 5 cosas que te estoy retirando deliberadamente", le has mostrado los objetos y añadido una prohibición. Eso no es retirada sensorial -- es estimulación sensorial con una etiqueta de advertencia. Cualquier persona que haya meditado conoce el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los harness simples ganan) e invitan al modelo a cuestionar el filtro ("¿Por qué se excluyó X? Quizás lo necesite después de todo"). Los sistemas RAG que incluyen contexto negativo rinden empíricamente peor que los que simplemente entregan top-k.

La separación correcta: **el agente solo ve los resultados top-k. El harness del benchmark lo ve todo.** La interfaz Memory Trait se mantiene delgada -- `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué, y qué hizo el agente a continuación. El benchmark consume los registros. El agente consume las entradas.

A trace entry looks like this:

```json
{
  "query": "OAuth token refresh pattern for MCP server",
  "retrieved": ["entry_041", "entry_187", "entry_203"],
  "excluded": [
    {"id": "entry_089", "reason": "hebbian_weight_below_threshold", "score": 0.42},
    {"id": "entry_312", "reason": "ebbinghaus_decayed", "score": 0.31}
  ],
  "agent_action": "implemented_refresh_flow",
  "outcome": "success"
}
```

El agente nunca ve `excluded`. El harness del benchmark ve todo. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en la traza -- y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: el Memory Trait es una guía computacional (determina qué entra en el contexto). El registro de traza es un sensor computacional (observa qué sucedió). No se fusionan. Pratyahara no es un filtrado consciente en el sentido de *que el sistema filtrado sea consciente de la exclusión*. Es un filtrado consciente en el sentido de *que el diseñador sea consciente*, a través de los registros de traza, para que la próxima iteración del filtro mejore. La conciencia pertenece al ingeniero de harness que lee las trazas, no al agente que ejecuta las consultas.

---

## Donde la metáfora se rompe

En dos puntos.

Primero, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas del cuerpo védico -- físico, energético, mental, discriminativo, dicha) implican una jerarquía de lo grueso a lo sutil, siendo lo sutil "superior". La ingeniería de harness no tiene tal orden de valor. Un linter determinista no es "inferior" a un LLM-como-juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "gruesa", no trascenderla. Importar la jerarquía Kosha al diseño de harness te llevaría a sobreinvertir en controles inferenciales y subinvertir en los deterministas -- lo opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuesta condicionada. La arquitectura de agentes apunta a una respuesta condicionada *eficaz* -- quieres que el agente desarrolle patrones confiables, no que los disuelva. Vairagya en el sentido yóguico significa dejar ir *todo* apego; en la ingeniería de harness significa dejar ir los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación negándose a recuperar cualquier cosa. Poco útil.

---

## Lo que esto no es

Esto no es "la sabiduría antigua valida mi arquitectura". La flecha causal va en la dirección opuesta: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información durante milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación de memoria de agentes no es místico -- es ingeniería convergente en el mismo problema: ¿cómo gestiona un sistema acotado un flujo ilimitado de información?

Tampoco es el primer intento en la intersección. La [Optimización de Políticas Advaitica](https://www.researchgate.net/publication/389264820) de Ghosh y Ghosh y su sucesora Maṇḍūkya-APO mapean estados védicos de conciencia -- los cuatro estados del Māṇḍūkya Upaniṣad (vigilia, sueño, sueño profundo, trascendente) -- a un ciclo de consolidación vigilia-sueño para agentes RL, formalizado con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos artículos son marcos conceptuales explícitos sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre "marco propuesto" y "resultado medido" es donde muere la mayoría del trabajo interdisciplinario. Las tres hipótesis a continuación están diseñadas para no morir allí.

La pregunta útil no es "¿es el yoga relevante para la IA?" sino "¿qué discriminaciones yóguicas específicas producen hipótesis comprobables que los sistemas de memoria actuales no plantean?"

Tres candidatos, todos sujetos al mismo prerrequisito:

El decaimiento etiquetado por resultado (vrtti nirodha) requiere que el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) demuestre que el decaimiento uniforme cuesta calidad de recuperación en entradas con diferentes historiales de resultado. El desplazamiento hebbiano (vairagya) requiere que el mismo benchmark mida si las entradas fortalecidas desplazan alternativas más relevantes. Ambos se reducen a una tarea de ingeniería: **el esquema de traza debe capturar la precisión de la recuperación desglosada por propiedades de entrada** -- peso hebbiano, frecuencia de acceso, historial de resultados. Si los datos muestran un problema, las correcciones son sencillas. Si no lo hacen, nos saltamos la complejidad.

Pratyahara ya está implementado correctamente: el Memory Trait devuelve top-k, punto. El harness del benchmark captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero, sí.

Ninguno de estos requiere creer en chakras. Requieren tomar las discriminaciones en serio como heurísticas de ingeniería y medir si mejoran el recuerdo del agente en cargas de trabajo realistas. Tres candidatos están sobre la mesa. El benchmark decide.

## Lecturas adicionales

[El marco de ingeniería de harness de Böckeler](https://martinfowler.com/articles/harness-engineering.html) -- la taxonomía (guías, sensores, computacional, inferencial). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052) -- evidencia empírica de que los cambios en el harness producen brechas de rendimiento de 6x. [Optimización de Políticas Advaitica](https://www.researchgate.net/publication/389264820) -- la referencia más cercana que mapea el Vedanta a la arquitectura de agentes (conceptual, sin benchmarks aún). Yoga Sutras 1.2-1.16 -- la especificación de gestión de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb) -- donde se prueban las hipótesis. [Hrafn](https://github.com/5queezer/hrafn) -- el runtime que funciona en una Raspberry Pi de 10 $.

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un runtime de agente ligero en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*