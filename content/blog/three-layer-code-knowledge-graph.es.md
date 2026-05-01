---
title: "Tu gráfico de conocimiento de código necesita tres capas, no una"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
description: "Shamsi's Memory Layer tiene razón al decir que los agentes necesitan un grafo. Se detiene una capa antes. La capa intermedia es la que lleva a un LLM a través de un repositorio."
translationHash: "c63e4fa24305c4c50cc3f8568ad993b8"
chunkHashes: "77ce7eb9b618ff47,9fc4c74354b5a1bb,e39122859526c0ae,bf9f071324cbdcc6,754445b6bf178f72,033d0d53ff1fa0f2,6c18a8f902e510bc,0b994df6c248454c,eb38ad07d0c07a79,1962a179dd445435"
---
Andrej Karpathy hizo el argumento en una publicación: la memoria es una estructura que habitas, no una caché que recargas en cada solicitud. Cuarenta y ocho horas después, Safi Shamsi lanzó [Graphify](https://github.com/safishamsi/graphify) y escribió *The Memory Layer* a su alrededor. La tesis es que un agente de IA debería recorrer un grafo de conocimiento en lugar de buscar en un índice vectorial, porque las relaciones viven en el espacio blanco entre fragmentos y una tienda vectorial no puede verlas.

Estoy de acuerdo con la tesis. Creo que el libro se queda corto en una capa.

Generé un grafo Graphify para una base de código de agente de programación la semana pasada. La primera versión fue lo obvio. Los nodos eran archivos, clases, funciones, métodos. Los bordes eran `imports`, `calls`, `contains`, `method`. Abrirlo en Obsidian me dio una maraña. Lo agrupé en comunidades y etiqueté cada una con un nombre de concepto. Mejor. Pero los bordes seguían diciendo cosas como `calls×32 / method×7 / contains×11`. Útil como evidencia. No útil como mapa. Luego reescribí los bordes como frases de relaciones humanas: “impulsa y observa conversaciones”, “suministra credenciales a”, “renderiza markdown con”. De repente el grafo leía como una oración. De repente un LLM podría orientarse en él.

Luego hice la pregunta obvia. Si la capa de lenguaje humano es tan legible, ¿por qué no omitir las otras dos?

**Un grafo de conocimiento de código para un agente LLM debería tener tres capas, y la capa intermedia es la que hace el trabajo.**
## Qué Es Esto Realmente

Toma un límite de subsistema real en el tiempo de ejecución de un agente de codificación. La UI de terminal interactiva se comunica con el ciclo de vida de la sesión del agente. Eso es un hecho arquitectónico real. Hay tres maneras diferentes de describirlo.

La capa uno es el grafo de implementación crudo:

```text
InteractiveSession.handleInput  --calls-->  AgentSession.send
InteractiveSession              --imports-->  AgentSession
InteractiveSession.render       --calls-->  AgentSession.events.subscribe
... 38 more edges between these two modules
```

La capa dos colapsa archivos y símbolos en comunidades y agrega las aristas:

```text
Interactive Session Orchestration  --calls×32 / imports×9 / contains×7-->  Agent Session Lifecycle
```

La capa tres reescribe el predicado como una frase humana, con los recuentos crudos mantenidos como evidencia debajo:

```text
Interactive Session Orchestration  --drives and observes conversations-->  Agent Session Lifecycle
```

Mismo hecho. Tres encuadres diferentes. Ninguno de ellos es la respuesta correcta por sí solo.
## Por qué la Capa Uno por Sí Sola Falla

El grafo crudo es correcto pero inútil. Un repositorio mediano tiene decenas de miles de nodos y cientos de miles de aristas. Ábrelo en cualquier visor de grafos y obtendrás una bola negra sin información. Alimentarlo a un LLM y agotarás la ventana de contexto antes de que el agente tenga la oportunidad de razonar.

Shamsi expone este punto con una cifra concreta. En el Capítulo 6 de *The Memory Layer*, Graphify comprime una base de código de aproximadamente cinco millones de tokens en alrededor de ciento setenta y seis mil tokens de nodos, aristas y resúmenes de comunidades. Eso representa una compresión de 28×. También es la razón por la cual la capa uno por sí sola no puede ser el punto de entrada. Todo el atractivo de construir el grafo es que dejas de enviar texto y comienzas a enviar topología. Si luego vuelves a volcar la topología al modelo arista por arista, lo único que has hecho es estructurar un poco más el árbol de archivos y llamarlo progreso.

El grafo crudo también está descalibrado respecto a lo que realmente hace un agente. Un agente no quiere saber que `formatTimestamp` llama a `padStart`. Quiere saber que el visor de exportación renderiza markdown usando un parser incluido, porque eso determina qué archivo editar cuando el usuario reporta un error de renderizado.

Aún necesitas la capa uno. Es la única capa que te permite pasar de un concepto a un archivo y línea precisos. Pero no puede ser el punto de entrada.
## Por qué la capa tres sola falla

El error opuesto es más seductor. Una vez que tienes predicados humanos como “conduce y observa conversaciones”, el grafo se lee como prosa. Parece la abstracción adecuada para un LLM, porque los LLM son buenos en prosa.

El problema es que los predicados humanos son interpretativos. Son una capa editorial sobre la evidencia. Si los tratas como verdad absoluta, el agente planificará basándose en frases que pueden haber sido incorrectas desde el último refactor, y no hay una forma fácil de detectar la desviación. El LLM dirá con confianza “el visor de exportación renderiza markdown con el analizador incluido” incluso después de que alguien haya reemplazado el analizador, porque la etiqueta humana no se ha regenerado.

Shamsi anticipa el modo de falla y le da a Graphify la defensa correcta a nivel de arista. Cada arista lleva una de tres etiquetas de procedencia: `EXTRACTED` (observado en el AST), `INFERRED` (lógicamente implícito con una puntuación de confianza) y `AMBIGUOUS` (evidencia conflictiva, señalada para revisión humana). La confianza se multiplica a lo largo de una ruta, de modo que una cadena inferida de dos saltos con 0.9 y 0.8 colapsa a 0.72 y se le puede decir al agente que rechace cualquier cosa por debajo de un umbral. Esa defensa es correcta. También está definida a la granularidad equivocada si quieres navegación. Una puntuación de confianza en una sola arista te dice si confiar en ese hecho. No te dice qué subsistema mirar primero.

La frase necesita ser un hipervínculo, no un hecho. Cada predicado humano debe apuntar de vuelta a las aristas crudas agregadas que lo justifican. Si esas aristas crudas cambian, la frase es sospechosa.
## La Capa que Realmente Lleva al Agente

La capa dos es la menos glamurosa. Comunidades de archivos unidas por aristas tipadas agregadas. Sin prosa, sin lenguaje curado a mano, solo clústeres estructurales con recuentos en las aristas entre ellos.

Esto es en lo que un agente LLM debería razonar primero.

La razón es la reducción del espacio de búsqueda. Un repositorio tiene cientos de archivos. Un grafo de subsistemas tiene unas pocas docenas de comunidades. Cuando el usuario dice "arregla el error donde la herramienta bash imprime salida obsoleta", el agente no debería hacer una búsqueda por palabras clave en todo el árbol. Debería estar mirando el grafo de comunidades, encontrando "Interfaz de Ejecución Bash" y "Orquestación de Sesiones Interactivas", observando a qué otras comunidades se conectan, y luego descendiendo a la capa uno para localizar el archivo preciso. Eso son dos saltos en el grafo en lugar de mil coincidencias de grep.

Los recuentos de aristas agregadas también codifican algo que el grafo bruto oculta. Si dos comunidades están conectadas por `calls×32 / imports×9 / events×4`, eso indica un acoplamiento fuerte y cualquier cambio en una probablemente afectará a la otra. Si están conectadas por `contains×1`, apenas se conocen. Los recuentos son la señal de análisis de impacto más barata que tienes.
## El flujo de trabajo que implica

Las tres capas no son alternativas. Son una canalización.

```text
Layer 3 (human ontology)
  agent reads the map, picks a conceptual route
    "the user wants to change how exports render markdown"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "HTML Session Export Viewer, bridged to Markdown Rendering Engine"

Layer 1 (raw graph)
  agent finds the exact file and function
    "themes/export/render.ts, parseMarkdown(), line 84"

Source code
  agent reads, edits, verifies
```

Cada capa responde a una pregunta diferente. La capa tres responde "qué es esto y por qué existe". La capa dos responde "dónde vive y qué toca". La capa uno responde "cuál es el símbolo preciso que necesito cambiar". No puedes colapsarlas, porque la pregunta cambia en cada paso.
## Dónde se Sitúa Esto en la Literatura

Dos literaturas convergen en esta forma y mayormente no se comunican entre sí.

La primera es análisis de programas. El [code property graph](https://en.wikipedia.org/wiki/Code_property_graph), introducido por Yamaguchi et al. en su artículo de IEEE S&P 2014 “Modeling and Discovering Vulnerabilities with Code Property Graphs” (que ganó el IEEE Test-of-Time Award en 2024), ya combina tres representaciones clásicas en una única estructura: el árbol de sintaxis abstracta, el grafo de flujo de control y el grafo de dependencia de programa. El caso de uso original era el descubrimiento de vulnerabilidades, pero la lección se generaliza. Una única representación no puede responder a todas las preguntas que tienes sobre el código, así que compones representaciones y dejas que la consulta elija el fragmento correcto. Eso es la capa uno bien hecha, y se ha hecho bien durante más de una década.

La segunda es recuperación basada en grafos para LLMs. El artículo GraphRAG de Microsoft, ["From Local to Global: A Graph RAG Approach to Query-Focused Summarization"](https://arxiv.org/abs/2404.16130) de Edge et al. (2024), es explícito sobre el valor de una capa intermedia de comunidad. Construyen un grafo de entidades, lo particionan con el [algoritmo de Leiden](https://es.wikipedia.org/wiki/Leiden_algorithm), y generan resúmenes por comunidad. Las consultas alcanzan primero los resúmenes de comunidad y solo descienden a las entidades cuando es necesario. Eso es exactamente la capa dos, aplicada a documentos en lugar de código. *La Capa de Memoria* describe el mismo patrón en el Capítulo 5 y trata a HybridRAG (una combinación ajustable `α · vector_score + (1 - α) · graph_score`) como el nuevo predeterminado. Ambos confirman que la capa de comunidad es real y estructuralmente esencial.

Trabajos recientes específicos de código están convergiendo en la misma forma. ["Code Graph Model (CGM): A Graph-Integrated Large Language Model for Repository-Level Software Engineering Tasks"](https://arxiv.org/abs/2505.16901) de Tao et al. integra la estructura del grafo de código del repositorio en el mecanismo de atención de un LLM y lo combina con un marco de Graph RAG sin agente, alcanzando un 43 % en SWE‑bench Lite como el mejor modelo de peso abierto. ["GraphCodeAgent: Dual Graph-Guided LLM Agent for Retrieval-Augmented Repo-Level Code Generation"](https://arxiv.org/abs/2504.10046) de Li et al. usa un diseño de doble grafo (un grafo de requisitos y un grafo de código estructural‑semántico) y permite que el agente haga múltiples saltos entre ambos para la recuperación. ["Knowledge Graph Based Repository-Level Code Generation"](https://arxiv.org/abs/2505.14394) de Athale y Vaddina representa un repositorio como un grafo que captura información estructural y relacional y utiliza recuperación híbrida sobre él.

Lo que ninguno de estos trabajos expone claramente es la tercera capa. *La Capa de Memoria* describe los “tres cerebros” de Graphify (Tree‑sitter para código, un extractor semántico para prosa, una canalización multimodal para diagramas y audio), pero esos son modalidades de extracción, no capas de navegación. El libro se detiene en “construye el grafo y deja que el agente lo recorra”. GraphRAG genera resúmenes de comunidad pero los usa como anclas de recuperación para evidencia a nivel de fragmentos, no como un mapa legible permanente. Los artículos específicos de código exponen nodos y aristas crudas al LLM. O el LLM lee un “puré” estructural o lee resúmenes en lenguaje natural que han sido colapsados para la recuperación. La división que me funcionó es mantener la prosa humana como mapa de punto de entrada pero siempre enlazarla de vuelta a los bordes estructurales agregados, que a su vez enlazan a los símbolos. Tres capas, una dirección de lectura, evidencia preservada en cada salto.
## Qué cuesta esto

No es gratuito. Tres cosas pesan.

Primero, cada capa necesita regeneración cuando el código se mueve. La capa uno es automática a partir de un parser. La capa dos es automática a partir de la detección de comunidades. La capa tres es la costosa, porque los predicados humanos requieren un pase de LLM y se vuelven obsoletos silenciosamente. La mitigación es tratar la capa tres como una caché sobre la capa dos, con una verificación de frescura que vuelva a ejecutar el etiquetador cuando los bordes agregados subyacentes cambien más allá de un umbral.

Segundo, la capa tres es interpretativa. Si dejas que un LLM escriba las frases de predicado, heredas sus alucinaciones. La mitigación es la que *La capa de memoria* ya prescribe para los bordes crudos: fundación más procedencia. Cada frase lleva los recuentos agregados de bordes de la capa dos que la justifican, los cuales a su vez llevan las etiquetas `EXTRACTED` / `INFERRED` / `AMBIGUOUS` de Graphify. El agente trata la frase como una hipótesis y las capas inferiores como la prueba.

Tercero, la capa intermedia necesita un algoritmo de detección de comunidades que produzca clústeres estables e interpretables. Leiden funciona, pero la identidad del clúster deriva a medida que el código crece. O bien anclas los IDs de comunidad entre ejecuciones o aceptas que “sub‑sistema X” pueda significar un conjunto ligeramente diferente de archivos el próximo mes. No lo he resuelto de forma limpia.
## Lo que omití

Algunas cosas se pospusieron intencionalmente:

- **Grafos跨仓库.** El mismo patrón de tres capas debería componerse a través de un monorepo de servicios, pero el algoritmo de la comunidad necesita respetar primero los límites de los paquetes. Aún no está hecho.  
- **Diferencias de ontología versionada.** La capa tres cambia cuando la arquitectura cambia, y esa diferencia es en sí misma interesante (es el registro de cambios de la arquitectura). No he construido la vista de diferencias.  
- **Lenguaje de consulta.** En este momento el agente navega por las capas leyendo markdown y siguiendo enlaces. Un lenguaje de consulta tipado a través de las tres capas, tal vez Cypher sobre una exportación a Neo4j de la capa dos, sería más rápido, pero es un proyecto separado.  
- **Aristas basadas en embeddings.** Las aristas actuales son estructurales. Añadir aristas de similitud semántica (módulos que resuelven problemas similares sin llamarse entre sí) capturaría acoplamientos latentes, al costo de más ruido. Esto es esencialmente HybridRAG dentro de la capa dos.
## Qué capa debe leer primero el agente

Si solo tienes tiempo para integrar una capa en tu agente, integra la capa dos. El grafo comunitario con aristas tipadas agregadas es la mejor proporción de información a tokens. La capa tres es un extra agradable que ayuda en la incorporación. La capa uno es obligatoria para la verificación, pero nunca debe ser el punto de entrada.

Si estás construyendo un agente de código y tu recuperación es por palabra clave sobre la fuente o por vector sobre fragmentos, estás dejando la señal más fuerte en el suelo. Karpathy tenía razón al decir que la memoria debería ser un grafo. Shamsi tenía razón al afirmar que puedes entregar ese grafo en cuarenta y ocho horas. El paso restante es dejar de leer el grafo como una sola cosa. El grafo estructural ya existe en tu AST. Agrúpalo, etiqueta los puentes y permite que el agente recorra el mapa antes de recorrer el árbol.

La habilidad que produce las tres capas a partir de un `graph.json` de Graphify está en `~/.pi/agent/skills/graphify-human-ontology/`. Ejecuta Graphify en tu repositorio más grande primero, luego apunta la habilidad a la salida. Obtendrás los diagramas etiquetados, las notas de evidencia y el lienzo. El maraña se vuelve mucho menos fea cuando dejas de intentar leerla como una sola cosa.

---

Christian Pojoni escribe sobre agentes de IA, grafos de conocimiento y las decisiones de arquitectura que determinan si realmente funcionan. Más en [vasudev.xyz](https://vasudev.xyz).