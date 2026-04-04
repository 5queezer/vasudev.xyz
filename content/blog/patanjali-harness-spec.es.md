---
title: "Patanjali tenía la especificación de filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["architecture", "memory", "muninndb"]
description: "La consolidación de la memoria empeoró la recuperación. Tres principios de diseño de los benchmarks de memoria de agentes y sus inesperados paralelismos con la teoría de la atención yóguica."
translationHash: "5c7987fe00cfece6bc91f6a6a33bba2d"
---
El sistema de consolidación de MuninnDB fusionó tres engramas duplicados de variantes de color exactamente como se diseñó (similitud coseno >= 0.95). La recuperación empeoró. En un vault de 13 engramas, al eliminar los duplicados se desplazó el ancla de normalización, empujando los resultados relevantes hacia abajo en el ranking. La solución fue una cláusula guard: `MinDedupVaultSize` (por defecto 20), que omite la Fase 2 de deduplicación en vaults pequeños. [PR #359](https://github.com/scrypster/muninndb/pull/359) cerró el problema.

La falla no fue un error en el algoritmo de deduplicación. Fue un fracaso de *discernment*: una operación de consolidación válida aplicada en un contexto donde causó daño. ¿Cuándo consolidar, cuándo dejar tal cual, qué se considera ruido versus señal? Ese problema tiene una larga historia fuera de la informática. Encontré tres principios de diseño específicos en los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) que se corresponden con resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y Böckeler's [harness engineering framework](https://martinfowler.com/articles/harness-engineering.html).

**Las tradiciones contemplativas construyeron modelos sofisticados de filtrado de atención. Algunas de esas teorías generan hipótesis comprobables que la literatura actual de memoria de agentes no formula.**

## 1. Not all noise is equal (Vrtti Nirodha)

## 1. Not all noise is equal (Vrtti Nirodha)

Antes de la falla de deduplicación, [benchmark #311](https://github.com/scrypster/muninndb/issues/311) enfrentó un problema más básico. El sistema de puntuación ACT-R de MuninnDB ([issue #331](https://github.com/scrypster/muninndb/issues/331)) limitaba los engramas frescos a raw=1.0, lo que hacía que todas las puntuaciones de recuperación fueran idénticas en 0.9000. El sistema no podía distinguir señal de ruido. Cada entrada parecía igualmente relevante. Después de la corrección ([PR #337](https://github.com/scrypster/muninndb/pull/337)), el rango de puntuaciones mejoró a 0.18-0.90 y la recuperación correcta en el puesto 1 alcanzó 5/5 consultas. El tratamiento uniforme de las entradas había estado destruyendo la calidad de la recuperación.

Meta-Harness confirmó el mismo patrón a una escala diferente. Su [critical ablation (Table 3)](https://arxiv.org/abs/2603.28052) comparó tres niveles de acceso a la información para el optimizador del harness:

| Condition | Median Accuracy | Best Accuracy |
|---|---|---|
| Scores only | 34.6% | 41.3% |
| Scores + LLM summary | 34.9% | 38.7% |
| Full raw traces | 50.0% | 56.7% |

LLM‑generated summaries realizaron *peor* que las puntuaciones crudas solas (mejor precisión 38.7% vs 41.3%). Las trayectorias crudas completas obtuvieron 56.7%. Las summaries colapsaron la señal diagnóstica junto con el ruido, destruyendo la información que el optimizador necesitaba. En clasificación de texto, Meta-Harness alcanzó 48.6% vs 40.9% de ACE mientras usaba 4 veces menos tokens de contexto. El movimiento ganador no fue más información. Fue una mejor *selección* de información.

El principio de diseño: el tratamiento indiscriminado de las entradas destruye la calidad de recuperación, ya sea mediante puntuación uniforme, resumen con pérdida o dedup no diferenciado.

Los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) 1.2 definen el yoga como *chitta vrtti nirodha*, la cesación de las fluctuaciones en el campo mental. Patanjali no dice "eliminar todo". Distingue [*kleshas*](https://es.wikipedia.org/wiki/Klesha_(Hinduism)) (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de [*pramanas*](https://es.wikipedia.org/wiki/Pramana) (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal. El bug de saturación de puntuaciones era la falla del sistema por no hacer esa distinción. Cada vrtti se veía igual.

La implicación de diseño para MuninnDB: los pisos de decaimiento deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de curl podrían tener tasas de recuperación idénticas pero un valor de retención radicalmente distinto. Podrías intentar clasificar las entradas de antemano como pramana o klesha (verificado vs. distorsionado), pero esa clasificación es el problema difícil. Para la mayoría de las entradas, requiere juicio semántico, lo que implica un LLM en la ruta de decaimiento, lo que hace que la consolidación sea costosa e indeterminista.

El camino más simple: **outcome-tagged writes**. Cuando un agente recupera una entrada y la acción subsiguiente tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El piso de decaimiento se acopla a la tasa de éxito, no a una categoría epistémica. Esto esencialmente es retroalimentación de bandit en recuperación, una idea bien establecida en recuperación de información, aplicada aquí a la memoria persistente de agentes. No se necesita ontología. No hay LLM en el bucle. No necesitas clasificar la vrtti de antemano. Observas su efecto y dejas que esa observación modele la retención.

## 2. Reinforcement needs a counterweight (Samskara and Vairagya)

## 2. Reinforcement needs a counterweight (Samskara and Vairagya)

[MemoryBench](https://arxiv.org/abs/2510.17281) probó tres sistemas de memoria de última generación (A-Mem, Mem0, MemoryOS) contra bases de referencia RAG ingenuas que simplemente recuperan del contexto crudo. Ninguno de los sistemas avanzados superó consistentemente a las bases. El modo específico de falla: estos sistemas no podían utilizar la memoria procedural (registros de retroalimentación que indican el historial del rendimiento del sistema). Trataban todas las entradas como conocimiento declarativo, ignorando las señales que les habrían indicado cuáles recuerdos eran realmente útiles.

La benchmark #311 de MuninnDB produjo una versión local del mismo problema. La Fase 2 de deduplicación identificó correctamente y fusionó tres duplicados de variantes de color (similitud coseno >= 0.95). Pero en el vault de 13 engramas, al eliminar esas entradas se desplazó el ancla de normalización. Un engrama no relacionado se convirtió en el punto de referencia, empujando los resultados relevantes hacia abajo en el ranking. Una operación de consolidación válida, aplicada de manera uniforme, desplazó la respuesta correcta.

El [framework de ingeniería de harness](https://martinfowler.com/articles/harness-engineering.html) de Böckeler explica la discrepancia estructural. Distingue sensores computacionales (determinísticos, baratos, se ejecutan en cada cambio) de sensores inferenciales (semánticos, costosos, probabilísticos). La deduplicación en coseno >= 0.95 es un proceso computacional. Detectar cuándo la deduplicación daña la recuperación requiere juicio inferencial: "estas entradas son similares, pero ¿es *seguro* eliminarlas en este vault?" Ningún umbral de similitud puede responder eso.

Los [Yoga Sutras](https://es.wikipedia.org/wiki/Yoga_Sutras_of_Patanjali) nombran la misma dinámica. [Samskaras](https://en.wikipedia.org/wiki/Samskara_(Indian_philosophy)) son impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella, y las experiencias repetidas profundían la huella. MuninnDB implementa esto directamente: las entradas que co‑activan fortalecen sus pesos de asociación. Los Sutras advierten que los samskaras se acumulan. Sin el contrapeso de [*vairagya*](https://es.wikipedia.org/wiki/Vairagya) (no‑apego, la capacidad de liberar asociaciones fuertes), se solidifican en [*vasanas*](https://en.wikipedia.org/wiki/Vasana), patrones de reacción automáticos que evitan la evaluación consciente. Dejas de ver la situación y empiezas a ejecutar el script.

## 3. The power of deliberate exclusion (Pratyahara)

## 3. The power of deliberate exclusion (Pratyahara)

El resultado más sorprendente de Meta-Harness: los harness ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador de clasificación de texto usa TF-IDF con pares contrastivos y priming de etiquetas (48.6% de precisión, 4 veces menos tokens que el segundo). El ganador de recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. No hay arquitecturas exóticas. Cambiar el harness alrededor de un LLM fijo produce una brecha de rendimiento de 6 veces en el mismo benchmark.

Böckeler lo formula como "keep quality left": cuanto antes filtras, más barato y fiable es el resultado downstream. Sus guías computacionales (linters, esquemas, reglas CLAUDE.md) evitan que categorías enteras de información lleguen al modelo. La cláusula `MinDedupVaultSize` del PR #359 es el mismo principio aplicado a la consolidación: en lugar de ejecutar deduplicación en cada vault y esperar que el modelo maneje los resultados degradados, el sistema aprendió a *no aplicar* deduplicación en vaults pequeños. Exclusión de un proceso, no solo de datos.

La primera versión de esta publicación argumentaba que la interfaz Memory Trait debería devolver metadatos de rechazo junto a los resultados. "Estas 3 entradas coincidieron, y estas 5 fueron excluidas porque de X." Más señal diagnóstica para el LLM. Decisiones mejor informadas. Suena razonable.

Es incorrecto, y el principio yogico de [pratyahara](https://en.wikipedia.org/wiki/Pratyahara) (Yoga Sutras 2.54) explica por qué. Pratyahara a menudo se traduce como "retirada sensorial", pero es engañoso. No es ceguera. Es *atención selectiva*. Los sentidos siguen funcionando. Simplemente dejan de atraer la mente a cada estímulo. Decides qué entra en la conciencia en lugar de reaccionar a lo que llega.

Si le dices al LLM "aquí hay 5 cosas que deliberadamente te estoy ocultando", le has mostrado los objetos y añadido una prohibición. Eso no es retirada sensorial. Es estimulación sensorial con una etiqueta de advertencia. Quien haya meditado sabe el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los harness simples ganan) e invitan al modelo a dudar del filtro ("¿Por qué se excluyó X? Tal vez lo necesite"). El contexto no esencial degrada el rendimiento del modelo incluso cuando es técnicamente preciso, y los metadatos de exclusión son por definición no esenciales para la tarea.

La separación correcta: **el agente ve solo los top‑k resultados. El harness de benchmark ve todo.** La interfaz Memory Trait sigue siendo estrecha: `retrieve → Vec<Entry>`. Pero la implementación de recuperación registra la decisión completa internamente: qué se devolvió, qué se excluyó, por qué, y qué hizo el agente después. El benchmark consume los logs. El agente consume las entradas.

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

El agente nunca ve `excluded`. El harness de benchmark ve todo de él. Si `entry_089` era la respuesta correcta y se filtró porque su peso hebbiano era bajo, eso aparece en el trace, y la próxima iteración de la política de recuperación puede ajustarse.

En el [framework de ingeniería de harness](https://martinfowler.com/articles/harness-engineering.html) de Böckeler: la Memory Trait es una guía computacional (determina qué entra en el contexto). El log de trazas es un sensor computacional (observa lo que sucedió). No se fusionan. Pratyahara no es filtrado consciente en el sentido de *el sistema filtrado estar consciente de la exclusión*. Es filtrado consciente en el sentido de *el diseñador estar consciente*, a través de los logs de trazas, para que la siguiente iteración del filtro mejore. La conciencia pertenece al ingeniero de harness que lee las trazas, no al agente que ejecuta las consultas.

## Where the metaphor breaks

## Where the metaphor breaks

Two places.

First, los [Koshas](https://es.wikipedia.org/wiki/Kosha) (capas corporales vedandes: físico, energético, mental, discriminativo, euforia) implican una jerarquía de lo grueso a lo sutil, con lo sutil siendo "más alto". La ingeniería de harness no tiene tal ordenamiento de valores. Un linter determinista no es "más bajo" que un LLM‑as‑judge. Böckeler señala explícitamente que los sensores computacionales son suficientemente baratos para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos e probabilísticos. En la práctica, quieres *maximizar* la capa "gross", no trascederla. Importar la jerarquía de los Koshas al diseño de harness llevaría a sobre‑invertir en controles inferenciales y sub‑invertir en los deterministas. Lo opuesto de lo que funciona.

Segundo, la práctica yogica busca la liberación del ciclo de respuesta condicionada. La arquitectura de agentes busca una *respuesta condicionada* eficaz. Quieres que el agente desarrolle patrones confiables, no que los disuelva. Vairagya en sentido yogico significa soltar *todo* apego. En ingeniería de harness significa soltar *apegos incorrectos*. El objetivo es una mejor condición, no ausencia de condición. Importar todo el marco soteriológico llevaría a un agente que alcanza iluminación al negarse a recuperar nada. Inútil.

## What this isn't

## What this isn't

Esto no es "sabiduría antigua valida mi arquitectura". La flecha causal corre en sentido contrario: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria e filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en investigación de memoria de agentes no es misticismo. Es ingeniería convergente sobre el mismo problema: ¿cómo gestiona un sistema acotado un flujo de información ilimitado?

Esto tampoco es la primera tentativa de intersección. Los trabajos de Ghosh y Ghosh [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820) y su sucesor Maṇḍūkya-APO cartografían estados védicos de conciencia (los cuatro estados del Māṇḍūkya Upaniṣad: vigilia, sueño, sueño profundo, trascendente) a un ciclo de consolidación sueño‑vigilia para agentes de RL, formalizado con teoria de categorías. La intuición arquitectónica es sólida y el mapeo es serio. Pero ambos papers son explícitamente marcos conceptuales sin validación empírica. Los benchmarks que proponen (FurnitureBench, Atari-57, Intel Loihi) no se han ejecutado. La brecha entre "marco propuesto" y "resultado medido" es donde muere la mayor parte del trabajo interdisciplinario. Las tres hipótesis a continuación están diseñadas para no morir allí.

La pregunta útil no es "¿es el yoga relevante para la IA?" sino "¿qué discriminaciones yogicas específicas generan hipótesis comprobables que los sistemas actuales de memoria no hacen?"

La benchmark inicial ha respondido una pregunta. La deduplicación uniforme en vaults pequeños es dañina, y la cláusula `MinDedupVaultSize` ([PR #359](https://github.com/scrypster/muninndb/pull/359)) la corrigió. Quedan dos hipótesis abiertas. La decaimiento etiquetado por outcome (vrtti nirodha) requiere que el generador de vault sintético demuestre que el decaimiento uniforme disminuye la calidad de recuperación en entradas con diferentes historiales de outcome. La displacement hebbiana (vairagya) requiere que el mismo generador mida si las entradas reforzadas excluyen alternativas más relevantes. Ambas se reducen a una tarea de ingeniería: **el esquema de trazas debe capturar la precisión de recuperación desglosada por propiedades de la entrada**: peso hebbiano, frecuencia de acceso, historial de outcome. Si los datos muestran un problema, las soluciones son directas. Si no, omitimos la complejidad.

Pratyahara ya está implementado correctamente: la Memory Trait devuelve top‑k, punto. El harness de benchmark captura la decisión completa de recuperación. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de esto requiere creer en chakras. Requiere tomar las discriminaciones en serio como heurísticas de ingeniería y medir si mejoran el recuerdo del agente en cargas de trabajo realistas. La benchmark inicial forzó un cambio de diseño. El generador de vault sintético decide el resto.

## Further reading## Further reading

- [Böckeler's harness engineering framework](https://martinfowler.com/articles/harness-engineering.html), la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052), evidencia empírica de que los cambios de harness producen brechas de rendimiento de 6 veces. [Advaitic Policy Optimization](https://www.researchgate.net/publication/389264820), el arte previo más cercano de optimización de políticas advaiticas (conceptual, sin benchmarks todavía). Yoga Sutras 1.2‑1.16, el modelo de filtrado de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb), donde se ponen a prueba las hipótesis. [Benchmark #311](https://github.com/scrypster/muninndb/issues/311), los resultados iniciales. [PR #337](https://github.com/scrypster/muninndb/pull/337), la corrección de saturación de puntuaciones. [PR #359](https://github.com/scrypster/muninndb/pull/359), la guardia de dedup. [Hrafn](https://github.com/5queezer/hrafn), el runtime que se ejecuta en un Raspberry Pi de $10.

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), un runtime agente ligero en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*

---