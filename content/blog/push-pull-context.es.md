---
title: "Deja de poner decisiones en CLAUDE.md. Ponlas donde el agente no siempre las lea."
date: 2026-04-19
tags: ["adr", "agents", "architecture", "claude"]
description: "Dos estudios de 2026 discrepan sobre si AGENTS.md ayuda a los agentes de codificación. La disputa tiene sentido una vez que separas el contexto de envío del contexto de obtención."
translationHash: "3d5003214440c678dd5140f1af71e7a6"
chunkHashes: "2b463bedee49dbf5,d28287460d8ade35,624f8e8ebc566cab,9b54877510c78112,941f32bbac660aad,8a6f05f0c1c8728c,f1e4699e315c7f95,6b9c4f367214421b"
---
Dos estudios rigurosos de 2026 midieron si los archivos de contexto para agentes ayudan a los agentes de codificación IA. Llegaron a conclusiones opuestas. El grupo de ETH Zúrich ejecutó SWE‑bench Lite y AGENTbench en varios modelos y [encontró que los archivos AGENTS.md generados por LLM reducían el éxito de la tarea en un 3 % e inflaban el coste de inferencia en un 20 %](https://arxiv.org/abs/2602.11988). Los archivos escritos por desarrolladores ofrecían un aumento marginal del 4 % con el mismo incremento de coste. Un mes antes, [Lulla et al. informaron lo contrario](https://arxiv.org/abs/2601.20404) en un experimento pareado limpio con 124 PR reales de GitHub: la presencia de AGENTS.md redujo el tiempo de ejecución mediano en un 28,64 % y los tokens de salida en un 16,58 %.

Ambos estudios son cuidadosos. Ambos midieron cosas reales. El campo se dividió inmediatamente en campamentos.

La división es evitables. Ambos estudios midieron el mismo artefacto y lo trataron como una única cosa. No lo es.

**Las decisiones pertenecen al contexto de extracción, no al contexto de empuje. Confluir los dos es la razón por la que la mitad de tu CLAUDE.md probablemente te está perjudicando ahora mismo.**
## Empujar contexto versus extraer contexto

Un agente de codificación lee dos tipos de información del proyecto.

El contexto empujado se carga en cada sesión, incondicionalmente. CLAUDE.md, AGENTS.md, copilot-instructions.md. El agente lee el más cercano al iniciar, ya sea que tu tarea lo necesite o no. Paga un impuesto de tokens en cada turno, y la evidencia de ambos estudios anteriores es que el impuesto es aproximadamente del 20 % en tokens de razonamiento sin importar si el archivo ayuda a la tarea específica.

El contexto extraído está en disco y el agente lo lee cuando es relevante. `docs/adr/0007-nautilus-backtest-engine.md`, `docs/specs/mcp-tools.md`, una habilidad en `.claude/skills/`, la fuente real de una función. Costo base cero. El agente busca, abre y lee solo los archivos cuyos nombres coincidan con la tarea actual. Si la decisión no es relevante, no se gastan tokens.

La historia empírica se lee de manera diferente bajo esa perspectiva. Lulla et al. midieron repositorios donde AGENTS.md contenía mayormente comandos de compilación, ejecutores de pruebas y nombres de herramientas. Eso es contexto empujado genuinamente siempre relevante, donde el costo se devuelve mediante el descubrimiento evitado. Los archivos generados por LLM del grupo de ETH Zurich estaban rellenos de panoramas arquitectónicos, árboles de directorios y reglas de estilo que el agente [no necesitaba en contexto porque podía descubrirlas a demanda](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Eso es contexto empujado pagando un impuesto sin reembolso.

Mismo artefacto, contenidos diferentes, resultados opuestos. La métrica que importa no es “¿existe el archivo?” sino “¿qué pusiste en él?”.
## La trampa del CLAUDE.md en la que caen la mayoría de los repositorios

Abre el CLAUDE.md de un repositorio público aleatorio y encontrarás cinco elementos recurrentes. Comandos de compilación y prueba, colocados correctamente como push context. Nombres de herramientas que el agente no inferiría de otro modo, como `uv` o `pnpm`, también correctos. El estudio de ETH descubrió que [las herramientas mencionadas se usan 160 veces más a menudo](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Luego empieza la sobrecarga. Un árbol de directorios del repositorio, que los agentes navegan mediante `ls` y `grep` más rápido que leyendo una versión de texto obsoleta. Reglas de estilo de código como la imposición de camelCase, que es para lo que sirve tu linter, y los datos de entrenamiento del agente ya tienden a favorecer las convenciones de tu lenguaje. Finalmente, la justificación arquitectónica en la línea de elegir Postgres sobre MongoDB por la razón X, que es pull context pretendiendo ser push context.

Esos últimos tres son la sobrecarga. La justificación arquitectónica es la que vale la pena discutir porque la intuición detrás de ella es defendible: si pongo la decisión en CLAUDE.md, el agente la ve en cada sesión y no la volverá a litigar. La falla es que pagas el costo de tokens en cada sesión, incluido el 95 % de las sesiones donde esa decisión es irrelevante, y [el propio harness de Anthropic advierte a Claude que CLAUDE.md puede no ser relevante para la tarea](https://www.humanlayer.dev/blog/writing-a-good-claude-md). Eso es una admisión de que el modelo siempre cargado es defectuoso para cualquier cosa que no sea contenido siempre relevante.

Lo que realmente deseas es que el agente aprenda la decisión en el momento en que toca el código pertinente. Eso es lo que hace pull context.
## Por qué los ADR son contexto de extracción bien hecho

Los Architecture Decision Records, en el [formato de Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), tienen cuatro propiedades que los hacen amigables para los agentes sin ser contexto de inserción.

**Numerados y secuenciales.** `docs/adr/0007-use-klinecharts-for-price-rendering.md`. El agente puede hacer grep en `docs/adr/` para cualquier término y encontrar cada decisión que lo toque. Contexto, no trivialidad.

**Seguimiento de estado.** `Accepted`, `Superseded by ADR-0023`, `Deprecated`. Cuando el agente lee ADR-0007 y ve `Superseded by ADR-0023`, sigue el enlace. La historia de la decisión es navegable sin contaminar un solo archivo.

**Sección de alternativas.** Cada ADR enumera lo que rechazaste y por qué. Esta es la parte que nadie documenta en CLAUDE.md porque sería demasiado larga, y es la parte que impide que un agente "amablemente" cambie tu elección de biblioteca tres meses después. Sin las alternativas documentadas, el agente vuelve a sugerir la opción rechazada porque sus datos de entrenamiento tienen más ejemplos de la alternativa.

**Nunca reescritos.** Si cambias de opinión, escribes un nuevo ADR que sustituye al anterior. El rastro de auditoría es el artefacto. `git log` no te da esto. Te da diffs, no la capa de razonamiento sobre ellos.

El agente no paga tokens por los ADR que no lees. Cuando lee uno, obtiene 200 palabras de contexto de decisión enfocado y estructurado justo en el momento en que es relevante.
## La descomposición completa de push/pull

Para un repositorio con agentes, cuatro tipos de artefactos con cuatro residencias diferentes.

**CLAUDE.md (push).** Menos de 100 líneas. Nombres de herramientas que el agente no inferiría. Comandos de construcción, pruebas y lint no predeterminados. Límites de seguridad ("nunca ejecutar migraciones sin aprobación"). Un puntero a dónde viven los ADR y las especificaciones. Nada más. Si tu CLAUDE.md supera las 200 líneas, estarás cobrando impuestos por sesión sobre contenido irrelevante.

**`docs/adr/` (pull).** Decisiones arquitectónicas vinculantes. Una decisión por archivo. Formato Nygard. Aquí es donde vive la justificación para elegir Nautilus sobre vectorbt.

**`docs/specs/` (pull).** Intención por característica. Qué hace la característica, qué no hace, criterios de aceptación. El agente lee la especificación de la característica que está construyendo actualmente, ignora el resto. Los frameworks de desarrollo basados en especificaciones como [Intent](https://www.augmentcode.com/guides/how-to-build-agents-md) formalizan esto. No necesitas que la herramienta siga el patrón.

**`.claude/skills/` (pull, activado).** Protocolos de flujo de trabajo. Cómo ejecutar QA, cómo abrir un PR, cómo escribir una entrada de blog. Se carga solo cuando la frase desencadenante de la habilidad coincide. Esto es [revelación progresiva](https://github.com/shanraisshan/claude-code-best-practice). El agente ve la descripción de la habilidad, decide cargarla y luego ve el cuerpo.

El hilo común en los niveles pull es que el agente elige qué cargar en función de la relevancia de la tarea. CLAUDE.md es el único nivel donde tú eliges por el agente, y pagas por ello en cada sesión.
## El contra‑argumento del artículo Lore vale la pena leerlo

[El artículo de Ivan Stetsenko de marzo de 2026](https://arxiv.org/abs/2603.15566) sostiene que los ADR operan con una granularidad demasiado gruesa. Capturan “por qué PostgreSQL y no MongoDB”, pero no “por qué este bucle de reintentos tiene tres intentos y no cinco”. El razonamiento a nivel de implementación, que él denomina la Sombra de Decisión, desaparece. Su propuesta son los mensajes de commit estructurados de Git como portadores.

Tiene razón al decir que los ADR tienen un techo de granularidad. La respuesta no es abandonarlos, sino apilarlos. Los mensajes de commit capturan el razonamiento por cambio. Los ADR capturan el razonamiento por decisión. Las especificaciones capturan el razonamiento por característica. CLAUDE.md captura el razonamiento por repositorio. Cada capa tiene su propia residencia en el espectro push/pull, y cada una lleva un grano de decisión diferente.

El error es usar una capa para hacer el trabajo de otra. CLAUDE.md hinchado con justificación arquitectónica es la forma más común de este error. Los mensajes de commit rellenos con contexto a nivel de proyecto son la inversa más rara.
## Lo que no estoy afirmando

Ningún estudio ha aislado ADRs específicamente y medido su impacto en el éxito de la tarea del agente. La evidencia anterior corresponde a archivos de estilo AGENTS.md. El argumento de push/pull es una afirmación arquitectónica extrapolada de los datos de AGENTS.md más el comportamiento conocido de los agentes conscientes del sistema de archivos, no una medición directa. Alguien debería realizar ese experimento. Hasta que lo hagan, trate esto como una hipótesis estructurada, no como un teorema.

Tampoco afirmo que el contexto pull sea gratuito. El agente debe saber dónde buscar. Eso significa que CLAUDE.md debe contener un puntero breve como “Las decisiones de binding viven en `docs/adr/`, ordenadas por número. Lea el ADR relevante antes de cambiar la arquitectura.” Sin el puntero, el agente no descubre el nivel pull. Con él, una línea de contexto push desbloquea cualquier profundidad pull.
## Qué hacer el lunes

Abre el CLAUDE.md de tu repositorio. Recorta cada sección que no sea universalmente relevante para cada sesión. El árbol de directorios va. La guía de estilo va (tu linter lo gestiona). La justificación arquitectónica va. Muévelo a `docs/adr/0001-whatever.md` con el formato Nygard, incluyendo la sección de alternativas que has estado omitiendo.

Añade una línea a CLAUDE.md: `Binding architectural decisions live in docs/adr/. Read the relevant ADR before proposing structural changes.`

Esa única reestructuración es el cambio de mayor apalancamiento que los repositorios agenticos pueden hacer ahora mismo. Cuesta una tarde. Elimina el impuesto del 20 % de tokens de razonamiento en sesiones irrelevantes, preserva el historial de decisiones con mayor fidelidad de lo que CLAUDE.md podría lograr, y proporciona a los colaboradores (humanos y agentes) una pista de auditoría durable.

Los dos estudios no se contradicen. Están midiendo dos estrategias de contenido diferentes bajo un mismo nombre de archivo. Separa push de pull y la contradicción se resuelve.

---

*Christian Pojoni escribe sobre codificación agentica, Rust y infraestructura de trading en [vasudev.xyz](https://vasudev.xyz). Está construyendo [Hrafn](https://github.com/5queezer/hrafn), un framework de agentes en Rust, y contribuye a MuninnDB.*