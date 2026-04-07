---
title: "Patanjali tuvola Filtering Spec. Simplemente escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "La consolidación de la memoria empeoró la recuperación. Tres principios de diseño derivados de los marcos de referencia de memoria de agentes, y sus inesperadas analogías en la teoría de la atención yóguica."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "52c04189c355d547f341671c6308507b"
---
El sistema de consolidación de [MuninnDB](https://github.com/scrypster/muninndb) fusionó tres engramas duplicados con variantes de color exactamente como estaba diseñado (similitud de coseno >= 0,95). La recuperación empeoró. En una bóveda de 13 engramas, eliminar duplicados desplazó el ancla de normalización, empujando los resultados relevantes hacia abajo en la clasificación. La solución fue una cláusula de guarda: `MinDedupVaultSize` (por defecto 20), que omite la desduplicación de la Fase 2 en bóvedas pequeñas. [PR #359](https://github.com/scrypster/muninndb/pull/359) cerró el problema.

El fallo no fue un error en el algoritmo de desduplicación. Fue un fallo de *discernimiento*: una operación de consolidación válida aplicada en un contexto donde causaba daño. Cuándo consolidar, cuándo dejar tal como está, qué cuenta como ruido y qué como señal. Ese problema tiene una larga historia fuera de las ciencias de la computación. Encontré tres principios de diseño específicos en los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de ingeniería de harness](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunos de esos modelos generan hipótesis comprobables que la literatura actual sobre memoria de agentes no formula.**

## 1. No todo el ruido es igual (Vrtti Nirodha)

Antes del fallo de desduplicación, el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) se topó con un problema más básico. La puntuación ACT-R de MuninnDB ([issue #331](https://github.com/scrypster/muninndb/issues/331)) limitaba los engramas nuevos a raw=1.0, lo que hacía que todos los puntajes de recuperación fueran idénticos: 0,9000. El sistema no podía distinguir la señal del ruido. Cada entrada parecía igual de relevante. Tras la corrección ([PR #337](https://github.com/scrypster/muninndb/pull/337)), el rango de puntuación mejoró a 0,18-0,90 y la recuperación correcta en top-1 pasó a 5/5 consultas. El tratamiento uniforme de las entradas estaba destruyendo la calidad de la recuperación.

Meta-Harness confirmó el mismo patrón a una escala diferente. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) comparó tres niveles de acceso a la información para el optimizador del harness:

| Condición | Precisión Mediana | Mejor Precisión |
|---|---|---|
| Solo puntuaciones | 34,6 % | 41,3 % |
| Puntuaciones + resumen de LLM | 34,9 % | 38,7 % |
| Trazas completas sin procesar | 50,0 % | 56,7 % |

Los resúmenes generados por LLM funcionaron *peor* que solo las puntuaciones sin procesar (mejor precisión 38,7 % frente a 41,3 %). Las trazas completas sin procesar alcanzaron el 56,7 %. Los resúmenes colapsaron la señal diagnóstica junto con el ruido, destruyendo la información que el optimizador necesitaba. En la clasificación de texto, Meta-Harness alcanzó un 48,6 % frente al 40,9 % de ACE, utilizando 4 veces menos tokens de contexto. El movimiento ganador no fue más información. Fue una mejor *selección* de la información.

El principio de diseño: el tratamiento indiscriminado de las entradas destruye la calidad de la recuperación, ya sea que ese tratamiento consista en una puntuación uniforme, un resumen con pérdida o una desduplicación indiferenciada.

El Yoga Sutra 1.2 define el yoga como *chitta vrtti nirodha*, la cesación de las fluctuaciones en el campo mental. Patanjali no dice "elimina todo". Distingue las [*kleshas*](https://es.wikipedia.org/wiki/Klesha) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de las [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal. El error de saturación de puntuación fue el sistema fallando al hacer esa distinción. Cada vrtti parecía lo mismo.

La implicación de diseño para MuninnDB: los umbrales mínimos de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de curl pueden tener tasas de recuperación idénticas, pero un valor de retención radicalmente diferente. Podrías intentar clasificar las entradas de antemano como pramana o klesha (verificado frente a distorsionado), pero esa clasificación es en sí misma el problema difícil. Para la mayoría de las entradas, requiere juicio semántico, lo que significa un LLM en la ruta de decaimiento, lo que hace que la consolidación sea costosa y no determinista.

El camino más simple: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción posterior tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El umbral de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación tipo bandido (*bandit feedback*) sobre la recuperación, una idea bien establecida en la recuperación de información, aplicada aquí a la memoria persistente de agentes. No se necesita ontología. Ni LLM en el ciclo. No necesitas clasificar el vrtti de antemano. Observas su efecto y dejas que esa observación moldee la retención.

---

## 2. El refuerzo necesita un contrapeso (Samskara y Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) probó tres sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) contra líneas base RAG ingenuas que simplemente recuperan del contexto crudo. Ninguno de los sistemas avanzados superó consistentemente a las líneas base. El modo de fallo específico: estos sistemas no podían utilizar la memoria procedimental (registros de retroalimentación que indican el historial de rendimiento del sistema). Trataron todas las entradas como conocimiento declarativo, ignorando las señales que les habrían dicho qué recuerdos eran realmente útiles.

El benchmark #311 de MuninnDB produjo una versión local del mismo problema. La desduplicación de la Fase 2 identificó y fusionó correctamente tres duplicados con variantes de color (coseno >= 0,95). Pero en la bóveda de 13 engramas, eliminar esas entradas cambió el ancla de normalización. Un engrama no relacionado se convirtió en el punto de referencia, empujando los resultados relevantes hacia abajo en la clasificación. Una operación de consolidación válida, aplicada de manera uniforme, desplazó a la respuesta correcta.

La [taxonomía de ingeniería de harness](https://martinfowler.com/articles/harness-engineering.html) de Böckeler explica la incompatibilidad estructural. Ella distingue entre sensores computacionales (deterministas, baratos, se ejecutan en cada cambio) y sensores inferenciales (semánticos, costosos, probabilísticos). La desduplicación con coseno >= 0,95 es un proceso computacional. Detectar cuándo la desduplicación perjudica la recuperación requiere un juicio inferencial: "estas entradas son similares, pero ¿es *seguro* eliminarlas en esta bóveda?". Ningún umbral de similitud puede responder eso.

Los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras) nombran la misma dinámica. Los [Samskaras](https://es.wikipedia.org/wiki/Samskara) son impresiones latentes que moldean la percepción futura. Cada experiencia deja una traza, y las experiencias repetidas profundizan el surco. MuninnDB implementa esto directamente: las entradas que se coactivan fortalecen sus pesos de asociación. Los Sutras advierten que los samskaras se acumulan. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de liberar asociaciones fuertes), se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/Vasana), patrones de reacción automática que eluden la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

El mecanismo que falta es el *debilitamiento* hebbiano explícito: no solo un decaimiento pasivo, sino una corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. El [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ahora está completado ([PR #359](https://github.com/scrypster/muninndb/pull/359)), y los resultados iniciales ya forzaron una corrección (la guarda `MinDedupVaultSize`). La siguiente medición requiere el generador de bóvedas sintéticas con clases de engramas etiquetadas: Duplicado, Casi duplicado, Actualización temporal, Hecho único, Único de bajo acceso, Ámbito legal y Adyacente a legal. La métrica más precisa es la *tasa de desplazamiento*: ¿con qué frecuencia una entrada fuertemente asociada pero menos relevante desplaza a una entrada más relevante fuera del top-k? Esa es la medición directa de vasana: no solo "cosa incorrecta recuperada", sino "cosa correcta desplazada por la recuperación habitual". Si las entradas fortalecidas producen un desplazamiento medible, el vairagya como primitiva de diseño está empíricamente justificado. Si no lo hacen, el decaimiento pasivo actual es suficiente y nos saltamos la complejidad.

---

## 3. El poder de la exclusión deliberada (Pratyahara)

El resultado más sorprendente de Meta-Harness: los harnesses ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador en clasificación de texto usa TF-IDF con pares contrastivos y preparación de etiquetas (*label priming*) (48,6 % de precisión, 4 veces menos tokens que el subcampeón). El ganador en recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas. Cambiar el harness alrededor de un LLM fijo produce una brecha de rendimiento de 6x en el mismo benchmark.

Böckeler lo enmarca como "mantener la calidad a la izquierda": cuanto antes filtres, más barato y fiable será el resultado aguas abajo. Sus guías computacionales (linters, esquemas, reglas de CLAUDE.md) evitan que categorías enteras de información lleguen siquiera al modelo. La guarda `MinDedupVaultSize` de PR #359 es el mismo principio aplicado a la consolidación: en lugar de ejecutar la desduplicación en cada bóveda y esperar que el modelo maneje los resultados degradados, el sistema aprendió a *no aplicar* la desduplicación en bóvedas pequeñas. Exclusión de un proceso, no solo exclusión de datos.

La primera versión de esta publicación argumentaba que la interfaz de Memory Trait debería devolver metadatos de rechazo junto con los resultados. "Estas 3 entradas coincidieron, y estas 5 fueron excluidas debido a X". Más señal diagnóstica para el LLM. Decisiones mejor informadas. Suena razonable.

Es erróneo, y el principio yóguico del [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explica por qué. El pratyahara a menudo se traduce como "retirada de los sentidos", pero eso es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de arrastrar la mente hacia cada estímulo. Decides qué entra en la conciencia en lugar de reaccionar a todo lo que llega.

Si le dices al LLM "aquí hay 5 cosas que te estoy reteniendo deliberadamente", le has mostrado los objetos y añadido una prohibición. Eso no es retirada de los sentidos. Es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado conoce el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los harnesses simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Quizás lo necesito después de todo"). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente preciso, y los metadatos de exclusión son por definición no esenciales para la tarea en cuestión.

La separación correcta: **el agente ve solo los resultados top-k. El harness del benchmark lo ve todo.** La interfaz de Memory Trait se mantiene delgada: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué y qué hizo el agente a continuación. El benchmark consume los registros. El agente consume las entradas.

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

El agente nunca ve `excluded`. El harness del benchmark lo ve todo. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en la traza, y la próxima iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: el Memory Trait es una guía computacional (determina qué entra al contexto). El registro de traza es un sensor computacional (observa lo que sucedió). No se fusionan. El pratyahara no es un filtrado consciente en el sentido de que *el sistema filtrado sea consciente de la exclusión*. Es un filtrado consciente en el sentido de *que el diseñador sea consciente*, a través de los registros de traza, para que la próxima iteración del filtro mejore. La conciencia pertenece al ingeniero de harness que lee las trazas, no al agente que ejecuta las consultas.

---

## Donde la metáfora se rompe

Dos lugares.

Primero, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas del cuerpo védico: físico, energético, mental, discriminativo, bienaventuranza) implican una jerarquía de lo grosero a lo sutil, siendo lo sutil "superior". La ingeniería de harness no tiene tal orden de valor. Un linter determinista no es "inferior" a un LLM como juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "grosera", no trascenderla. Importar la jerarquía de Kosha al diseño de harness te llevaría a sobreinvertir en controles inferenciales y subinvertir en los deterministas. Lo opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuesta condicionada. La arquitectura de agentes apunta a una respuesta condicionada *efectiva*. Quieres que el agente desarrolle patrones confiables, no que los disuelva. El vairagya en el sentido yóguico significa dejar ir *todo* apego. En la ingeniería de harness significa dejar ir los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo conduciría a un agente que logra la iluminación negándose a recuperar cualquier cosa. Poco útil.

---

## Lo que esto no es

Esto no es "la sabiduría antigua valida mi arquitectura". La flecha causal va en la otra dirección: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación sobre memoria de agentes no es místico. Es ingeniería convergente sobre el mismo problema: ¿cómo gestiona un sistema acotado un flujo de información ilimitado?

Tampoco es el primer intento en esta intersección. La [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) de Ghosh y Ghosh y su sucesor Maṇḍūkya-APO mapean los estados de conciencia védicos (los cuatro estados del Māṇḍūkya Upaniṣad: vigilia, sueño, sueño profundo, trascendente) a un ciclo de consolidación de vigilia-sueño para agentes de RL, formalizado con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos artículos son marcos conceptuales explícitos sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre "marco propuesto" y "resultado medido" es donde muere la mayor parte del trabajo interdisciplinario. Las tres hipótesis a continuación están diseñadas para no morir allí.

La pregunta útil no es "¿es el yoga relevante para la IA?", sino "¿qué distinciones yóguicas específicas producen hipótesis comprobables que los sistemas de memoria actuales no formulan?"

El benchmark inicial ha respondido una pregunta. La desduplicación uniforme en bóvedas pequeñas es perjudicial, y la guarda `MinDedupVaultSize` ([PR #359](https://github.com/scrypster/muninndb/pull/359)) lo corrigió. Dos hipótesis permanecen abiertas. El decaimiento etiquetado por resultado (vrtti nirodha) requiere que el generador de bóvedas sintéticas demuestre que un decaimiento uniforme cuesta calidad de recuperación en entradas con diferentes historiales de resultado. El desplazamiento hebbiano (vairagya) requiere que el mismo generador mida si las entradas fortalecidas desplazan a alternativas más relevantes. Ambos se reducen a una tarea de ingeniería: **el esquema de traza debe capturar la precisión de recuperación desglosada por propiedades de la entrada**: peso hebbiano, frecuencia de acceso, historial de resultado. Si los datos muestran un problema, las correcciones son directas. Si no, nos saltamos la complejidad.

El pratyahara ya está implementado correctamente: el Memory Trait devuelve top-k, punto. El harness del benchmark captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero, sí.

Ninguno de estos requiere creer en chakras. Requieren tomar las distinciones en serio como heurísticas de ingeniería y medir si mejoran la recuperación del agente en cargas de trabajo realistas. El benchmark inicial forzó un cambio de diseño. El generador de bóvedas sintéticas decidirá el resto.

## Lectura adicional

El [marco de ingeniería de harness de Böckeler](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacional, inferencial). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios en el harness producen brechas de rendimiento de 6x. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), el arte previo más cercano que mapea el Vedanta a la arquitectura de agentes (conceptual, sin benchmarks aún). Yoga Sutras 1.2-1.16, el modelo de filtrado de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb), donde se prueban las hipótesis. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), los resultados iniciales. [PR #337](https://github.com/scrypster/muninndb/pull/337), la corrección de saturación de puntuación. [PR #359](https://github.com/scrypster/muninndb/pull/359), la guarda de desduplicación. [Hrafn](https://github.com/5queezer/hrafn), el runtime que se ejecuta en una Raspberry Pi de 10 $.

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un runtime ligero de agentes en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*La imagen de portada de esta publicación fue generada por IA.*