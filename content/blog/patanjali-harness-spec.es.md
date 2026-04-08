---
title: "Patanjali teníala Filtering Spec. Acabamos de escribir las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "La consolidación de la memoria empeoró la recuperación. Tres principios de diseño de los benchmarks de memoria de agentes, y sus inesperados paralelos en la teoría de la atención yóguica."
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "065cf684afb116027a894361e33aa742"
chunkHashes: "534d87a2c02441ac,d54445670f0f3cb3,4ff29492163683f6,76193dd6126e8e55,797db2615cbff326,d4e931c16fb32a74,4b8f77dd0376513a"
---
## 1. No todo el ruido es igual (Vrtti Nirodha)

Antes del fallo de dedup, [benchmark #311](https://git... 
El fallo no fue un error en el algoritmo de dedup. Fue un fallo de *discernment*: una operación de consolidación válida aplicada en un contexto donde causó daño. Cuándo consolidar, cuándo dejarlo como está, qué cuenta como ruido vs. señal. Ese problema tiene una larga historia fuera de la informática. Encontré tres principios de diseño específicos en el [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga Sutras_of_Patanjali) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052), [MemoryBench](https://arxiv.org/abs/2510.17281), y Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness_engineering.html).  

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunas de esas modelos generan hipótesis comprobables que la literatura actual de memoria de agentes no hace.**
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
## Where the metaphor breaks

Dos lugares.

First, the [Koshas](https://es.wikipedia.org/wiki/Kosha) (Vedantic body layers: físico, energético, mental, discriminativo, de dicha) imply a hierarchy from gross to subtle, with the subtle being "higher." Harness engineering has no such value ordering. A deterministic linter is not "menor" than an LLM-as-judge. Böckeler explicitly notes that computational sensors are cheap enough to run on every change, while inferential controls are expensive and probabilistic. In practice, you want to *maximize* the "gross" layer, not transcend it. Importar la jerarquía Kosha al harness engineering te llevaría a sobreinvertir en controles inferenciales y subinvertir en los deterministas. The opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response. You want the agent to develop reliable patterns, not dissolve them. Vairagya in the yogic sense means letting go of *todo* apego. In harness engineering it means letting go of *incorrectos* attachments. The goal is better conditioning, not no conditioning. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación al negarse a recuperar algo en absoluto. Inútil.
## Quéesto no es

Esto no es “sabiduría antigua que valida mi arquitectura.” La flecha causal corre en sentido opuesto: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en investigación de memoria de agentes no es místico. Es ingeniería convergente sobre el mismo problema: ¿cómo gestiona un sistema limitado un flujo de información ilimitado?

Esto tampoco es el primer intento en la intersección. Ghosh y Ghosh's [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) y su sucesor Maṇḍūkya-APO mapean estados de conciencia vedanta (los cuatro estados del Māṇḍūkya Upaniṣad: vigilia, sueño, sueño profundo, trascedente) a un ciclo de consolidación vigilia-sueño para agentes de RL, formalizado con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos papers son explícitamente marcos conceptuales sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre “marco propuesto” y “resultado medido” es donde muere la mayoría del trabajo interdisciplinario. Las tres hipótesis siguientes están diseñadas para no morir allí.

La pregunta útil no es “¿es el yoga relevante para la IA?” sino “¿qué discriminaciones yogicas específicas producen hipótesis testables que los sistemas de memoria actuales no hacen?”

El benchmark inicial ha respondido una pregunta. La desduplicación uniforme en cubículos pequeños es perjudicial, y la guardia `MinDedupVaultSize` ([PR #359](https://github.com/scrypster/muninndb/pull/359)) lo corrigió. Quedan abiertas dos hipótesis. El decaimiento etiquetado por resultados (vrtti nirodha) requiere que el generador sintético de cubículos demuestre que el decaimiento uniforme reduce la calidad de recuperación en entradas con diferentes historias de resultados. El desplazamiento hebbiano (vairagya) requiere que el mismo generador mida si las entradas reforzadas desplazan más alternativas relevantes. Ambas se reducen a una tarea de ingeniería: **the trace schema must capture retrieval precision broken down by entry properties**: Hebbian weight, access frequency, outcome history. Si los datos muestran un problema, las correcciones son sencillas. Si no, se omite la complejidad.

Pratyahara ya está implementado correctamente: la Trait de Memoria devuelve top-k, punto. El armazón de pruebas captura la decisión completa de recuperación. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de esto requiere creer en chakras. Se requiere tomar las discriminaciones seriamente como heurísticas de ingeniería y medir si mejoran el recuerdo de agentes en cargas de trabajo realistas. El benchmark inicial obligó un cambio de diseño. El generador sintético de cubículos decide el resto.
## Furtherreading

[Böckeler's harness engineering framework](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios de harness producen brechas de rendimiento de 6x. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), el arte previo más cercano que mapea Vedanta a la arquitectura de agentes (conceptual, sin benchmarks aún). Yoga Sutras 1.2-1.16, el modelo de filtrado de atención que precede a todo ello. [MuninnDB](https://github.com/scrypster/muninndb), donde se ponen a prueba las hipótesis. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), los resultados iniciales. [PR #337](https://github.com/scrypster/muninndb/pull/337), la solución de saturación de puntuación. [PR #359](https://github.com/scrypster/muninndb/pull/359), la guardia de deduplicación. [Hrafn](https://github.com/5queezer/hrafn), el runtime que se ejecuta en una Raspberry Pi de $10.

*Christian Pojoni construye [Hrafn](https://github.com/5queezer/hrafn), un runtime ligero para agentes en Rust. Post anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

*La imagen de portada de esta publicación fue generada por IA.*