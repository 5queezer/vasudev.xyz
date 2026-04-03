---
title: "Patanjali tenía la especificación de filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Tres principios yóguicos que predicen resultados empíricos en investigación sobre agent harness. Manual de operaciones de 2000 años de antigüedad, benchmarks modernos."
translationHash: "e471215884a5b95b08a6e2f6fb54d144"
---
La semana pasada la pasé leyendo dos artículos y un [artículo de Fowler](https://martinfowler.com/articles/harness-engineering.html) sobre ingeniería de *harness* -- el código que envuelve a un LLM y determina qué se almacena, recupera y presenta al modelo. A mitad de la taxonomía de guías y sensores de Birgitta Böckeler, me di cuenta de que ya había visto esta arquitectura antes. No en una base de código. En los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutra).

**Las tradiciones contemplativas resolvieron la ingeniería de contexto hace 2000 años. La comunidad de agentes está redescubriendo sus respuestas, un estudio de ablación a la vez.**

Eso suena a ese tipo de afirmaciones por las que te ridiculizarían en Hacker News. Así que déjenme respaldarlo con tres asignaciones específicas donde los principios yóguicos predicen -- no solo coinciden casualmente -- los resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de ingeniería de *harness*](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

## 1. Vrtti Nirodha: No todo el ruido es igual

Los Yoga Sutras 1.2 definen el yoga como *chitta vrtti nirodha* -- la cesación de las fluctuaciones en el campo mental. Patanjali no dice "borra todo". Él distingue los [*kleshas*](https://es.wikipedia.org/wiki/Klesha_(hinduismo)) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de los [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal.

La publicación de OpenAI sobre ingeniería de *harness* llama a la misma operación "Gestión de entropía" -- agentes de limpieza periódica que combaten el deterioro de la base de código. [Dream Engine](/blog/why-ai-agents-need-sleep/), el sistema de consolidación de MuninnDB, lo hace con umbrales de similitud divididos: 0,95 para la desduplicación normal, 0,85 durante el modo sueño. Pero ninguno de los sistemas se pregunta *qué tipo* de redundancia está eliminando.

Meta-Harness demostró que esto importa. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) mostró que los resúmenes generados por LLM de los trazos de ejecución funcionaron *peor* que las puntuaciones crudas por sí solas -- 38,7 % frente al 41,3 %. Los trazos crudos completos obtuvieron un 56,7 %. Los resúmenes fueron un *vrtti nirodha* fallido: colapsaron el *pramana* (señal diagnóstica) junto con el *klesha* (ruido), destruyendo la información que el optimizador necesitaba.

La implicación de diseño para [MuninnDB](https://github.com/scrypster/muninndb): los umbrales mínimos de deterioro deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de `curl` podrían tener tasas de recuperación idénticas pero un valor de retención radicalmente diferente. Los niveles de confianza de la bóveda ya ordenan por sensibilidad del contenido (legal, trabajo, personal). Pero hay una trampa en el siguiente paso obvio.

Podrías intentar clasificar las entradas de antemano como *pramana* o *klesha* -- verificadas frente a distorsionadas -- pero esa clasificación es en sí misma el problema difícil. Para casos triviales (HTTP 200 frente a 401), es mecánico. Para la mayoría de las entradas, requiere juicio semántico, lo que implica un LLM en la ruta de deterioro, lo que hace que la consolidación sea costosa y no determinista. Patanjali tuvo toda una vida de práctica para refinar su discernimiento. Dream Engine se ejecuta con un disparador *cron*.

El camino más sencillo: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción posterior tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El umbral de deterioro se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación tipo *bandit* sobre la recuperación -- una idea bien establecida en la recuperación de información, aplicada aquí a la memoria persistente del agente. Sin necesidad de ontología. Sin LLM en el ciclo. En términos yóguicos: no necesitas clasificar el *vrtti* de antemano -- observas su efecto y dejas que esa observación moldee la retención.

---

## 2. Samskara y Vairagya: El refuerzo necesita un contrapeso

El concepto yóguico de [samskaras](https://es.wikipedia.org/wiki/Samskara) describe impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundizan el surco. Esto es aprendizaje hebbiano -- "las neuronas que se activan juntas, se conectan juntas" -- y MuninnDB lo implementa directamente: las entradas que se coactivan fortalecen sus pesos de asociación.

Los Yoga Sutras advierten que los *samskaras* se acumulan. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de soltar asociaciones fuertes), estos se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/Vasana) -- patrones de reacción automática que evaden la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

[MemoryBench](https://arxiv.org/abs/2510.17281) proporciona evidencia indirecta. Su hallazgo central: los sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) no logran superar consistentemente a las líneas base ingenuas de RAG que simplemente recuperan del contexto crudo. El artículo no aísla el refuerzo hebbiano como la causa, pero el patrón encaja: los sistemas que procesan, consolidan y fortalecen memorias funcionan *peor* que los sistemas que simplemente almacenan y recuperan todo sin modificar. Algo en la tubería de consolidación está destruyendo la señal. La hipótesis del *vasana* -- que las asociaciones reforzadas desplazan alternativas menos activadas pero más relevantes -- es una explicación. Necesita medición directa, y por eso existe el benchmark #311.

La taxonomía de Böckeler proporciona la visión estructural. Ella distingue sensores computacionales (deterministas, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). El refuerzo hebbiano es un proceso computacional -- se ejecuta automáticamente en cada coactivación. Pero la detección de *vasana* requiere juicio inferencial: "esta asociación es fuerte, pero ¿es *correcta* para esta consulta?". Ningún contador de frecuencia puede responder eso.

El mecanismo que falta en MuninnDB es el *debilitamiento* hebbiano explícito -- no solo deterioro pasivo, sino corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. Cuando un agente actúa sobre una entrada recuperada hebbianamente y la acción falla, el peso de asociación debe disminuir, no simplemente esperar a que Ebbinghaus lo erosione con el tiempo. Pero: esta es una nueva ruta de escritura en Dream Engine, y el principio *benchmark-first* se mantiene. Ninguna característica se lanza sin evidencia de que el comportamiento actual cause daño.

Hipótesis comprobable para el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) -- el requisito abierto; ninguna característica se lanza antes de que existan los datos. Medir las tasas de recuperación de falsos positivos para entradas fortalecidas hebbianamente frente a las no fortalecidas. Pero no te detengas en el éxito/fracaso binario. La métrica más aguda es la *tasa de desplazamiento* -- con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja a una entrada más relevante fuera del top-k. Esa es la medición directa del *vasana*: no solo "se recuperó algo incorrecto", sino "lo correcto fue desplazado por la recuperación habitual". Si las entradas fortalecidas producen un desplazamiento medible, el *vairagya* como primitiva de diseño está empíricamente justificado. Si no, el deterioro pasivo actual es suficiente y nos saltamos la complejidad.

---

## 3. Pratyahara: El poder de la exclusión deliberada

El concepto de [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) suele traducirse como "retiro de los sentidos", pero eso es engañoso. No es ceguera -- es *atención selectiva*. Los sentidos siguen funcionando, pero dejan de arrastrar la mente hacia cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Este es el problema central de la ingeniería de contexto, y el resultado más sorprendente de Meta-Harness lo confirma. Los *harnesses* ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador en clasificación de texto usa TF-IDF con pares contrastivos y primado de etiquetas. El ganador en recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas.

Böckeler lo enmarca como "mantener la calidad a la izquierda" -- cuanto antes filtres, más barato y fiable será el resultado descendente. Sus guías computacionales (linter, esquemas, reglas de CLAUDE.md) son mecanismos de *pratyahara*: evitan que categorías enteras de información lleguen siquiera al modelo.

La primera versión de esta publicación sostenía que la interfaz del *trait* Memory debería devolver metadatos de rechazo junto con los resultados -- "estas 3 entradas coincidieron, y estas 5 fueron excluidas por X". Más señal diagnóstica para el LLM. Decisiones mejor informadas. Suena razonable.

Está mal, y el principio de *Pratyahara* mismo explica por qué.

*Pratyahara* significa que los sentidos *dejan de arrastrar la mente hacia sus objetos*. Si le dices al LLM "aquí hay 5 cosas que te estoy reteniendo deliberadamente", le muestras los objetos y añades una prohibición. Eso no es retiro de los sentidos -- es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado sabe el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los *harnesses* simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Tal vez lo necesite después de todo"). Los sistemas RAG que incluyen contexto negativo empíricamente rinden menos que los que simplemente entregan el top-k.

La separación correcta: **el agente ve solo los resultados top-k. El benchmark harness ve todo.** La interfaz del *trait* Memory se mantiene delgada -- `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué y qué hizo el agente después. El benchmark consume los registros. El agente consume las entradas.

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

El agente nunca ve `excluded`. El benchmark harness lo ve todo. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en el trazo -- y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: el *trait* Memory es una guía computacional (determina qué entra en el contexto). El registro de trazo es un sensor computacional (observa lo que sucedió). No se fusionan. *Pratyahara* no es filtrado consciente en el sentido de que *el sistema filtrado sea consciente de la exclusión*. Es filtrado consciente en el sentido de que *el diseñador es consciente*, a través de los registros de trazo, para que la próxima iteración del filtro mejore. La conciencia pertenece al ingeniero de *harness* que lee los trazos, no al agente que ejecuta las consultas.

---

## Donde la metáfora se rompe

En dos lugares.

Primero, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas del cuerpo védico -- físico, energético, mental, discriminativo, dicha) implican una jerarquía de lo denso a lo sutil, siendo lo sutil "superior". La ingeniería de *harness* no tiene tal orden de valor. Un linter determinista no es "inferior" a un LLM como juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos como para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "densa", no trascenderla. Importar la jerarquía de Koshas al diseño de *harness* te llevaría a sobreinvertir en controles inferenciales y subinvertir en los deterministas -- lo opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuesta condicionada. La arquitectura de agentes apunta a una respuesta condicionada *efectiva* -- quieres que el agente desarrolle patrones fiables, no que los disuelva. *Vairagya* en el sentido yóguico significa soltar *todo* apego; en ingeniería de *harness* significa soltar los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación negándose a recuperar cualquier cosa. Poco útil.

---

## Qué no es esto

Esto no es "la sabiduría antigua valida mi arquitectura". La flecha causal va en la dirección opuesta: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación de memoria de agentes no es místico -- es ingeniería convergente en el mismo problema: ¿cómo gestiona un sistema acotado un flujo de información ilimitado?

Tres candidatos están sobre la mesa. El deterioro etiquetado por resultado (*vrtti nirodha*) requiere que el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) demuestre que el deterioro uniforme cuesta calidad de recuperación en entradas con diferentes historiales de resultado. El desplazamiento hebbiano (*vairagya*) requiere el mismo benchmark para medir si las entradas fortalecidas desplazan alternativas más relevantes. Ambos se reducen a una tarea de ingeniería: **el esquema de trazo debe capturar la precisión de recuperación desglosada por propiedades de entrada** -- peso hebbiano, frecuencia de acceso, historial de resultado. Si los datos muestran un problema, las soluciones son sencillas. Si no, nos saltamos la complejidad.

*Pratyahara* ya está implementado correctamente: el *trait* Memory devuelve top-k, y punto. El benchmark harness captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero, sí.

Ninguno de estos requiere creer en chakras. Requiere tomar las distinciones en serio como heurísticas de ingeniería y medir si mejoran la recuperación del agente en cargas de trabajo realistas. El benchmark decide.

## Lectura adicional

[El marco de ingeniería de *harness* de Böckeler](https://martinfowler.com/articles/harness-engineering.html) -- la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052) -- evidencia empírica de que los cambios en el *harness* producen brechas de rendimiento de 6x. Yoga Sutras 1.2-1.16 -- la especificación de gestión de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb) -- donde se prueban las hipótesis. [Hrafn](https://github.com/5queezer/hrafn) -- el tiempo de ejecución que funciona en una Raspberry Pi de 10 $.

---

*Christian Pojoni construye [Hrafn](https://github.com/5queezer/hrafn), un tiempo de ejecución de agentes ligero en Rust. Publicación anterior: [Por qué los agentes de IA necesitan dormir](/blog/why-ai-agents-need-sleep/).*