---
title: "Patanjali tenía la especificación de filtrado. Solo escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
series: ["Building Agents That Sleep"]
series_weight: 4
description: "La consolidación de la memoria empeoró la recuperación. Tres principios de diseño de la memoria del agente y sus inesperados paralelos en la teoría de la atención yogui."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "b68857d2e17efedb057d0b4955665417"
chunkHashes: "d4cbf2e12a61dfdf,00217735d7922f24,4ff29492163683f6,76193dd6126e8e55,797db2615cbff326,d4e931c16fb32a74,4b8f77dd0376513a"
---
La falla no fue un error en el algoritmo dedup. Fue un fracaso de *discernimiento*: una operación de consolidación válida aplicada en un contexto donde causó daño. Cuándo consolidar, cuándo dejarlo como está, qué cuenta como ruido versus señal. Ese problema tiene una larga historia fuera de la informática. Encontré tres principios de diseño específicos en los [Yoga Sutras of Patanjali](https://es.wikipedia.org/wiki/Yoga_sutras_de_Patanjali) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunos de esos modelos generan hipótesis comprobables que la literatura actual de memoria agente no hace.**

La solución fue una cláusula guard: `MinDedupVaultSize` (default 20), omitiendo la Phase 2 dedup en vaults pequeños.
## 1. No todo el ruido es igual (Vrtti Nirodha)

Antes del fallo de dedup, [benchmark #311](https://git...  
La recuperación empeoró. En un vault de 13 engramas, al eliminar duplicados se desplazó el ancla de normalización, empujando los resultados relevantes hacia abajo en el ranking. La solución fue una cláusula de protección: `MinDedupVaultSize` (predeterminado 20), omitiendo la fase 2 de dedup en vaults pequeños. [PR #359](https://github.com/scrypster/muninndb/pull/359) cerró el problema.  

El fallo no fue un error en el algoritmo de dedup. Fue una falla de *discernment*: una operación de consolidación válida aplicada en un contexto donde causó daño. ¿Cuándo consolidar, cuándo dejaralone, qué cuenta como ruido vs. señal? Ese problema tiene una larga historia fuera de la informática. Encontré tres principios de diseño específicos en los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281), y Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).  

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunas de esas modelaciones generan hipótesis verificables que la literatura actual de memoria agente no hace.**
## 1. Not all noise is equal (Vrtti Nirodha)

El sistema de consolidación de [MuninnDB](https://github.com/scrypster/muninndb) fusionó exactamente tres engramas duplicados de variante de color, tal como estaba diseñado (similitud coseno >= 0.95). La recuperación empeoró. En una bóveda de 13 engramas, al eliminar los duplicados se desplazó el ancla de normalización, empujando los resultados relevantes hacia abajo del ranking. La solución fue una cláusula de guardia: `MinDedupVaultSize` (default 20), skipping Phase 2 dedup in small vaults. [PR #359](https://github.com/scrypster/muninndb/pull/359) cerró el problema.

The failure wasn't a bug in the dedup algorithm. It was a failure of *discernimiento*: a valid consolidation operation applied in a context where it caused harm. When to consolidate, when to leave alone, what counts as noise vs. signal. That problem has a long history outside computer science. I found three specific design principles in the [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras_de_Patanjali) that map to empirical results from [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, March 2026), [MemoryBench](https://arxiv.org/abs/2510.17281), and Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunos de esos modelos generan hipótesis comprobables que la literatura actual de memoria de agentes no hace.**
## 1. No todo el ruidoes igual (Vrtti Nirodha)

Antes del fallo de dedup, [benchmark #311](https://github.com/scrypster/muninndb/issues/311) enfrentó un problema más básico. MuninnDB's ACT-R scoring ([issue #331](https://github.com/scrypster/muninndb/issues/331)) clamped fresh engrams to raw=1.0, making all retrieval scores identical at 0.9000. The system could not distinguish signal from noise. Every entry looked equally relevant. After the fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)), score range improved to 0.18-0.90 and correct top-1 retrieval went to 5/5 queries. Uniform treatment of entries had been destroying retrieval quality.

Meta-Harness confirmó el mismo patrón a una escala diferente. Su [ablación crÍtica (Table 3)](https://arxiv.org/abs/2603.28052) comparó tres niveles de acceso a la informaciÃ³n para el optimizador del harness:

| CondiciÃ³n | PrecisiÃ³n media | Mejor precisiÃ³n |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM-generated summaries performed *worse* than raw scores alone (best accuracy 38.7% vs 41.3%). Full raw traces got 56.7%. The summaries collapsed diagnostic signal alongside noise, destroying the information the optimizer needed. On text classification, Meta-Harness achieved 48.6% vs ACE's 40.9% while using 4x fewer context tokens. The winning move was not more information. It was better *selection* of information.

The design principle: indiscriminate treatment of entries destroys retrieval quality, whether that treatment is uniform scoring, lossy summarization, or undifferentiated dedup.

Yoga Sutras 1.2 defines yoga as *chitta vrtti nirodha*, the cessation of fluctuations in the mind-field. Patanjali doesn't say "delete everything." He distinguishes [*kleshas*](https://en.wikipedia.org/wiki/Kleshas_(Hinduism)) (distortions: attachment, aversion, ego, ignorance, fear of death) from [*pramanas*](https://en.wikipedia.org/wiki/Pramana) (valid cognition: direct perception, inference, testimony). The practice is surgical: reduce the distortions, preserve the signal. The score saturation bug was the system failing to make that distinction. Every vrtti looked the same.

The design implication for MuninnDB: decay floors should reflect outcome, not just access frequency. A verified API pattern and a failed curl attempt might have identical retrieval rates but radically different retention value. You could try to classify entries upfront as pramana or klesha (verified vs. distorted), but that classification is itself the hard problem. For most entries, it requires semantic judgment, which means an LLM in the decay path, which makes consolidation expensive and nondeterministic.

The simpler path: **outcome-tagged writes**. When an agent retrieves an entry and the subsequent action succeeds, the entry gets an `outcome: success` signal. When the action fails, `outcome: failure`. The decay floor couples to the success rate, not to an epistemic category. This is essentially bandit feedback on retrieval, an idea well-established in information retrieval, applied here to persistent agent memory. No ontology needed. No LLM in the loop. You don't need to classify the vrtti in advance. You observe its effect and let that observation shape retention.
## 1. No todo el ruido es igual (Vrtti Nirodha)

Before the dedup failure, [benchmark #311](https://github.com/scrypster/muninndb/issues/311) hit a more basic problem. MuninnDB's ACT-R scoring ([issue #331](https://github.com/scrypster/muninndb/issues/331)) clamped fresh engrams to raw=1.0, making all retrieval scores identical at 0.9000. The system could not distinguish signal from noise. Every entry looked equally relevant. After the fix ([PR #337](https://github.com/scrypster/muninndb/pull/337)), score range improved to 0.18-0.90 and correct top-1 retrieval went to 5/5 queries. Uniform treatment of entries had been destroying retrieval quality.

Meta-Harness confirmed the same pattern at a different scale. Their [critical ablation (Table 3)](https://arxiv.org/abs/2603.28052) compared three levels of information access for the harness optimizer:

| Condición | Precisión mediana | Mejor precisión |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM-generated summaries performed *peor* than raw scores alone (best accuracy 38.7% vs 41.3%). Full raw traces got 56.7%. The summaries collapsed diagnostic signal alongside noise, destroying the information the optimizer needed. On text classification, Meta-Harness achieved 48.6% vs ACE's 40.9% while using 4x fewer context tokens. The winning move was not more information. It was better *selection* of information.

The design principle: indiscriminate treatment of entries destroys retrieval quality, whether that treatment is uniform scoring, lossy summarization, or undifferentiated dedup.

Yoga Sutras 1.2 defines yoga as *chitta vrtti nirodha*, the cessation of fluctuations in the mind-field. Patanjali doesn't say "delete everything." He distinguishes [*kleshas*](https://es.wikipedia.org/wiki/Klesha_(Hinduism))) (distortions: attachment, aversion, ego, ignorance, fear of death) from [*pramanas*](https://es.wikipedia.org/wiki/Pramana))) (valid cognition: direct perception, inference, testimony). The practice is surgical: reduce the distortions, preserve the signal. The score saturation bug was the system failing to make that distinction. Every vrtti looked the same.

The design implication for MuninnDB: decay floors should reflect outcome, not just access frequency. A verified API pattern and a failed curl attempt might have identical retrieval rates but radically different retention value. You could try to classify entries upfront as pramana or klesha (verified vs. distorted), but that classification is itself the hard problem. For most entries, it requires semantic judgment, which means an LLM in the decay path, which makes consolidation expensive and nondeterministic.

The simpler path: **outcome-tagged writes**. When an agent retrieves an entry and the subsequent action succeeds, the entry gets an `outcome: success` signal. When the action fails, `outcome: failure`. The decay floor couples to the success rate, not to an epistemic category. This is essentially bandit feedback on retrieval, an idea well-established in information retrieval, applied here to persistent agent memory. No ontology needed. No LLM in the loop. You don't need to classify the vrtti in advance. You observe its effect and let that observation shape retention.
## 2.Reinforcement needs a counterweight (Samskara and Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) probó tres sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) contra bases RAG ingenuas que simplemente recuperan del contexto sin procesar. Ninguno de los sistemas avanzados superó consistentemente a las bases. El modo de falla específico: estos sistemas no podían utilizar la memoria procedural (registros de retroalimentación que indican el historial de rendimiento del sistema). Trataban todas las entradas como conocimiento declarativo, ignorando las señales que les habrían indicado qué memorias eran realmente útiles.

MuninnDB's benchmark #311 produjo una versión local del mismo problema. Phase 2 dedup identificó y fusionó correctamente tres duplicados de variante de color (cosine >= 0.95). Pero en el vault de 13 engramas, al eliminar esas entradas se cambió el ancla de normalización. Un engrama no relacionado se convirtió en el punto de referencia, empujando los resultados relevantes más abajo en el ranking. Una operación de consolidación válida, aplicada uniformemente, desplazó la respuesta correcta.

Böckeler's [harness engineering taxonomy](https://martinfowler.com/articles/harness-engineering.html) explica la discrepancia estructural. Ella distingue sensores computacionales (determinísticos, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). Dedup a cosine >= 0.95 es un proceso computacional. Detectar cuándo dedup perjudica la recuperación requiere juicio inferencial: "estas entradas son similares, pero ¿es *seguro* en este vault?" Ningún umbral de similitud puede responder eso.

Las [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_sutras_de_Patanjali) nombran la misma dinámica. Las [Samskaras](https://es.wikipedia.org/wiki/Samskara_(Indian_philosophy)) son impresiones latentes que forman la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundían la huella. MuninnDB implementa esto directamente: las entradas que coactivan fortalecen sus pesos de asociación. Las Sutras advierten que las samskaras se acumulan. Sin el contrapeso de [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (desapego, la capacidad de liberar asociaciones fuertes), estas se consolidan en [*vasanas*](https://es.wikipedia.org/wiki/Vasana), patrones de reacción automáticos que eluden la evaluación consciente. Dejas de ver la situación y empezás a ejecutar el script.

El mecanismo que falta es un *weakening* hebbiano explícito: no solo decaimiento pasivo, sino corrección activa cuando una entrada fuertemente asociada genera una recuperación positiva falsa. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311) ya está completado ([PR #359](https://github.com/scrypster/muninndb/pull/359)), y los resultados iniciales ya forzaron una corrección (la guardia `MinDedupVaultSize`). La siguiente medición requiere el generador sintético de vaults con clases de engramas etiquetadas: Duplicate, Near-duplicate, Temporal update, Unique fact, Low-access unique, Legal-scoped, y Legal-adjacent. La métrica más precisa es *displacement rate*: cuántas veces una entrada fuertemente asociada pero menos relevante desplaza a una más relevante del top-k. Eso es la medida directa de vasana: no solo "se recupera algo equivocado" sino "se desplaza lo correcto por la recuperación habitual". Si las entradas fortalecidas producen desplazamiento medible, vairagya como primitiva de diseño está justificada empíricamente. Si no, el decaimiento pasivo actual es suficiente y se omite la complejidad.

**Actualización (2026-04-08):** El estudio de ablación del Dream Engine Phase 2 ([PR #367](https://github.com/scrypster/muninndb/pull/367)) ahora proporciona números concretos. 50 pruebas Optuna a través de 255 combinaciones de fases, validadas en 6 conjuntos de datos LTM de GoodAI con Gemini 3.1 Flash Lite:

| Fase | Avg Delta | Veredicto |
|---|---|---|
| 5 Transitive Inference | +0.022 | Helpful |
| 0 Orient | +0.007 | Helpful |
| 2 Semantic Dedup | +0.006 | Helpful |
| 4 Bidirectional Stability | -0.014 | Detrimental |
| 2b LLM Adjudication | -0.011 | Detrimental |
| 1 Relevance Decay | -0.011 | Detrimental |

Phase 4 (stability adjustments, the samskara strengthening mechanism) es la fase más destructiva. El caso empírico para vairagya como primitiva de diseño está confirmado: la reforzación sin control daña la recuperación. Pero los datos también sugieren que la solución más simple es no reforzar en absoluto, en lugar de construir un sofisticado mecanismo de debilitamiento. scrypster's [review](https://github.com/scrypster/muninndb/pull/367#issuecomment) llegó a la misma conclusión: lanzar solo las fases con delta positivo (0, 2, 5), retener las rutas de escritura hasta que se complete la validación de LocOMo y LongMemEval.
## 3. El poder de la exclusión deliberada (Pratyahara)

Dos lugares.

Primero, el [Koshas](https://es.wikipedia.org/wiki/Kosha) ... Segundo, el [LongMemEval](https://github.com/...) ...

Meta-Harness's most surprising result: the winning harnesses are not the ones that pack the context window with everything available. The text classification winner uses TF-IDF with contrastive pairs and label priming (48.6% accuracy, 4x fewer tokens than the runner-up). The math retrieval winner is a four-route BM25 program with lexical predicates. Simple selection policies. No exotic architectures. Changing the harness around a fixed LLM produces a 6x performance gap on the same benchmark.

Böckeler frames it as "keep quality left": the earlier you filter, the cheaper and more reliable the downstream result. Her computational guides (linters, schemas, CLAUDE.md rules) prevent entire categories of information from reaching the model at all. The `MinDedupVaultSize` guard from PR #359 is the same principle applied to consolidation: instead of running dedup on every vault and hoping the model handles the degraded results, the system learned to *not apply* dedup in small vaults. Exclusion of a process, not just exclusion of data.

The first version of this post argued that the Memory Trait interface should return rejection metadata alongside results. "These 3 entries matched, and these 5 were excluded because of X." More diagnostic signal for the LLM. Better informed decisions. Sounds reasonable.

It's wrong, and the yogic principle of [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explains why. Pratyahara es a menudo traducida como "retirada de los sentidos", pero eso es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de atraer la mente ante cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Si le dices al LLM "aquí hay 5 cosas que deliberadamente te estoy ocultando", le has mostrado los objetos y añadido una prohibición. Eso no es retirada de los sentidos. Eso es estimulación sensorial con una etiqueta de advertencia. Quien haya meditado sabe el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los anclajes simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Tal vez lo necesite"). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente preciso, y los metadatos de exclusión, por definición, no son esenciales para la tarea.

La separación adecuada: **el agente ve solo los top‑k resultados. El motor de benchmark ve todo.** La interfaz Memory Trait se mantiene ligera: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué, y qué hizo el agente después. El benchmark consume los registros. El agente consume las entradas.

Una entrada de trazado se ve así:

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

El agente nunca ve `excluded`. El motor de benchmark ve todo eso. Si `entry_089` era la respuesta correcta y se filtró porque su peso Hebbian era bajo, eso aparece en la trazada, y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: la Memory Trait es una guía computacional (determina qué entra en el contexto). El registro de trazado es un sensor computacional (observa lo ocurrido). No se fusionan. La pratyahara no es filtrado consciente en el sentido de *el sistema filtrado ser consciente de la exclusión*. Es filtrado consciente en el sentido de *el diseñador ser consciente*, mediante los registros de trazado, para que la siguiente iteración del filtro mejore. La conciencia corresponde al ingeniero del anclaje que lee las trazadas, no al agente que ejecuta las consultas.