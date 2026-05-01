---
title: "Tu Gráfico de Conocimiento de Código Necesita Cuatro Capas, No Una"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
description: "La memoria debería ser un grafo. El grafo debería tener cuatro capas. La capa intermedia lleva la navegación. La capa superior convierte la navegación en acción."
images: ["/images/three-layer-code-knowledge-graph-og.png"]
translationHash: "0e623b3b9bf9e2e72ecea70ec245d769"
chunkHashes: "9e6944bc5d80e730,ec5547e06414e078,21030a3bc5a894ce,bf8304f9abff75b0,90c4a0ab21256886,788dd5224f820a57,2886fbcd5acc9517,d713ecba99fef97b,44df79228b76677f,047ffe07cf5f897b,40fb162a3d5dd183"
---
Andrej Karpathy hizo el argumento en una publicación: la memoria es una estructura que habitas, no una caché que recargas en cada solicitud. Cuarenta y ocho horas después, Safi Shamsi lanzó [Graphify](https://github.com/safishamsi/graphify) y escribió *The Memory Layer* a su alrededor. La tesis es que un agente de IA debería recorrer un grafo de conocimiento en lugar de buscar en un índice vectorial, porque las relaciones viven en el espacio vacío entre fragmentos y un almacén vectorial no puede verlas.

Estoy de acuerdo con la tesis. Creo que el libro se detiene una capa antes. Luego lo publiqué y, de inmediato, noté que se detiene dos capas antes.

Generé un grafo Graphify para una base de código de agente de programación la semana pasada. La primera versión era lo obvio. Los nodos eran archivos, clases, funciones, métodos. Las aristas eran `imports`, `calls`, `contains`, `method`. Abrirlo en Obsidian me dio una maraña de hilos. Lo agrupé en comunidades y etiqueté cada una con un nombre de concepto. Mejor. Pero las aristas aún mostraban cosas como `calls×32 / method×7 / contains×11`. Útil como evidencia. No útil como mapa. Entonces reescribí las aristas como frases de relaciones humanas: “impulsa y observa conversaciones”, “provee credenciales a”, “renderiza markdown con”. De repente el grafo se leía como una oración. De pronto un LLM podía orientarse en él.

Eso me dio tres capas. Luego intenté usarlas en una tarea real (“agregar un nuevo proveedor de modelo a este CLI”) y me di cuenta de que necesitaba una cuarta.

**Un grafo de conocimiento de código para un agente LLM debe tener cuatro capas. La capa dos se encarga de la navegación. La capa cuatro realiza el trabajo.**
## Qué Es Esto Realmente

Toma un límite de subsistema real en el tiempo de ejecución de un agente de codificación. La UI de terminal interactiva habla con el ciclo de vida de la sesión del agente. Eso es un hecho arquitectónico real. Ahora hay cuatro maneras diferentes de describirlo.

La capa uno es el grafo de implementación sin procesar:

```text
InteractiveSession.handleInput  --calls-->  AgentSession.send
InteractiveSession              --imports-->  AgentSession
InteractiveSession.render       --calls-->  AgentSession.events.subscribe
... 38 more edges between these two modules
```

La capa dos colapsa archivos y símbolos en comunidades y agrega los enlaces:

```text
Interactive Session Orchestration  --calls×32 / imports×9 / contains×7-->  Agent Session Lifecycle
```

La capa tres reescribe el predicado como una frase humana, con los conteos sin procesar mantenidos como evidencia debajo:

```text
Interactive Session Orchestration  --drives and observes conversations-->  Agent Session Lifecycle
```

La capa cuatro no es ninguna de esas. La capa cuatro es un manual claveado por una tarea:

```text
Playbook: "Add a new model provider"
  intent:           wire a new LLM provider into the CLI
  involved concepts: Provider Auth, Model Registry, CLI Login
  key files:        model-resolver.ts, provider-display-names.ts, args.ts
  validation:       npm run check, then a manual login round-trip
  common pitfalls:  forgot to register the display name, env var fallback order
```

Mismo sistema. Cuatro encuadres diferentes. Ninguno de ellos es la respuesta correcta por sí solo, y solo el cuarto le dice al agente qué hacer realmente.
## Por qué la Capa Uno Por Sí Sola Falla

El grafo crudo es correcto pero inútil. Un repositorio mediano tiene decenas de miles de nodos y cientos de miles de aristas. Ábrelo en cualquier visor de grafos y obtienes una esfera negra sin información. Entrégaselo a un LLM y agotarás la ventana de contexto antes de que el agente tenga la oportunidad de razonar.

Shamsi muestra este punto con una cifra honesta. En el Capítulo 6 de *The Memory Layer*, Graphify comprime una base de código de aproximadamente cinco millones de tokens en unos ciento setenta y seis mil tokens de nodos, aristas y resúmenes de comunidades. Eso es una compresión de 28×. También es la razón por la que la capa uno por sí sola no puede ser el punto de entrada. Todo el atractivo de construir el grafo es que dejas de enviar texto y comienzas a enviar topología. Si luego vuelves a volcar la topología al modelo arista por arista, has hecho que el árbol de archivos sea ligeramente más estructurado y lo llamas progreso.

El grafo crudo también está descalibrado para lo que realmente hace un agente. Un agente no quiere saber que `formatTimestamp` llama a `padStart`. Quiere saber que el visor de exportación renderiza markdown usando un parser incluido, porque eso decide qué archivo editar cuando el usuario informa de un error de renderizado.

Aún necesitas la capa uno. Es la única capa que te permite pasar de un concepto a un archivo y línea precisos. Pero no puede ser el punto de entrada.
## Por Qué La Capa Tres Por Sí Sola Falla

El error opuesto es más seductor. Una vez que tienes predicados humanos como “conduce y observa conversaciones”, el grafo se lee como prosa. Parece la abstracción correcta para un LLM, porque los LLM son buenos con la prosa.

El problema es que los predicados humanos son interpretativos. Son una capa editorial sobre la evidencia. Si los tratas como verdad absoluta, el agente planeará basándose en frases que pueden haber quedado incorrectas desde el último refactor, y no hay una manera fácil de detectar el desvío. El LLM dirá con confianza “el visor de exportaciones renderiza markdown con el parser incluido” incluso después de que alguien haya reemplazado el parser, porque la etiqueta humana no se ha regenerado.

Shamsi anticipa el modo de falla y le da a Graphify la defensa adecuada a nivel de arista. Cada arista lleva una de tres etiquetas de procedencia: `EXTRACTED` (observada en el AST), `INFERRED` (lógicamente implícita con una puntuación de confianza) y `AMBIGUOUS` (evidencia conflictiva, marcada para revisión humana). La confianza se multiplica a lo largo de una ruta, de modo que una cadena inferida de dos saltos con 0.9 y 0.8 colapsa a 0.72 y se puede indicar al agente que rechace cualquier cosa por debajo de un umbral. Esa defensa es correcta. También está definida a la granularidad equivocada si lo que deseas es navegación. Una puntuación de confianza en una sola arista te dice si confiar o no en ese hecho. No te indica qué subsistema examinar primero.

La frase debe ser un hipervínculo, no un hecho. Cada predicado humano debe apuntar a las aristas crudas agregadas que lo justifican. Si esas aristas crudas cambian, la frase es sospechosa.
## La capa que lleva la navegación

La capa dos es la poco glamorosa. Comunidades de archivos unidas por aristas tipificadas agregadas. Sin prosa, sin lenguaje curado a mano, solo clusters estructurales con recuentos en las aristas entre ellos.

Esto es en lo que un agente LLM debería razonar primero cuando necesita encontrar algo.

La razón es la reducción del espacio de búsqueda. Un repositorio tiene cientos de archivos. Un grafo de subsistemas tiene unas pocas docenas de comunidades. Cuando el usuario dice "arregla el error donde la herramienta bash muestra salida obsoleta", el agente no debería hacer una búsqueda por palabras clave en todo el árbol. Debería estar mirando el grafo de comunidades, encontrando "Interfaz de ejecución Bash" y "Orquestación de sesión interactiva", observando a qué otras comunidades conectan, y luego descendiendo a la capa uno para localizar el archivo preciso. Eso son dos saltos en el grafo en lugar de mil coincidencias de grep.

Los recuentos de aristas agregadas también codifican algo que el grafo bruto oculta. Si dos comunidades están conectadas por `calls×32 / imports×9 / events×4`, eso indica un acoplamiento fuerte y cualquier cambio en una probablemente afectará a la otra. Si están conectadas por `contains×1`, apenas se conocen. Los recuentos son la señal de análisis de impacto más económica que tienes.

Pero la capa dos solo responde “¿dónde busco?”. No responde “¿qué hago una vez que estoy allí?”. Esa es la brecha que la capa cuatro llena.
## Capa Cuatro: De la Navegación a la Acción

La capa cuatro es el manual operativo. Un nodo en esta capa no es un concepto como "Autenticación". Es una tarea: "Agregar o modificar el flujo de autenticación del proveedor". El nodo lleva las cosas que un agente realmente necesita para actuar, no las cosas que necesita comprender.

Un nodo útil de la Capa 4 tiene seis campos:

- **Intención.** Lo que el usuario intenta lograr, con sus propias palabras.
- **Conceptos involucrados.** Punteros a la Capa 3 (Auth del Proveedor, Registro de Modelos, etc.).
- **Archivos clave.** Punteros a la Capa 1 (args.ts, model‑resolver.ts).
- **Pasos de validación.** Los comandos o pruebas exactas que demuestran que el cambio funciona.
- **Trampas comunes.** Lo que intentos anteriores de esta tarea hicieron mal.
- **Riesgos de reversión.** Qué se rompe si este cambio se revierte a medio camino.

Ejemplos concretos de una base de código de agente de programación:

```text
Playbook: "Agregar un nuevo proveedor de modelo"
  conceptos:    Auth del Proveedor, Registro de Modelos, CLI Login, Docs
  archivos:     model-resolver.ts, provider-display-names.ts, args.ts, docs/
  validación:   npm run check, luego login round‑trip
  trampas:      olvidar registrar el nombre para mostrar; orden de reserva de variables de entorno
  reversión:    seguro (aditivo); entradas sobrantes del registro son inofensivas

Playbook: "Corregir un error de renderizado TUI"
  conceptos:    Orquestación de Sesión Interactiva, Componentes TUI, Estado del Pie de Página
  archivos:     <component>.tsx, archivo de combinaciones de teclas, punto de entrada de renderizado
  validación:   prueba dirigida al componente, arnés opcional de tmux para verificación visual
  trampas:      estado obsoleto del componente que sobrevive a una recarga en caliente; carreras de renderizado async
  reversión:    seguro; solo UI

Playbook: "Cambiar el comportamiento de una herramienta integrada"
  conceptos:    Herramientas en Tiempo de Ejecución, Ciclo de Vida de Sesión del Agente, Renderizado de Herramientas
  archivos:     definición de la herramienta, enlace en tiempo de ejecución, componente de renderizado UI
  validación:   prueba unitaria de la herramienta, prueba de regresión del renderizado
  trampas:      deriva del esquema de la herramienta rompe las transcripciones; UI asume la forma anterior
  reversión:    arriesgado; las transcripciones antiguas pueden no reproducirse limpiamente
```

Lean estos ejemplos y note lo que no son. No son diagramas de arquitectura. No son resúmenes. No son anclajes de recuperación. Son procedimientos cortos, opinados y repetibles que traducen "el usuario pidió X" a "ve a Y, cambia Z, verifica con W."

La capa tres le dice al agente qué significa el sistema. La capa cuatro le dice al agente qué hacer en ese sistema. El agente lee la capa cuatro primero cuando la tarea es concreta, desciende a través de las capas tres, dos y una para verificar, y solo entonces toca el código fuente. Cuando la tarea es exploratoria y aún no existe un playbook, el agente omite la capa cuatro y comienza en la capa tres. Ambos órdenes de lectura son válidos. Lo importante es que la capa cuatro exista para las tareas recurrentes, porque allí es donde los agentes desperdician más tokens reinventando el mismo plan.

Esta también es la capa con mayor retorno sobre el esfuerzo de escritura. Un puñado de playbooks bien redactados para los cambios más comunes en su base de código mejorará el rendimiento del agente más que cualquier otra inversión de conocimiento. Los agentes dejan de redescubrir los mismos cinco archivos para las mismas cinco tareas cada semana. Dejan de perder la prueba que detecta la misma regresión una y otra vez. Dejan de olvidar la trampa que falló en los últimos tres intentos.
## El flujo de trabajo que implica

Las cuatro capas no son alternativas. Son una canalización con dos puntos de entrada válidos.

```text
Layer 4 (operational playbook)
  agent matches the task to a known recipe
    "the user wants to add a new model provider"
       playbook: "Add a new model provider"
         (or: no playbook exists, fall through to layer 3)

Layer 3 (human ontology)
  agent reads the map for the involved concepts
    "Provider Auth, Model Registry, CLI Login"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "Auth and Credentials cluster, bridged to CLI Startup"

Layer 1 (raw graph)
  agent finds the exact file and function
    "args.ts:parseLoginArgs(), model-resolver.ts:resolveProvider()"

Source code
  agent reads, edits, runs the playbook's validation step
```

Cada capa responde a una pregunta diferente. La capa cuatro responde “¿qué debería hacer?” La capa tres responde “¿qué es esto y por qué existe?” La capa dos responde “¿dónde vive y qué toca?” La capa uno responde “¿cuál es el símbolo preciso que necesito cambiar?” No puedes colapsarlas, porque la pregunta cambia en cada paso.
## Dónde se Sitúa Esto en la Literatura

Tres cuerpos de literatura convergen en esta forma y, en su mayor parte, no se hablan entre sí.

El primero es el análisis de programas. El [code property graph](https://en.wikipedia.org/wiki/Code_property_graph), introducido por Yamaguchi et al. en su artículo IEEE S&P 2014 “Modeling and Discovering Vulnerabilities with Code Property Graphs” (que ganó el IEEE Test‑of‑Time Award en 2024), ya combina tres representaciones clásicas en una sola estructura: el árbol de sintaxis abstracta, el grafo de flujo de control y el grafo de dependencia del programa. El caso de uso original era el descubrimiento de vulnerabilidades, pero la lección se generaliza. Una única representación no puede responder a todas las preguntas que tienes sobre el código, así que compones representaciones y dejas que la consulta elija la porción adecuada. Eso es la capa uno hecha bien, y se ha hecho bien durante más de una década.

El segundo es la recuperación basada en grafos para LLMs. El artículo GraphRAG de Microsoft, ["From Local to Global: A Graph RAG Approach to Query‑Focused Summarization"](https://arxiv.org/abs/2404.16130) de Edge et al. (2024), es explícito sobre el valor de una capa intermedia de comunidad. Construyen un grafo de entidades, lo particionan con el [algoritmo Leiden](https://es.wikipedia.org/wiki/Algoritmo_Leiden), y generan resúmenes por comunidad. La [documentación de GraphRAG](https://microsoft.github.io/graphrag/) es directa sobre lo que esas comunidades te aportan: cada nivel de la jerarquía resultante “representa un nivel diferente de abstracción y resumido”. Ese es el encuadre en capas, en sus propias palabras, aplicado a documentos en lugar de código. Las consultas golpean primero los resúmenes de comunidad y solo descienden a las entidades cuando es necesario. *The Memory Layer* describe el mismo patrón en el Capítulo 5 y trata HybridRAG (una mezcla ajustable `α · vector_score + (1 - α) · graph_score`) como el nuevo predeterminado. Ambos confirman que la capa de comunidad es real y estructuralmente esencial.

El trabajo reciente específico de código está convergiendo en la misma forma. ["Code Graph Model (CGM): A Graph‑Integrated Large Language Model for Repository‑Level Software Engineering Tasks"](https://arxiv.org/abs/2505.16901) de Tao et al. integra la estructura del grafo de código del repositorio en el mecanismo de atención de un LLM y lo combina con un marco RAG de grafos sin agente, alcanzando un 43 % en SWE‑bench Lite como el mejor modelo de peso abierto. ["GraphCodeAgent: Dual Graph‑Guided LLM Agent for Retrieval‑Augmented Repo‑Level Code Generation"](https://arxiv.org/abs/2504.10046) de Li et al. usa un diseño de doble grafo (un grafo de requisitos y un grafo estructural‑semántico de código) y permite que el agente haga múltiples saltos a través de ambos para la recuperación. ["Knowledge Graph Based Repository‑Level Code Generation"](https://arxiv.org/abs/2505.14394) de Athale y Vaddina representa un repositorio como un grafo que captura información estructural y relacional y utiliza recuperación híbrida sobre él.

El tercer cuerpo es el de operaciones, y de ahí proviene la capa cuatro. La ingeniería de confiabilidad del sitio ha tenido runbooks durante dos décadas: procedimientos cortos y opinados vinculados a una alerta o incidente recurrente. El runbook indica al ingeniero de guardia qué panel abrir, qué servicio reiniciar, qué informe post‑mortem archivar. Los agentes de codificación necesitan el mismo artefacto, vinculado a solicitudes de usuario recurrentes en lugar de páginas. Las habilidades Claude Code de Anthropic y los comandos de Cursor son versiones tempranas de esto. Son playbooks que un agente invoca, no grafos que un agente lee, pero la forma es la misma: intención, conceptos involucrados, archivos clave, pasos de validación. El precedente publicado más cercano a la idea de capa cuatro, tratando las tareas como nodos de primera clase en el mismo grafo de conocimiento que el sistema que tocan, es ["Knowledge Graph Modeling‑Driven Large Language Model Operating System for Task Automation"](https://arxiv.org/abs/2408.14494), que modela flujos de trabajo de ingeniería de procesos como nodos KG que el LLM recorre para ensamblar planes ejecutables. La capa cuatro es lo que ocurre cuando haces eso para una base de código: conviertes los playbooks en nodos de primera clase en el mismo grafo que la arquitectura que navegan, de modo que el agente pueda pasar de “qué hacer” a “qué significa” a “dónde vive” sin salir de la estructura.

Ninguno de esos trabajos nombra la división de cuatro capas como una unidad. Las capas una y dos están fuertemente documentadas. La capa tres se documenta como ontología y resumen de comunidad, pero la forma específica de “predicados humanos sobre comunidades de código, regenerados como una caché de capa dos” es una adaptación práctica más que un método publicado. La capa cuatro es la menos estandarizada, pero se alinea con ideas de flujos de trabajo de agentes y memoria procedural en la literatura de operaciones. La contribución aquí es el empaquetado, no cualquiera de las capas individuales: grafo bruto de código → grafo de comunidad → ontología semántica → playbooks operacionales, con evidencia preservada en cada salto y dos direcciones de lectura válidas sobre la pila. *The Memory Layer* describe los “tres cerebros” de Graphify (Tree‑sitter para código, un extractor semántico para prosa, una canalización multimodal para diagramas y audio), pero esos son modalidades de extracción, no capas de navegación, y el libro se detiene en “construye el grafo y deja que el agente lo recorra”. GraphRAG genera resúmenes de comunidad pero los usa como anclas de recuperación para evidencia a nivel de fragmento, no como un mapa permanente legible por humanos. Los artículos específicos de código exponen nodos y aristas crudas al LLM. O el modelo lee una masa estructural, o lee resúmenes en lenguaje natural colapsados para recuperación, o lee un archivo de habilidad desligado de cualquier contexto estructural. La división que me funcionó es mantener la prosa humana como mapa de entrada, enlazarla de nuevo a los bordes estructurales agregados y los símbolos subyacentes, y colocar una capa operativa delgada encima para que las tareas recurrentes obtengan una forma estable.
## Qué cuesta esto

Esto no es gratis. Cuatro cosas cuestan.

Primero, cada capa necesita regeneración cuando el código cambia. La capa uno es automática a partir de un parser. La capa dos es automática a partir de la detección de comunidades. La capa tres es la costosa, porque los predicados humanos requieren una pasada de LLM y se vuelven obsoletos silenciosamente. La mitigación es tratar la capa tres como una caché sobre la capa dos, con una verificación de frescura que vuelva a ejecutar el etiquetador cuando los bordes agregados subyacentes cambien más allá de un umbral.

Segundo, la capa tres es interpretativa. Si dejas que un LLM escriba las frases de predicado, heredas sus alucinaciones. La mitigación es la que *La capa de memoria* ya prescribe para los bordes crudos: fundamentación más procedencia. Cada frase lleva los recuentos de bordes agregados de la capa dos que la justifican, los cuales a su vez llevan las etiquetas `EXTRACTED` / `INFERRED` / `AMBIGUOUS` de Graphify. El agente trata la frase como una hipótesis y las capas inferiores como la prueba.

Tercero, la capa media necesita un algoritmo de detección de comunidades que produzca clústeres estables e interpretables. Leiden funciona, pero la identidad del clúster deriva a medida que el código crece. O fijas los IDs de comunidad entre ejecuciones o aceptas que “sub‑sistema X” pueda referirse a un conjunto ligeramente diferente de archivos el próximo mes. No he resuelto esto de manera limpia.

Cuarto, la capa cuatro es la más costosa de todas de mantener, porque es mayormente escrita a mano. Un manual que dice “editar args.ts y model‑resolver.ts” se vuelve obsoleto en el momento en que alguien renombra el archivo. La mitigación aquí es, nuevamente, la procedencia: cada puntero de archivo clave en un manual debería resolverse a un símbolo de capa uno, y un manual con un puntero obsoleto debería ser marcado y rechazado para ejecución autónoma. Trata los manuales como código, no como documentación. Se revisan, se prueban y se podan.
## Lo que omití

Algunas cosas se dejaron intencionalmente para más adelante:

- **Grafos entre repositorios.** El mismo patrón de cuatro capas debería componerse a través de un monorepo de servicios, pero el algoritmo de la comunidad necesita respetar primero los límites de los paquetes. Aún no está hecho.  
- **Diferencias de ontología versionadas.** La capa tres cambia cuando la arquitectura cambia, y esa diferencia es en sí misma interesante (es el registro de cambios de la arquitectura). No he construido la vista de diferencias.  
- **Lenguaje de consultas.** En este momento el agente navega por las capas leyendo markdown y siguiendo enlaces. Un lenguaje de consultas tipado a través de las cuatro capas, quizás Cypher sobre una exportación de Neo4j de las capas dos y cuatro, sería más rápido, pero es un proyecto separado.  
- **Aristas basadas en embeddings.** Las aristas actuales son estructurales. Añadir aristas de similitud semántica (módulos que resuelven problemas similares sin llamarse entre sí) capturaría acoplamientos latentes, a costa de más ruido. Esto es esencialmente HybridRAG dentro de la capa dos.  
- **Extracción automática de playbooks del historial de PR.** La mayoría de las tareas recurrentes ya ocurrieron varias veces en tu registro de git. Un arranque de la capa cuatro que extraiga PR cerrados para patrones de cambio repetidos es el siguiente paso obvio. Aún no está construido.
## Qué capas debe leer primero el agente

Si la tarea es concreta y recurrente, lee la capa cuatro primero, luego desciende. El manual le dice al agente la respuesta. Las capas inferiores le indican al agente cómo verificarla.

Si la tarea es exploratoria y no hay manual, lee la capa dos primero. El grafo comunitario con aristas tipadas agregadas ofrece la mejor proporción de información a tokens. La capa tres ayuda a incorporar un modelo que nunca ha visto la base de código. La capa uno es obligatoria para la verificación pero nunca debe ser el punto de entrada.

Si solo tienes tiempo para construir una capa ahora, construye la capa dos (se deriva de la detección de comunidades en el grafo de capa uno que ya tienes). Si solo tienes tiempo para escribir una capa a mano, escribe la capa cuatro (unos pocos manuales para las tareas que tu equipo realiza con mayor frecuencia). La capa tres es la más agradable de leer y la menos urgente de construir.

Si estás construyendo un agente de código y tu recuperación es basada en palabras clave sobre la fuente o en vectores sobre fragmentos, estás dejando la señal más fuerte en el suelo. Karpathy tenía razón al decir que la memoria debe ser un grafo. Shamsi tenía razón al decir que puedes desplegar ese grafo en cuarenta y ocho horas. Los pasos restantes son leer el grafo como cuatro cosas, no una, y anotar los manuales que tu agente sigue reinventando.

La habilidad que produce las capas dos y tres a partir de un `graph.json` de Graphify está en `~/.pi/agent/skills/graphify-human-ontology/`. La capa de manuales es mayormente una carpeta de archivos markdown cortos indexados por intención, lo suficientemente ligera como para vivir junto a tu directorio `.claude/skills/` o `.cursor/commands/` hasta que algo más estructurado lo reemplace. Ejecuta Graphify en tu repositorio más grande primero, apunta la habilidad a la salida, luego escribe cinco manuales para las cinco cosas que le pides con mayor frecuencia a un agente. El enredo se vuelve mucho menos feo cuando dejas de intentar leerlo como una sola cosa, y tu agente resulta mucho menos costoso una vez que deja de planificar el mismo cambio desde cero cada martes.

---

Christian Pojoni escribe sobre agentes de IA, grafos de conocimiento y las decisiones de arquitectura que determinan si realmente funcionan. Más en [vasudev.xyz](https://vasudev.xyz).

*La imagen de portada de este artículo fue generada por IA.*