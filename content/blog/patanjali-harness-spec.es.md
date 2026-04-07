---
title: "Patanjali tenía la especificación de filtrado. Solo escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "Laconsolidación de la memoria empeoró la recuperación. Tres principios de diseño de la memoria de agentes y sus inesperadas paralelos en la teoría de la atención yóguica."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "30e2a9d5fef0596e41ce2cd404ee0815"
---
El sistema de consolidación de [MuninnDB](https://github.com/scrypster/muninndb) fusionó tres engramas duplicados con variantes de color exactamente como estaba diseñado (similitud del coseno >= 0.95). La recuperación empeoró. En una bóveda de 13 engramas, eliminar duplicados desplazó el ancla de normalización, empujando los resultados relevantes hacia abajo en el ranking. La solución fue una cláusula de guardia: `MinDedupVaultSize` (predeterminado 20), que omite la deduplicación de la Fase 2 en bóvedas pequeñas. [PR #359](https://github.com/scrypster/muninndb/pull/359) cerró el problema.

El fallo no fue un error en el algoritmo de deduplicación. Fue un fallo de *discernimiento*: una operación de consolidación válida aplicada en un contexto donde causaba daño. Cuándo consolidar, cuándo dejar las cosas como están, qué cuenta como ruido frente a señal. Ese problema tiene una larga historia fuera de la informática. Encontré tres principios de diseño específicos en los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de ingeniería de arneses](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunos de esos modelos generan hipótesis comprobables que la literatura actual sobre memoria de agentes no formula.**

## 1. No todo el ruido es igual (Vrtti Nirodha)

Antes del fallo de deduplicación, el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) se topó con un problema más básico. El sistema de puntuación ACT-R de MuninnDB ([issue #331](https://github.com/scrypster/muninndb/issues/331)) fijaba los engramas nuevos en raw=1.0, haciendo que todas las puntuaciones de recuperación fueran idénticas a 0.9000. El sistema no podía distinguir la señal del ruido. Cada entrada parecía igualmente relevante. Tras la corrección ([PR #337](https://github.com/scrypster/muninndb/pull/337)), el rango de puntuaciones mejoró a 0.18-0.90 y la recuperación correcta del top-1 pasó a 5/5 consultas. El tratamiento uniforme de las entradas había estado destruyendo la calidad de la recuperación.

Meta-Harness confirmó el mismo patrón a una escala diferente. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) comparó tres niveles de acceso a la información para el optimizador del arnés:

| Condición | Precisión mediana | Mejor precisión |
|---|---|---|
| Solo puntuaciones | 34.6% | 41.3% |
| Puntuaciones + resumen de LLM | 34.9% | 38.7% |
| Trazas brutas completas | 50.0% | 56.7% |

Los resúmenes generados por LLM rindieron *peor* que las puntuaciones brutas solas (mejor precisión 38.7 % vs 41.3 %). Las trazas brutas completas alcanzaron un 56.7 %. Los resúmenes colapsaban la señal de diagnóstico junto con el ruido, destruyendo la información que el optimizador necesitaba. En clasificación de texto, Meta-Harness alcanzó un 48.6 % frente al 40.9 % de ACE utilizando 4 veces menos tokens de contexto. La jugada ganadora no fue más información. Fue una mejor *selección* de la información.

El principio de diseño: el tratamiento indiscriminado de las entradas destruye la calidad de la recuperación, ya sea que ese tratamiento consista en puntuación uniforme, resumen con pérdida o deduplicación indiferenciada.

El Yoga Sutra 1.2 define el yoga como *chitta vrtti nirodha*, el cese de las fluctuaciones en el campo mental. Patanjali no dice "elimina todo". Él distingue los [*kleshas*](https://es.wikipedia.org/wiki/Klesha_(Hinduism)) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de los [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal. El error de saturación de puntuaciones fue el sistema fallando en hacer esa distinción. Cada *vrtti* parecía igual.

La implicación de diseño para MuninnDB: los umbrales de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de `curl` podrían tener tasas de recuperación idénticas, pero un valor de retención radicalmente diferente. Podrías intentar clasificar las entradas de antemano como *pramana* o *klesha* (verificadas vs. distorsionadas), pero esa clasificación es en sí misma el problema difícil. Para la mayoría de las entradas, requiere juicio semántico, lo que significa un LLM en la ruta de decaimiento, lo que hace que la consolidación sea costosa y no determinista.

El camino más simple: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción subsecuente tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El umbral de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación tipo bandido (*bandit feedback*) sobre la recuperación, una idea bien establecida en la recuperación de información, aplicada aquí a la memoria persistente de agentes. No se necesita ontología. Ni un LLM en el bucle. No necesitas clasificar el *vrtti* con antelación. Observas su efecto y dejas que esa observación moldee la retención.

---

## 2. El refuerzo necesita un contrapeso (Samskara y Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) probó tres sistemas de memoria de vanguardia (A-Mem, Mem0, MemoryOS) frente a líneas base de RAG ingenuas que simplemente recuperan del contexto bruto. Ninguno de los sistemas avanzados superó consistentemente a las líneas base. El modo de fallo específico: estos sistemas no podían utilizar la memoria procedimental (registros de retroalimentación que indican el historial de rendimiento del sistema). Trataban todas las entradas como conocimiento declarativo, ignorando las señales que les habrían dicho qué memorias eran realmente útiles.

El benchmark #311 de MuninnDB produjo una versión local del mismo problema. La deduplicación de la Fase 2 identificó y fusionó correctamente tres duplicados con variante de color (coseno >= 0.95). Pero en la bóveda de 13 engramas, eliminar esas entradas cambió el ancla de normalización. Un engrama no relacionado se convirtió en el punto de referencia, empujando los resultados relevantes hacia abajo en el ranking. Una operación de consolidación válida, aplicada de manera uniforme, desplazó a la respuesta correcta.

La [taxonomía de ingeniería de arneses](https://martinfowler.com/articles/harness-engineering.html) de Böckeler explica la incompatibilidad estructural. Ella distingue entre sensores computacionales (deterministas, baratos, se ejecutan con cada cambio) y sensores inferenciales (semánticos, costosos, probabilísticos). La deduplicación con coseno >= 0.95 es un proceso computacional. Detectar cuándo la deduplicación perjudica la recuperación requiere juicio inferencial: "estas entradas son similares, pero ¿es *seguro* eliminarlas en esta bóveda?". Ningún umbral de similitud puede responder eso.

Los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) nombran la misma dinámica. Los [Samskaras](https://es.wikipedia.org/wiki/Samskara_(Indian_philosophy)) son impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundizan el surco. MuninnDB implementa esto directamente: las entradas que se coactivan fortalecen sus pesos de asociación. Los Sutras advierten que los samskaras se acumulan. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de liberar asociaciones fuertes), se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/Vasana), patrones de reacción automática que omiten la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

El mecanismo que falta es el *debilitamiento* hebbiano explícito: no solo decaimiento pasivo, sino corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. El [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ya está completado ([PR #359](https://github.com/scrypster/muninndb/pull/359)), y los resultados iniciales ya forzaron una corrección (la cláusula de guardia `MinDedupVaultSize`). La siguiente medición requiere el generador sintético de bóvedas con clases de engramas etiquetadas: Duplicado, Casi duplicado, Actualización temporal, Hecho único, Único de bajo acceso, Ámbito legal y Adyacente a legal. La métrica más precisa es la *tasa de desplazamiento*: ¿con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja a una entrada más relevante fuera del top-k? Esa es la medición directa de vasana: no solo "se recuperó algo incorrecto", sino "lo correcto fue desplazado por una recuperación habitual". Si las entradas fortalecidas producen un desplazamiento medible, el vairagya como primitiva de diseño está empíricamente justificado. Si no lo hacen, el decaimiento pasivo actual es suficiente y nos saltamos la complejidad.

---

## 3. El poder de la exclusión deliberada (Pratyahara)

El resultado más sorprendente de Meta-Harness: los arneses ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador de clasificación de texto usa TF-IDF con pares contrastivos y priming de etiquetas (48.6 % de precisión, 4 veces menos tokens que el segundo lugar). El ganador de recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas. Cambiar el arnés alrededor de un LLM fijo produce una brecha de rendimiento de 6x en el mismo benchmark.

Böckeler lo encuadra como "mantener la calidad a la izquierda": cuanto antes filtres, más barato y fiable será el resultado posterior. Sus guías computacionales (linters, esquemas, reglas de CLAUDE.md) impiden que categorías enteras de información lleguen al modelo en absoluto. La cláusula de guardia `MinDedupVaultSize` del PR #359 es el mismo principio aplicado a la consolidación: en lugar de ejecutar la deduplicación en cada bóveda y esperar que el modelo maneje los resultados degradados, el sistema aprendió a *no aplicar* la deduplicación en bóvedas pequeñas. Exclusión de un proceso, no solo exclusión de datos.

La primera versión de este post argumentaba que la interfaz Memory Trait debería devolver metadatos de rechazo junto con los resultados. "Estas 3 entradas coincidieron, y estas 5 fueron excluidas debido a X". Más señal de diagnóstico para el LLM. Decisiones mejor informadas. Suena razonable.

Está equivocado, y el principio yóguico de [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explica por qué. Pratyahara a menudo se traduce como "retiro de los sentidos", pero eso es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de arrastrar a la mente hacia cada estímulo. Tú decides qué entra en la consciencia en lugar de reaccionar a lo que llega.

Si le dices al LLM "aquí hay 5 cosas que te estoy ocultando deliberadamente", le has mostrado los objetos y añadido una prohibición. Eso no es retiro de los sentidos. Eso es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado conoce el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los arneses simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Quizá lo necesito después de todo"). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente preciso, y los metadatos de exclusión son, por definición, no esenciales para la tarea en cuestión.

La separación correcta: **el agente solo ve los resultados top-k. El arnés del benchmark ve todo.** La interfaz Memory Trait se mantiene delgada: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra la decisión completa internamente: qué se devolvió, qué se excluyó, por qué y qué hizo el agente a continuación. El benchmark consume los registros. El agente consume las entradas.

Una entrada de traza se ve así:

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

El agente nunca ve `excluded`. El arnés del benchmark ve todo eso. Si `entry_089` era la respuesta correcta y fue filtrada porque su peso hebbiano era bajo, eso aparece en la traza, y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: el Memory Trait es una guía computacional (determina qué entra en el contexto). El registro de traza es un sensor computacional (observa lo que sucedió). No se fusionan. Pratyahara no es un filtrado consciente en el sentido de que *el sistema filtrado sea consciente de la exclusión*. Es un filtrado consciente en el sentido de que *el diseñador sea consciente*, a través de los registros de traza, para que la siguiente iteración del filtro mejore. La consciencia pertenece al ingeniero de arneses que lee las trazas, no al agente que ejecuta las consultas.

---

## Dónde se rompe la metáfora

En dos lugares.

Primero, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas del cuerpo védico: física, energética, mental, discriminativa, bienaventuranza) implican una jerarquía de lo grosero a lo sutil, siendo lo sutil "superior". La ingeniería de arneses no tiene tal orden de valor. Un linter determinista no es "inferior" a un LLM como juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos para ejecutarse con cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "grosera", no trascenderla. Importar la jerarquía Kosha al diseño de arneses te llevaría a sobreinvertir en controles inferenciales y subinvertir en los deterministas. Lo opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuesta condicionada. La arquitectura de agentes apunta a una respuesta condicionada *efectiva*. Quieres que el agente desarrolle patrones fiables, no que los disuelva. Vairagya en el sentido yóguico significa soltar *todo* apego. En ingeniería de arneses significa soltar los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación negándose a recuperar nada en absoluto. Poco útil.

---

## Qué no es esto

Esto no es "la sabiduría antigua valida mi arquitectura". La flecha causal va en la otra dirección: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación de memoria de agentes no es místico. Es ingeniería convergente sobre el mismo problema: ¿cómo gestiona un sistema acotado un flujo de información ilimitado?

Tampoco es el primer intento en esta intersección. La [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) de Ghosh y Ghosh y su sucesora Maṇḍūkya-APO mapean los estados de consciencia védicos (los cuatro estados del Upanishad Māṇḍūkya: vigilia, sueño, sueño profundo, trascendente) a un ciclo de consolidación vigilia-sueño para agentes de RL, formalizado con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos artículos son explícitamente marcos conceptuales sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre "marco propuesto" y "resultado medido" es donde muere la mayoría del trabajo interdisciplinario. Las tres hipótesis siguientes están diseñadas para no morir allí.

La pregunta útil no es "¿es el yoga relevante para la IA?", sino "¿qué discriminaciones yóguicas específicas producen hipótesis comprobables que los sistemas de memoria actuales no formulan?"

El benchmark inicial ha respondido una pregunta. La deduplicación uniforme en bóvedas pequeñas es perjudicial, y la cláusula de guardia `MinDedupVaultSize` ([PR #359](https://github.com/scrypster/muninndb/pull/359)) lo corrigió. Dos hipótesis permanecen abiertas. El decaimiento etiquetado por resultado (vrtti nirodha) requiere que el generador sintético de bóvedas muestre que el decaimiento uniforme cuesta calidad de recuperación en entradas con diferentes historiales de resultado. El desplazamiento hebbiano (vairagya) requiere que el mismo generador mida si las entradas fortalecidas desplazan a alternativas más relevantes. Ambas se reducen a una tarea de ingeniería: **el esquema de traza debe capturar la precisión de recuperación desglosada por propiedades de la entrada**: peso hebbiano, frecuencia de acceso, historial de resultado. Si los datos muestran un problema, las correcciones son directas. Si no, nos saltamos la complejidad.

Pratyahara ya está implementado correctamente: el Memory Trait devuelve top-k, punto y final. El arnés del benchmark captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de estos requiere creer en chakras. Requieren tomarse las discriminaciones en serio como heurísticas de ingeniería y medir si mejoran el recuerdo del agente en cargas de trabajo realistas. El benchmark inicial forzó un cambio de diseño. El generador sintético de bóvedas decide el resto.

## Lectura adicional

[El marco de ingeniería de arneses de Böckeler](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios en el arnés producen brechas de rendimiento de 6x. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), el trabajo previo más cercano que mapea el Vedanta a la arquitectura de agentes (conceptual, sin benchmarks aún). Yoga Sutras 1.2-1.16, el modelo de filtrado de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb), donde se ponen a prueba las hipótesis. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), los resultados iniciales. [PR #337](https://github.com/scrypster/muninndb/pull/337), la corrección de saturación de puntuaciones. [PR #359](https://github.com/scrypster/muninndb/pull/359), la cláusula de guardia de deduplicación. [Hrafn](https://github.com/5queezer/hrafn), el entorno de ejecución que funciona en una Raspberry Pi de 10 $.

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un entorno de ejecución ligero para agentes en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*La imagen de portada de esta publicación fue generada por IA.*