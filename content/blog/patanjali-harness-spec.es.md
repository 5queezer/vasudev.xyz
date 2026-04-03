---
title: "Patanjali tenía la especificación del filtrado. Nosotros solo escribimos las pruebas."
date: 2026-04-03
tags: ["harness-engineering", "agent-architecture", "memory", "muninndb", "hrafn"]
description: "Tres principios yóguicos que predicen resultados empíricos en la investigación de agent harness. Manual de operaciones de hace 2000 años, benchmarks modernos."
translationHash: "e75092fb9dd33da0674b24df6bb99172"
---
Pasé la semana pasada leyendo dos artículos académicos y un [artículo de Fowler](https://martinfowler.com/articles/harness-engineering.html) sobre harness engineering -- el código que envuelve a un LLM y determina qué se almacena, qué se recupera y qué se presenta al modelo. A mitad de la taxonomía de guías y sensores de Birgitta Böckeler, me di cuenta de que ya había visto esta arquitectura antes. No en un repositorio de código. En los Yoga Sutras.

**Las tradiciones contemplativas resolvieron la ingeniería de contexto hace 2000 años. La comunidad de agentes está redescubriendo sus respuestas, un estudio de ablación a la vez.**

Esto suena a ese tipo de afirmación por la que te echarían a risas de Hacker News. Así que permítanme respaldarla con tres mapeos específicos en los que los principios yóguicos predicen -- no solo coinciden superficialmente con -- resultados empíricos de [Meta-Harness](https://arxiv.org/abs/2603.28052) (Stanford/MIT, marzo de 2026), [MemoryBench](https://arxiv.org/abs/2510.17281) y el [marco de harness engineering](https://martinfowler.com/articles/harness-engineering.html) de Böckeler.

## 1. Vrtti Nirodha: No todo el ruido es igual

Los Yoga Sutras 1.2 definen el yoga como *chitta vrtti nirodha* -- la cesación de las fluctuaciones en el campo mental. Patanjali no dice "borra todo". Él distingue los *kleshas* (distorsiones: apego, aversión, ego, ignorancia, miedo a la muerte) de los *pramanas* (cognición válida: percepción directa, inferencia, testimonio). La práctica es quirúrgica: reducir las distorsiones, preservar la señal.

La publicación de OpenAI sobre harness engineering denomina a esta misma operación "Gestión de Entropía" -- agentes de limpieza periódica que combaten la degradación del código. [Dream Engine](/blog/why-ai-agents-need-sleep/), el sistema de consolidación de MuninnDB, lo hace con umbrales de similitud divididos: 0.95 para la desduplicación normal, 0.85 durante el modo sueño. Pero ninguno de los dos sistemas pregunta *qué tipo* de redundancia está eliminando.

Meta-Harness demostró que esto importa. Su [ablación crítica (Tabla 3)](https://arxiv.org/abs/2603.28052) mostró que los resúmenes de trazas de ejecución generados por LLM tuvieron un rendimiento *peor* que las puntuaciones sin procesar por sí solas -- 38.7 % frente a 41.3 %. Las trazas completas sin procesar alcanzaron el 56.7 %. Los resúmenes fueron un vrtti nirodha mal aplicado: colapsaron el *pramana* (señal diagnóstica) junto con el *klesha* (ruido), destruyendo la información que el optimizador necesitaba.

La implicación de diseño para [MuninnDB](https://github.com/scrypster/muninndb): los pisos de degradación deben reflejar el resultado, no solo la frecuencia de acceso. Un patrón de API verificado y un intento fallido de curl podrían tener tasas de recuperación idénticas, pero un valor de retención radicalmente diferente. Los niveles de confianza del almacén ya ordenan por sensibilidad del contenido (legal, trabajo, personal). Pero hay una trampa en el siguiente paso obvio.

Podrías intentar clasificar las entradas de antemano como pramana o klesha -- verificado frente a distorsionado --, pero esa clasificación es en sí misma el problema difícil. Para casos triviales (HTTP 200 frente a 401), es mecánico. Para la mayoría de las entradas, se requiere juicio semántico, lo que significa tener un LLM en la ruta de degradación, lo que hace que la consolidación sea costosa y no determinista. Patanjali tuvo toda una vida de práctica para refinar su discernimiento. Dream Engine se ejecuta con un disparador cron.

La ruta más sencilla: **escrituras etiquetadas por resultado**. Cuando un agente recupera una entrada y la acción posterior tiene éxito, la entrada recibe una señal `outcome: success`. Cuando la acción falla, `outcome: failure`. El piso de degradación se acopla a la tasa de éxito, no a una categoría epistémica. Esto es esencialmente retroalimentación de bandidos (bandit feedback) en la recuperación -- una idea bien establecida en la recuperación de información, aplicada aquí a la memoria persistente del agente. No se necesita ontología. No se necesita un LLM en el ciclo. En términos yóguicos: no necesitas clasificar el vrtti con antelación -- observas su efecto y dejas que esa observación dé forma a la retención.

---

## 2. Samskara and Vairagya: El refuerzo necesita un contrapeso

Los samskaras son impresiones latentes que moldean la percepción futura. Cada experiencia deja una huella; las experiencias repetidas profundizan el surco. Esto es aprendizaje hebbiano -- "las neuronas que se activan juntas, se conectan juntas" -- y MuninnDB lo implementa directamente: las entradas que se coactivan fortalecen sus pesos de asociación.

Los Yoga Sutras advierten que los samskaras se acumulan. Sin el contrapeso del *vairagya* (no apego, la capacidad de liberar asociaciones fuertes), se calcifican en *vasanas* -- patrones de reacción automáticos que eluden la evaluación consciente. Dejas de ver la situación y comienzas a ejecutar el guion.

[MemoryBench](https://arxiv.org/abs/2510.17281) proporciona evidencia indirecta. Su hallazgo central: los sistemas de memoria de vanguardia (A-Mem, Mem0, MemoryOS) no logran superar de manera consistente a las líneas base ingenuas de RAG que simplemente recuperan desde el contexto sin procesar. El artículo no aísla el refuerzo hebbiano como la causa, pero el patrón encaja: los sistemas que procesan, consolidan y fortalecen recuerdos tienen un rendimiento *peor* que los sistemas que simplemente almacenan y recuperan todo sin modificar. Algo en el pipeline de consolidación está destruyendo la señal. La hipótesis de vasana -- que las asociaciones reforzadas desplazan a alternativas menos activadas pero más relevantes -- es una explicación. Necesita medición directa, y por eso existe el benchmark #311.

La taxonomía de Böckeler proporciona la visión estructural. Ella distingue los sensores computacionales (deterministas, baratos, se ejecutan en cada cambio) de los sensores inferenciales (semánticos, costosos, probabilísticos). El refuerzo hebbiano es un proceso computacional -- se ejecuta automáticamente en cada coactivación. Pero la detección de vasana requiere un juicio inferencial: "esta asociación es fuerte, pero ¿es *correcta* para esta consulta?". Ningún contador de frecuencia puede responder eso.

El mecanismo que falta en MuninnDB es el *debilitamiento* hebbiano explícito -- no solo degradación pasiva, sino corrección activa cuando una entrada fuertemente asociada produce una recuperación de falso positivo. Cuando un agente actúa sobre una entrada recuperada hebbianamente y la acción falla, el peso de asociación debería disminuir, no solo esperar a que Ebbinghaus lo erosione con el tiempo. Pero: esta es una nueva ruta de escritura en Dream Engine, y el principio de benchmark primero se mantiene. Ninguna función se lanza sin evidencia de que el comportamiento actual cause daño.

Hipótesis comprobable para el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) -- el requisito previo abierto; ninguna función se lanza antes de que existan los datos. Medir las tasas de recuperación de falsos positivos para entradas con refuerzo hebbiano frente a entradas sin refuerzo. Pero no te detengas en el acierto/fallo binario. La métrica más precisa es la *tasa de desplazamiento* -- ¿con qué frecuencia una entrada fuertemente asociada pero menos relevante empuja a una entrada más relevante fuera del top-k? Esa es la medición directa de vasana: no solo "se recuperó la cosa incorrecta", sino "la cosa correcta fue desplazada por una recuperación habitual". Si las entradas fortalecidas producen un desplazamiento medible, el vairagya como primitiva de diseño está empíricamente justificado. Si no lo hacen, la degradación pasiva actual es suficiente y nos saltamos la complejidad.

---

## 3. Pratyahara: El poder de la exclusión deliberada

Pratyahara (Yoga Sutras 2.54) a menudo se traduce como "retracción de los sentidos", pero eso es engañoso. No es ceguera -- es *atención selectiva*. Los sentidos siguen funcionando; simplemente dejan de arrastrar la mente hacia cada estímulo. Tú decides qué entra en la conciencia en lugar de reaccionar a lo que sea que llegue.

Este es el problema central de la ingeniería de contexto, y el resultado más sorprendente de Meta-Harness lo confirma. Los harnesses ganadores no son los que llenan la ventana de contexto con todo lo disponible. El ganador en clasificación de texto usa TF-IDF con pares contrastivos y priming de etiquetas. El ganador en recuperación matemática es un programa BM25 de cuatro rutas con predicados léxicos. Políticas de selección simples. Sin arquitecturas exóticas.

Böckeler lo plantea como "keep quality left" -- cuanto antes filtres, más barato y fiable será el resultado aguas abajo. Sus guías computacionales (linters, esquemas, reglas de CLAUDE.md) son mecanismos de pratyahara: evitan que categorías enteras de información lleguen al modelo en absoluto.

La primera versión de este artículo argumentaba que la interfaz de Memory Trait debería devolver metadatos de rechazo junto con los resultados -- "estas 3 entradas coincidieron y estas 5 fueron excluidas por X". Más señal diagnóstica para el LLM. Decisiones mejor informadas. Suena razonable.

Está equivocado, y el propio principio de Pratyahara explica por qué.

Pratyahara significa que los sentidos *dejan de arrastrar la mente hacia sus objetos*. Si le dices al LLM "aquí hay 5 cosas que te estoy ocultando deliberadamente", le has mostrado los objetos y añadido una prohibición. Eso no es retracción sensorial -- es estimulación sensorial con una etiqueta de advertencia. Cualquiera que haya meditado conoce el resultado: "no pienses en un elefante blanco" garantiza que pensarás en el elefante blanco. Concretamente: las explicaciones de rechazo consumen tokens (contradiciendo el hallazgo de Meta-Harness de que los harnesses simples ganan) e invitan al modelo a poner en duda el filtro ("¿Por qué se excluyó X? Quizás lo necesite después de todo"). Los sistemas RAG que incluyen contexto negativo tienen un rendimiento empíricamente inferior a aquellos que simplemente entregan el top-k.

La separación correcta: **el agente solo ve los resultados top-k. El harness del benchmark ve todo.** La interfaz de Memory Trait se mantiene delgada -- `retrieve → Vec<Entry>`. Pero la implementación de la recuperación registra internamente la decisión completa: qué se devolvió, qué se excluyó, por qué y qué hizo el agente después. El benchmark consume los registros. El agente consume las entradas.

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

En la taxonomía de Böckeler: Memory Trait es una guía computacional (determina qué entra en el contexto). El registro de trazas es un sensor computacional (observa lo que sucedió). No se fusionan. Pratyahara no es un filtrado consciente en el sentido de *que el sistema filtrado sea consciente de la exclusión*. Es un filtrado consciente en el sentido de *que el diseñador sea consciente*, a través de los registros de trazas, para que la siguiente iteración del filtro mejore. La conciencia pertenece al ingeniero de harness que lee las trazas, no al agente que ejecuta las consultas.

---

## Where the metaphor breaks

En dos puntos.

Primero, los Koshas (capas corporales védicas -- física, energética, mental, discriminativa, dicha) implican una jerarquía de lo grueso a lo sutil, siendo lo sutil "superior". La ingeniería de harness no tiene tal orden de valor. Un linter determinista no es "inferior" a un LLM-como-juez. Böckeler señala explícitamente que los sensores computacionales son lo suficientemente baratos como para ejecutarse en cada cambio, mientras que los controles inferenciales son costosos y probabilísticos. En la práctica, quieres *maximizar* la capa "gruesa", no trascenderla. Importar la jerarquía de Koshas al diseño del harness te llevaría a sobreinvertir en controles inferenciales e invertir poco en deterministas -- el opuesto a lo que funciona.

Segundo, la práctica yóguica apunta a la liberación del ciclo de respuestas condicionadas. La arquitectura de agentes apunta a una respuesta condicionada *efectiva* -- quieres que el agente desarrolle patrones fiables, no que los disuelva. Vairagya, en el sentido yóguico, significa soltar *todo* apego; en harness engineering significa soltar los apegos *incorrectos*. El objetivo es un mejor condicionamiento, no la ausencia de condicionamiento. Importar el marco soteriológico completo llevaría a un agente que alcanza la iluminación negándose a recuperar cualquier cosa. Poco útil.

---

## What this isn't

Esto no es un "la sabiduría antigua valida mi arquitectura". La flecha causal va en la otra dirección: las tradiciones contemplativas desarrollaron modelos fenomenológicos sofisticados de atención, memoria y filtrado de información a lo largo de milenios de introspección sistemática. Que algunos de esos modelos predigan resultados en la investigación de memoria de agentes no es místico -- es ingeniería convergente frente al mismo problema: ¿cómo gestiona un sistema limitado un flujo de información ilimitado?

Tres candidatos están sobre la mesa. La degradación etiquetada por resultado (vrtti nirodha) requiere el [benchmark #311](https://github.com/scrypster/muninndb/issues/311) para demostrar que una degradación uniforme penaliza la calidad de recuperación en entradas con diferentes historiales de resultados. El desplazamiento hebbiano (vairagya) requiere el mismo benchmark para medir si las entradas fortalecidas desplazan a alternativas más relevantes. Ambos se reducen a una única tarea de ingeniería: **el esquema de traza debe capturar la precisión de recuperación desglosada por propiedades de la entrada** -- peso hebbiano, frecuencia de acceso, historial de resultados. Si los datos muestran un problema, las soluciones son directas. Si no, nos saltamos la complejidad.

Pratyahara ya está implementado correctamente: Memory Trait devuelve el top-k, punto. El harness del benchmark captura la decisión de recuperación completa. El agente no necesita saber qué se excluyó. El ingeniero sí.

Ninguno de estos requiere creer en chakras. Requieren tomar las distinciones en serio como heurísticas de ingeniería y medir si mejoran la recuperación del agente en cargas de trabajo realistas. El benchmark decide.

## Further reading

[El marco de harness engineering de Böckeler](https://martinfowler.com/articles/harness-engineering.html) -- la taxonomía (guías, sensores, computacionales, inferenciales). [Meta-Harness](https://arxiv.org/abs/2603.28052) (arXiv 2603.28052) -- evidencia empírica de que los cambios en el harness producen brechas de rendimiento de 6x. Yoga Sutras 1.2-1.16 -- la especificación de gestión de atención que precede a todo esto. [MuninnDB](https://github.com/scrypster/muninndb) -- donde se ponen a prueba las hipótesis. [Hrafn](https://github.com/5queezer/hrafn) -- el runtime que funciona en una Raspberry Pi de 10 $.

---

*Christian Pojoni desarrolla [Hrafn](https://github.com/5queezer/hrafn), un runtime ligero para agentes en Rust. Publicación anterior: [Why AI Agents Need Sleep](/blog/why-ai-agents-need-sleep/).*