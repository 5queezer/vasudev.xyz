---
title: "Patanjali tenía la especificación de filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Tres principios yóguicos que generan hipótesis comprobables para el diseño de entornos de evaluación para agentes. Filtrado de atención ancestral, benchmarks modernos."
translationHash: "cac18e4f15e90d5c6c6571b026cf36dc"
---
Pasé la semana pasada leyendo dos artículos académicos y un [artículo de Fowler](https://martinfowler.com/articles/harness-engineering.html) sobre ingeniería de *harness* (el código que envuelve un LLM y determina qué se almacena, recupera y se presenta al modelo). A mitad de la taxonomía de guías y sensores de Birgitta Böckeler, me di cuenta de que ya había visto esta arquitectura antes. No en una base de código. En los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras_de_Patanjali).

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunos de esos modelos generan hipótesis comprobables que la literatura actual sobre memoria para agentes no plantea.**

Esto suena al tipo de afirmación que te haría ser objeto de burla en Hacker News. Así que permítanme respaldarla con tres mapeos específicos donde los principios yóguicos generan hipótesis que se alinean con, y no solo riman con, los resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de ingeniería de *harness* de Böckeler](https://martinfowler.com/articles/harness-engineering.html).

## 1. Vrtti Nirodha: No todo el ruido es igual

Yoga Sutras 1.2 define el yoga como *chitta vrtti nirodha*, la cesación de las fluctuaciones en el campo mental. Patanjali no dice "borra todo". Distingue entre los [*kleshas*](https://es.wikipedia.org/wiki/Klesha) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) y los [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal.

La publicación sobre ingeniería de *harness* de OpenAI denomina a esta misma operación "Gestión de entropía": agentes de limpieza periódica que combaten la degradación de la base de código. [Dream Engine](/blog/why-ai-agents-need-sleep/), el sistema de consolidación de MuninnDB, lo hace con umbrales de similitud divididos: 0.95 para la deduplicación normal y 0.85 durante el modo sueño. Pero ninguno de los dos sistemas se pregunta *qué tipo* de redundancia está eliminando.

Meta-Harness demostró que esto importa. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) mostró que los resúmenes de trazas de ejecución generados por LLM funcionaron *peor* que solo las puntuaciones brutas (38.7% vs 41.3%). Las trazas brutas completas obtuvieron 56.7%. Los resúmenes fueron un *vrtti nirodha* fallido: colapsaron el *pramana* (señal de diagnóstico) junto con el *klesha* (ruido), destruyendo la información que el optimizador necesitaba.

La implicación de diseño para [MuninnDB](https://github.com/scrypster/muninndb): los pisos de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de `curl` podrían tener tasas de recuperación idénticas, pero un valor de retención radicalmente diferente. Los niveles de confianza de la bóveda ya ordenan por sensibilidad del contenido (legal, trabajo, personal). Pero hay una trampa en el siguiente paso obvio.

Podrías intentar clasificar las entradas de antemano como *pramana* o *klesha* (verificado vs. distorsionado), pero esa clasificación es en sí misma el problema difícil. Para casos triviales (HTTP 200 vs. 401), es mecánico. Para la mayoría de las entradas, requiere juicio semántico, lo que significa un LLM en la ruta de decaimiento, lo que hace que la consolidación sea costosa y no determinista. Patanjali tuvo una vida de práctica para refinar su discernimiento. Dream Engine se ejecuta con un disparador *cron*.

El camino más simple: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción posterior tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El piso de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación de bandido (*bandit feedback*) en la recuperación, una idea bien establecida en recuperación de información, aplicada aquí a la memoria persistente de agentes. No se necesita ontología. No se requiere un LLM en el bucle. En términos yóguicos: no necesitas clasificar el *vrtti* de antemano. Observas su efecto y dejas que esa observación modele la retención.

---

## 2. Samskara y Vairagya: El refuerzo necesita un contrapeso

Los [Samskaras](https://es.wikipedia.org/wiki/Samskara) son impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundizan el surco. Esto es aprendizaje hebbiano ("las neuronas que se activan juntas, se conectan"), y MuninnDB lo implementa directamente: las entradas que se coactivan fortalecen sus pesos de asociación.

Los Yoga Sutras advierten que los samskaras se acumulan. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de liberar asociaciones fuertes), se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/Vasana), patrones de reacción automática que omiten la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

[MemoryBench](https://arxiv.org/abs/2510.17281) proporciona evidencia indirecta. Su hallazgo central: los sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) no logran superar consistentemente a las líneas base RAG ingenuas que simplemente recuperan del contexto crudo. El artículo no aísla el refuerzo hebbiano como la causa, y el fallo podría provenir de cualquier parte de la tubería de consolidación. Un mecanismo posible: las asociaciones reforzadas desplazan a alternativas menos activadas pero más relevantes, el efecto *vasana*. Pero esto es conjetura, no un resultado demostrado. Necesita medición directa, y por eso existe el benchmark #311.

La taxonomía de Böckeler proporciona la perspectiva estructural. Ella distingue sensores computacionales (deterministas, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). El refuerzo hebbiano es un proceso computacional que se ejecuta automáticamente en cada coactivación. Pero la detección de *vasana* requiere juicio inferencial: "esta asociación es fuerte, pero ¿es *correcta* para esta consulta?". Ningún contador de frecuencia puede responder eso.

El mecanismo faltante en MuninnDB es el *debilitamiento* hebbiano explícito: no solo un decaimiento pasivo, sino una corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. Cuando un agente actúa sobre una entrada recuperada por hebbiano y la acción falla, el peso de la asociación debería disminuir, en lugar de simplemente esperar a que Ebbinghaus lo erosione con el tiempo. Pero: esto es una nueva ruta de escritura en Dream Engine, y el principio de "benchmark primero" se mantiene. Ninguna función se lanza sin evidencia de que el comportamiento actual cause daño.

Hipótesis comprobable para el [benchmark #311](https://github.com/scrypster/muninndb/issues/311), el requisito previo abierto. Ninguna función se lanza antes de que existan los datos. Medir las tasas de recuperación de falsos positivos para entradas reforzadas hebbianamente frente a no reforzadas. Pero no se detiene en el acierto/fallo binario. La métrica más precisa es la *tasa de desplazamiento*: ¿con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja a una entrada más relevante fuera del top-k? Esa es la medición directa de *vasana*: no solo "recuperar lo incorrecto", sino "lo correcto es desplazado por la recuperación habitual". Si las entradas reforzadas producen un desplazamiento medible, el *vairagya* como primitivo de diseño está empíricamente justificado. Si no lo hacen, el decaimiento pasivo actual es suficiente y nos saltamos la complejidad.

---

## 3. Pratyahara: El poder de la exclusión deliberada

El [Pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) se suele traducir como "retraimiento de los sentidos", pero eso es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de arrastrar la mente hacia cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Este es el problema central de la ingeniería de contexto, y el resultado más sorprendente de Meta-Harness lo confirma. Los *harnesses* ganadores no son los que saturan la ventana de contexto con todo lo disponible. El ganador en clasificación de texto usa TF-IDF con pares contrastivos y *label priming*. El ganador en recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas.

Böckeler lo enmarca como "mantener la calidad a la izquierda" (*keep quality left*): cuanto antes filtres, más barato y fiable será el resultado posterior. Sus guías computacionales (*linters*, esquemas, reglas CLAUDE.md) son mecanismos de *pratyahara*: impiden que categorías enteras de información lleguen siquiera al modelo.

La primera versión de este artículo sostenía que la interfaz Memory Trait debería devolver metadatos de rechazo junto con los resultados. "Estas 3 entradas coincidieron, y estas 5 fueron excluidas debido a X". Más señal de diagnóstico para el LLM. Decisiones mejor informadas. Suena razonable.

Es incorrecto, y el principio de *Pratyahara* mismo explica por qué.

*Pratyahara* significa que los sentidos *dejan de arrastrar la mente hacia sus objetos*. Si le dices al LLM "aquí hay 5 cosas que te estoy reteniendo deliberadamente", le has mostrado los objetos y has añadido una prohibición. Eso no es retraimiento de los sentidos. Es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado conoce el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen *tokens* (contradiciendo el hallazgo de Meta-Harness de que los *harnesses* simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Quizás lo necesito después de todo"). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente preciso, y los metadatos de exclusión son, por definición, no esenciales para la tarea en cuestión.

La separación correcta: **el agente ve solo los resultados top-k. El *harness* del benchmark ve todo.** La interfaz Memory Trait se mantiene delgada: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué y qué hizo el agente a continuación. El *benchmark* consume los registros. El agente consume las entradas.

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

El agente nunca ve `excluded`. El *harness* del *benchmark* ve todo. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en la traza, y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: Memory Trait es una guía computacional (determina qué entra en el contexto). El registro de trazas es un sensor computacional (observa lo que sucedió). No se fusionan. *Pratyahara* no es un filtrado consciente en el sentido de que *el sistema filtrado sea consciente de la exclusión*. Es un filtrado consciente en el sentido de que *el diseñador es consciente*, a través de los registros de trazas, para que la siguiente iteración del filtro mejore. La conciencia pertenece al ingeniero de *harness* que lee las trazas, no al agente que ejecuta las consultas.

---

## Donde la metáfora se rompe

En dos lugares.

Primero, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas del cuerpo védico: física, energética, mental, discriminativa, dicha) implican una jerarquía de lo burdo a lo sutil, siendo lo sutil "superior". La ingeniería de *harness* no tiene tal orden de valor. Un *linter* determinista no es "inferior" a un LLM como juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos como para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "burda", no trascenderla. Importar la jerarquía Kosha al diseño de *harness* te llevaría a sobreinvertir en controles inferenciales y subinvertir en deterministas. Lo opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuesta condicionada. La arquitectura de agentes apunta a una respuesta condicionada *eficaz*. Quieres que el agente desarrolle patrones fiables, no que los disuelva. *Vairagya* en el sentido yóguico significa soltar *todo* apego. En la ingeniería de *harness* significa soltar los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación negándose a recuperar cualquier cosa. Poco útil.

---

## Qué no es esto

Esto no es "la sabiduría ancestral valida mi arquitectura". La flecha causal va en la otra dirección: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación sobre memoria de agentes no es místico. Es ingeniería convergente sobre el mismo problema: ¿cómo gestiona un sistema acotado un flujo de información no acotado?

Tampoco es el primer intento en esta intersección. La [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) de Ghosh y Ghosh y su sucesora Maṇḍūkya-APO mapean estados de conciencia védicos (los cuatro estados de la Upanishad Māṇḍūkya: vigilia, sueño, sueño profundo, trascendente) a un ciclo de consolidación vigilia-sueño para agentes de RL, formalizados con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos artículos son explícitamente marcos conceptuales sin validación empírica. Los *benchmarks* que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre "marco propuesto" y "resultado medido" es donde muere la mayor parte del trabajo interdisciplinario. Las tres hipótesis a continuación están diseñadas para no morir allí.

La pregunta útil no es "¿es el yoga relevante para la IA?", sino "¿qué discriminaciones yóguicas específicas producen hipótesis comprobables que los sistemas de memoria actuales no plantean?".

Tres candidatos, todos sujetos al mismo requisito previo:

El decaimiento etiquetado por resultado (*vrtti nirodha*) requiere que el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) demuestre que el decaimiento uniforme perjudica la calidad de recuperación en entradas con diferentes historiales de resultados. El desplazamiento hebbiano (*vairagya*) requiere que el mismo *benchmark* mida si las entradas reforzadas desplazan a alternativas más relevantes. Ambos se reducen a una tarea de ingeniería: **el esquema de trazas debe capturar la precisión de recuperación desglosada por propiedades de la entrada**: peso hebbiano, frecuencia de acceso, historial de resultados. Si los datos muestran un problema, las soluciones son directas. Si no, nos saltamos la complejidad.

*Pratyahara* ya está implementado correctamente: Memory Trait devuelve el top-k, punto. El *harness* del *benchmark* captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de estos requiere creer en chakras. Requieren tomar las discriminaciones en serio como heurísticas de ingeniería y medir si mejoran el *recall* del agente en cargas de trabajo realistas. Tres candidatos están sobre la mesa. El *benchmark* decide.

## Lectura adicional

[El marco de ingeniería de *harness* de Böckeler](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios en el *harness* producen brechas de rendimiento de 6x. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), el antecedente más cercano que mapea el Vedanta a la arquitectura de agentes (conceptual, sin *benchmarks* aún). Yoga Sutras 1.2-1.16, el modelo de filtrado de atención que antecede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb), donde se ponen a prueba las hipótesis. [Hrafn](https://github.com/5queezer/hrafn), el entorno de ejecución que funciona en una Raspberry Pi de 10 $.

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un entorno de ejecución ligero para agentes en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*