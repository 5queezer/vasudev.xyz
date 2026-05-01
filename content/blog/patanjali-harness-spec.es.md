---
title: "Patanjali tenía la especificación de filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
agentQuestions:
  - "¿Qué especificación de filtrado sugiere Patanjali?"
  - "¿Por qué la consolidación empeoró la recuperación?"
  - "¿Qué debe probar un harness de memoria de agente?"
series: ["Building Agents That Sleep"]
series_weight: 4
description: "La consolidación de la memoria empeoró la recuperación. Tres principios de diseño de los benchmarks de memoria de agentes y sus inesperados paralelos con la teoría de la atención yóguica."
images: ["/images/patanjali-harness-spec-og.png"]
translationHash: "ae9dda0d7fd7c8e66ef2f6324885a32d"
chunkHashes: "d194b560cd5bd05d,00217735d7922f24,4ff29492163683f6,76193dd6126e8e55,797db2615cbff326,d4e931c16fb32a74,4b8f77dd0376513a"
---
[MuninnDB](https://github.com/scrypster/muninndb)'s consolidation system merged three color-variant duplicate engrams exactly as designed (cosine similarity >= 0.95). Retrieval got worse. In a 13‑engram vault, removing duplicates shifted the normalization anchor, pushing relevant results down the ranking. The fix was a guard clause: `MinDedupVaultSize` (default 20), skipping Phase 2 dedup in small vaults. [PR #359](https://github.com/scrypster/muninndb/pull/359) closed the issue.

The failure wasn't a bug in the dedup algorithm. It was a failure of *discernment*: a valid consolidation operation applied in a context where it caused harm. When to consolidate, when to leave alone, what counts as noise vs. signal. That problem has a long history outside computer science. I found three specific design principles in the [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutra_de_Patanjali) that map to empirical results from [Meta‑Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, March 2026), [MemoryBench](https://arxiv.org/abs/2510.17281), and Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).

**The contemplative traditions built sophisticated models of attention filtering. Some of those models generate testable hypotheses that the current agent memory literature doesn't make.**
## 1. No todo ruido es igual (Vrtti Nirodha)

Antes del fallo de deduplicación, el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) encontró un problema más básico. La puntuación ACT‑R de MuninnDB ([issue #331](https://github.com/scrypster/muninndb/issues/331)) fijaba los engramas nuevos a raw=1.0, haciendo que todas las puntuaciones de recuperación fueran idénticas en 0.9000. El sistema no podía distinguir señal de ruido. Cada entrada parecía igualmente relevante. Después de la corrección ([PR #337](https://github.com/scrypster/muninndb/pull/337)), el rango de puntuaciones mejoró a 0.18‑0.90 y la recuperación correcta top‑1 pasó a 5/5 consultas. El trato uniforme de las entradas había estado destruyendo la calidad de la recuperación.

Meta‑Harness confirmó el mismo patrón a una escala diferente. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) comparó tres niveles de acceso a la información para el optimizador del harness:

| Condición | Precisión mediana | Mejor precisión |
|---|---|---|
| Solo puntuaciones | 34.6% | 41.3% |
| Puntuaciones + resumen LLM | 34.9% | 38.7% |
| Trazas crudas completas | 50.0% | 56.7% |

Los resúmenes generados por LLM resultaron *peor* que solo las puntuaciones crudas (mejor precisión 38.7% vs 41.3%). Las trazas crudas completas obtuvieron 56.7%. Los resúmenes colapsaron la señal diagnóstica junto con el ruido, destruyendo la información que el optimizador necesitaba. En clasificación de texto, Meta‑Harness alcanzó 48.6% frente al 40.9% de ACE usando 4× menos tokens de contexto. El movimiento ganador no fue más información. Fue una mejor *selección* de información.

El principio de diseño: el trato indiscriminado de las entradas destruye la calidad de la recuperación, ya sea mediante puntuación uniforme, resumen con pérdida o deduplicación indiferenciada.

Los Yoga Sutras 1.2 definen el yoga como *chitta vrtti nirodha*, la cesación de fluctuaciones en el campo mental. Patanjali no dice "elimina todo". Él diferencia los [*kleshas*](https://es.wikipedia.org/wiki/Kleshas) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de los [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal. El bug de saturación de puntuaciones era el sistema sin hacer esa distinción. Cada vrtti se veía igual.

La implicación de diseño para MuninnDB: los pisos de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de curl podrían tener tasas de recuperación idénticas pero valores de retención radicalmente diferentes. Podrías intentar clasificar las entradas de antemano como pramana o klesha (verificado vs distorsionado), pero esa clasificación es, en sí, el problema difícil. Para la mayoría de las entradas, requiere juicio semántico, lo que implica un LLM en la ruta de decaimiento, volviendo la consolidación cara e indeterminista.

El camino más sencillo: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción subsecuente tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El piso de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación de bandido sobre la recuperación, una idea bien establecida en recuperación de información, aplicada aquí a la memoria persistente del agente. No se necesita ontología. No hay LLM en el bucle. No tienes que clasificar el vrtti de antemano. Observas su efecto y dejas que esa observación modele la retención.
## 2. El refuerzo necesita un contrapeso (Samskara y Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) probó tres sistemas de memoria de última generación (A‑Mem, Mem0, MemoryOS) contra líneas base ingenuas de RAG que simplemente recuperan del contexto bruto. Ninguno de los sistemas avanzados superó consistentemente a las líneas base. El modo de falla específico: estos sistemas no podían utilizar la memoria procedural (registros de retroalimentación que indican el historial de desempeño del sistema). Trataban todas las entradas como conocimiento declarativo, ignorando las señales que les habrían indicado qué memorias eran realmente útiles.

El benchmark #311 de MuninnDB produjo una versión local del mismo problema. La fase 2 de deduplicación identificó y fusionó correctamente tres duplicados de variaciones de color (coseno ≥ 0.95). Pero en la bóveda de 13 engramas, al eliminar esas entradas cambió el ancla de normalización. Un engrama no relacionado se volvió el punto de referencia, empujando los resultados relevantes hacia abajo en la clasificación. Una operación de consolidación válida, aplicada uniformemente, desplazó la respuesta correcta.

La [taxonomía de ingeniería de arneses de Böckeler](https://martinfowler.com/articles/harness-engineering.html) explica el desajuste estructural. Ella distingue sensores computacionales (determinísticos, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). La deduplicación con coseno ≥ 0.95 es un proceso computacional. Detectar cuándo la deduplicación perjudica la recuperación requiere juicio inferencial: “estas entradas son similares, pero ¿es seguro eliminarlas en esta bóveda?” Ningún umbral de similitud puede responder eso.

Los [Yoga Sutras](https://es.wikipedia.org/wiki/Sutras_de_yoga_de_Patanjali) nombran la misma dinámica. Los [Samskaras](https://es.wikipedia.org/wiki/Samskara_(filosof%C3%ADa_de_la_India)) son impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundizan la ranura. MuninnDB lo implementa directamente: las entradas que se co‑activan fortalecen sus pesos de asociación. Los Sutras advierten que los samskaras se multiplican. Sin el contrapeso del [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (no‑apego, la capacidad de liberar asociaciones fuertes), se calcifican en [*vasanas*](https://es.wikipedia.org/wiki/Vasana), patrones de reacción automáticos que eluden la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el guion.

El mecanismo que falta es el *debilitamiento* hebbiano explícito: no solo decaimiento pasivo, sino corrección activa cuando una entrada fuertemente asociada produce una recuperación falsa positiva. El [benchmark #311](https://github.com/scrypster/muninndb/issues/311) ya está completado ([PR #359](https://github.com/scrypster/muninndb/pull/359)), y los resultados iniciales ya obligaron a una corrección (la guarda `MinDedupVaultSize`). La siguiente medición requiere el generador sintético de bóvedas con clases de engramas etiquetadas: Duplicado, Near‑duplicate, Actualización temporal, Hecho único, Único de bajo acceso, Alcance legal, y Adjacent‑legal. La métrica más aguda es la *tasa de desplazamiento*: ¿con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja una entrada más relevante fuera del top‑k? Esa es la medida directa de vasana: no solo “cosa equivocada recuperada” sino “cosa correcta desplazada por una recuperación habitual”. Si las entradas reforzadas producen desplazamiento medible, el vairagya como primitiva de diseño está justificado empíricamente. Si no lo hacen, el decaimiento pasivo actual es suficiente y omitimos la complejidad.

**Actualización (2026‑04‑08):** El estudio de ablación de la Fase 2 del Dream Engine ([PR #367](https://github.com/scrypster/muninndb/pull/367)) ahora brinda números concretos. 50 pruebas Optuna en 255 combinaciones de fase, validadas en 6 conjuntos de datos GoodAI LTM con Gemini 3.1 Flash Lite:

| Fase | Delta medio | Veredicto |
|---|---|---|
| 5 Inferencia transitiva | +0.022 | Útil |
| 0 Orientación | +0.007 | Útil |
| 2 Deduplicación semántica | +0.006 | Útil |
| 4 Estabilidad bidireccional | -0.014 | Detrimental |
| 2b Adjudicación LLM | -0.011 | Detrimental |
| 1 Decaimiento de relevancia | -0.011 | Detrimental |

La fase 4 (ajustes de estabilidad, el mecanismo de fortalecimiento de samskara) es la fase más destructiva. El caso empírico para el vairagya como primitiva de diseño queda confirmado: el refuerzo sin control daña la recuperación. Pero los datos también sugieren que la solución más simple es no reforzar en absoluto, más que construir un contrapeso de debilitamiento sofisticado. La [revisión de scrypster](https://github.com/scrypster/muninndb/pull/367#issuecomment) llegó a la misma conclusión: lanzar solo las fases de delta positivo (0, 2, 5), mantener los caminos de escritura en espera hasta que la validación de LocOMo y LongMemEval esté completa.
## 3. El poder de la exclusión deliberada (Pratyahara)

El resultado más sorprendente de Meta-Harness: los arneses ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador de clasificación de texto usa TF‑IDF con pares contrastivos y primado de etiquetas (48,6 % de precisión, 4 x menos tokens que el subcampeón). El ganador de recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas. Cambiar el arnés alrededor de un LLM fijo produce una brecha de rendimiento de 6 x en el mismo benchmark.

Böckeler lo enmarca como “mantener la calidad a la izquierda”: cuanto antes filtres, más barato y fiable será el resultado posterior. Sus guías computacionales (linters, esquemas, reglas de CLAUDE.md) evitan que categorías enteras de información lleguen al modelo. La guardia `MinDedupVaultSize` del PR #359 es el mismo principio aplicado a la consolidación: en lugar de ejecutar deduplicación en cada bóveda y esperar que el modelo maneje los resultados degradados, el sistema aprendió a *no aplicar* deduplicación en bóvedas pequeñas. Exclusión de un proceso, no solo exclusión de datos.

La primera versión de este post argumentó que la interfaz Memory Trait debería devolver metadatos de rechazo junto a los resultados. “Estas 3 entradas coincidieron, y estas 5 fueron excluidas por X.” Más señal diagnóstica para el LLM. Decisiones mejor informadas. Parece razonable.

Está mal, y el principio yogui de [pratyahara](https://es.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explica por qué. Pratyahara a menudo se traduce como “retiro de los sentidos”, pero eso es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de arrastrar la mente hacia cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Si le dices al LLM “aquí hay 5 cosas que deliberadamente estoy reteniendo de ti”, le has mostrado los objetos y añadido una prohibición. Eso no es retiro sensorial. Es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado conoce el resultado: “no pienses en un elefante blanco” garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta‑Harness de que los arneses simples ganan) e invitan al modelo a cuestionar el filtro (“¿Por qué se excluyó X? Tal vez lo necesite después de todo”). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente exacto, y los metadatos de exclusión son, por definición, no esenciales para la tarea en cuestión.

La separación correcta: **el agente ve solo los resultados top‑k. El arnés del benchmark lo ve todo.** La interfaz Memory Trait se mantiene esbelta: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra la decisión completa internamente: qué se devolvió, qué se excluyó, por qué, y qué hizo el agente después. El benchmark consume los registros. El agente consume las entradas.

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

El agente nunca ve `excluded`. El arnés del benchmark lo ve todo. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en la traza, y la siguiente iteración de la política de recuperación puede ajustarse.

En la taxonomía de Böckeler: el Memory Trait es una guía computacional (determina qué entra al contexto). El registro de traza es un sensor computacional (observa lo que ocurrió). No se fusionan. Pratyahara no es filtrado consciente en el sentido de *el sistema filtrado estar al tanto de la exclusión*. Es filtrado consciente en el sentido de *el diseñador estar al tanto*, a través de los registros de traza, de modo que la siguiente iteración del filtro mejore. La consciencia pertenece al ingeniero del arnés que lee las trazas, no al agente que ejecuta las consultas.
## Where the metaphor breaks

Two places.

First, the [Koshas](https://es.wikipedia.org/wiki/Kosha) (Vedantic body layers: physical, energetic, mental, discriminative, bliss) imply a hierarchy from gross to subtle, with the subtle being "higher." Harness engineering has no such value ordering. A deterministic linter is not "lower" than an LLM-as-judge. Böckeler explicitly notes that computational sensors are cheap enough to run on every change, while inferential controls are expensive and probabilistic. In practice, you want to *maximize* the "gross" layer, not transcend it. Importing the Kosha hierarchy into harness design would lead you to over-invest in inferential controls and under-invest in deterministic ones. The opposite of what works.

Second, yogic practice aims at liberation from the cycle of conditioned response. Agent architecture aims at *effective* conditioned response. You want the agent to develop reliable patterns, not dissolve them. Vairagya in the yogic sense means letting go of *all* attachment. In harness engineering it means letting go of *incorrect* attachments. The goal is better conditioning, not no conditioning. Importing the full soteriological framework would lead to an agent that achieves enlightenment by refusing to retrieve anything at all. Unhelpful.
## Qué no es esto

Esto no es "la sabiduría ancestral valida mi arquitectura". La flecha causal va en la otra dirección: las tradiciones contemplativas desarrollaron sofisticados modelos fenomenológicos de atención, memoria y filtrado de información durante milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación de la memoria de agentes no es místico. Es ingeniería convergente sobre el mismo problema: ¿cómo maneja un sistema limitado el flujo de información ilimitado?

Esto tampoco es el primer intento en la intersección. El **Advaitic Policy Optimization** de Ghosh y Ghosh​[¹](https://www.researchgate.net/publication/389264820) y su sucesor Maṇḍūkya‑APO asignan estados vedánticos de conciencia (los cuatro estados del Māṇḍūkya Upaniṣad: vigilia, sueño, sueño profundo, trascendente) a un ciclo de consolidación de sueño‑vigilia para agentes de RL, formalizado con teoría de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos trabajos son explícitamente marcos conceptuales sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari‑57, Intel Loihi) no se han ejecutado. La brecha entre “marco propuesto” y “resultado medido” es donde muere la mayor parte del trabajo interdisciplinario. Las tres hipótesis a continuación están diseñadas para no morir allí.

La pregunta útil no es “¿es el yoga relevante para la IA?” sino “¿qué discriminaciones yóguicas específicas generan hipótesis comprobables que los sistemas de memoria actuales no hacen?”

El benchmark inicial respondió a una pregunta. La deduplicación uniforme en bóvedas pequeñas es perjudicial, y la guardia `MinDedupVaultSize` ([PR #359](https://github.com/scrypster/muninndb/pull/359)) lo corrigió. Quedan abiertas dos hipótesis. La decadencia etiquetada por resultado (vrtti nirodha) requiere que el generador sintético de bóvedas demuestre que la decadencia uniforme afecta la calidad de recuperación en entradas con diferentes historiales de resultados. El desplazamiento hebbiano (vairagya) requiere que el mismo generador mida si las entradas reforzadas desplazan a alternativas más relevantes. Ambas se reducen a una tarea de ingeniería: **el esquema de trazas debe capturar la precisión de recuperación desglosada por propiedades de la entrada**: peso hebbiano, frecuencia de acceso, historial de resultados. Si los datos muestran un problema, las correcciones son directas. Si no, se omite la complejidad.

Pratyahara ya está implementado correctamente: el rasgo Memory devuelve top‑k, punto. El harness del benchmark captura la decisión completa de recuperación. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de estos requiere creer en chakras. Requieren tomar las discriminaciones en serio como heurísticas de ingeniería y medir si mejoran la capacidad de recuerdo del agente en cargas de trabajo realistas. El benchmark inicial obligó a un cambio de diseño. El generador sintético de bóvedas decide el resto.
## Lecturas adicionales

[Marco de ingeniería de arneses de Böckeler](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacional, inferencial). [Meta-Arnés](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios de arnés producen brechas de rendimiento de 6×. [Optimización de Política Advaita](https://www.researchgate.net/publication/389264820), el arte previo más cercano que asigna Vedanta a la arquitectura de agentes (conceptual, sin benchmarks todavía). Yoga Sutras 1.2‑1.16, el modelo de filtrado de atención que lo precede todo. [MuninnDB](https://github.com/scrypster/muninndb), donde se ponen a prueba las hipótesis. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), los resultados iniciales. [PR #337](https://github.com/scrypster/muninndb/pull/337), la corrección de saturación de puntuación. [PR #359](https://github.com/scrypster/muninndb/pull/359), la protección contra duplicados. [Hrafn](https://github.com/5queezer/hrafn), el entorno de ejecución que funciona en una Raspberry Pi de $10.

---

*Christian Pojoni crea [Hrafn](https://github.com/5queezer/hrafn), un entorno de agente ligero en Rust. Publicación anterior: [Por qué los agentes de IA necesitan dormir](/blog/why-ai-agents-need-sleep/).*

*La imagen de portada de esta publicación fue generada por IA.*