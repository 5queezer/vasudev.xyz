---
title: "Por qué los agentes de IA necesitan dormir"
date: 2026-03-28
tags: ["ai", "memory", "muninndb", "architecture"]
description: "Los agentes de IA capturan memorias, pero nunca las consolidan. Así es como el Dream Engine de MuninnDB se inspira en la neurociencia para solucionarlo."
images: ["/images/dream-engine.png"]
translationHash: "aff3bf970bc1e9e4c4fb6cd6ef0dd437"
---
Contribuyo a una base de datos cognitiva para agentes de IA llamada [MuninnDB](https://github.com/scrypster/muninndb). Almacena todo: notas de sesiones, contexto de proyectos, observaciones de trabajo, documentación legal. Después de unas semanas de uso diario, las entradas se acumulan. Encontrar cosas todavía funciona -- la búsqueda semántica es buena para la recuperación. Pero el almacén en sí mismo se estaba deteriorando. Entradas casi duplicadas de sesiones que cubrían el mismo tema. Datos obsoletos que son reemplazados por otros más nuevos. Ningún sistema para distinguir una "nota legal crítica" de un "comentario superficial sobre el networking de Docker".

El problema no es la captura. Todos los sistemas de memoria dominan la captura. El problema es lo que ocurre entre sesiones -- que suele ser nada.

**Los agentes de IA acumulan recuerdos de la misma manera que los acumuladores compulsivos acumulan periódicos. La solución no es una mejor búsqueda. Es dormir.**

## Lo que hace realmente el sueño

La consolidación de la memoria humana durante el sueño no es una copia de seguridad. Es un proceso activo y destructivo. El hipocampo reproduce experiencias recientes, la neocorteza las integra en estructuras de conocimiento existentes y el cerebro debilita activamente los recuerdos que no se reforzaron. Te despiertas con menos recuerdos que aquellos con los que te acostaste, y ese es el propósito.

Tres propiedades son relevantes para el diseño de sistemas de IA. Primero, la consolidación es selectiva: los recuerdos importantes se fortalecen, el ruido se debilita. Segundo, descubre conexiones: el cerebro vincula conceptos entre dominios durante el sueño REM. Tercero, resuelve conflictos: los recuerdos contradictorios se adjudican, prevaleciendo las versiones más recientes o más reforzadas.

Ningún sistema de memoria de IA convencional hace nada de esto. La mayoría se limita, en el mejor de los casos, a la desduplicación.

## Estado de la técnica

La idea no es nueva. Los investigadores han estado explorando el concepto desde múltiples direcciones.

Zhong et al. introdujeron [MemoryBank](https://arxiv.org/abs/2305.10250) (2023), un sistema de memoria para LLM con curvas de olvido de Ebbinghaus: los recuerdos se degradan con el tiempo a menos que se refuercen. El modelo ACT-R existente de MuninnDB se basa en este fundamento.

El artículo "Language Models Need Sleep" en [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) propuso un proceso explícito de "Dreaming" para transferir recuerdos frágiles a corto plazo a un conocimiento estable a largo plazo: el marco teórico más cercano a lo que estamos construyendo.

El marco [SleepGate](https://arxiv.org/abs/2603.14517) de Xie (2026) añadió etiquetado temporal consciente de conflictos y una puerta de olvido, reduciendo la interferencia proactiva de O(n) a O(log n). La idea clave: necesitas saber *cuándo* se aprendió algo para resolver contradicciones, no solo *qué* se aprendió.

Y Anthropic ha estado probando [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) para Claude Code -- un proceso en segundo plano que consolida archivos de memoria entre sesiones. Funciona con archivos de texto plano. Razonable para un asistente de código. No es suficiente para una base de datos cognitiva.

## La brecha

MuninnDB ya tenía cubierta la parte de captura: embeddings vectoriales, decaimiento de Ebbinghaus, aprendizaje de asociación hebbiana y un worker de consolidación en segundo plano que realiza desduplicación algorítmica cada 6 horas. Lo que no podía hacer: razonar sobre *por qué* dos entradas son similares, resolver contradicciones o descubrir conexiones entre dominios. Tenía una memoria. No tenía sueño.

## El Motor de sueños

El Motor de sueños amplía la cadena de consolidación existente con inteligencia de LLM. Se ejecuta entre sesiones: se activa automáticamente al iniciar el servidor (la metáfora de "despertar") o manualmente a través de la CLI.

### Condiciones de activación

Dos condiciones deben cumplirse antes de que se ejecute un sueño: al menos 12 horas desde el último sueño y al menos 3 nuevas entradas escritas desde el último sueño. Esto evita el procesamiento innecesario en un almacén inactivo. Estas limitaciones pueden omitirse con `--force` para ejecuciones manuales.

### La cadena de procesamiento

El Motor de sueños reutiliza cuatro fases de consolidación existentes, añade tres nuevas y modifica una. La Fase 0 y el umbral de desduplicación configurable se integraron en [PR #306](https://github.com/scrypster/muninndb/pull/306). Las fases de LLM (2b, 4, 6) están diseñadas y especificadas para un PR de seguimiento.

**Fase 0 (nueva, integrada): Orientar.** Escaneo de solo lectura de cada bóveda. Cuenta entradas, verifica la cobertura de embeddings, calcula promedios de puntuaciones de relevancia y estabilidad, detecta bóvedas legales. Esto construye el mapa antes de tocar nada.

**Fase 1 (existente): Reproducción.** Reproducción de activaciones para actualizar los pesos de asociación hebbiana. Sin cambios.

**Fase 2 (existente, modificada, integrada): Desduplicar.** La fase de desduplicación algorítmica, pero con un umbral dual. En el modo de consolidación normal, las entradas con similitud de coseno >= 0.95 se fusionan automáticamente como antes. En el modo de sueño, el umbral baja a 0.85. Las entradas en el rango de 0.85-0.95 *no* se fusionan automáticamente: se marcan como clústeres casi duplicados y se pasan a la siguiente fase para revisión por LLM. Esta es la decisión arquitectónica clave: dejar que el algoritmo maneje los casos obvios y que el LLM maneje los ambiguos.

**Fase 2b (nueva, para un PR de seguimiento): Consolidación con LLM.** Los clústeres casi duplicados y cualquier contradicción detectada se envían a un LLM configurado. El LLM devuelve JSON estructurado: operaciones de fusión, resoluciones de contradicciones, sugerencias de conexiones entre bóvedas, recomendaciones de estabilidad y una entrada narrativa en el diario. El LLM no crea enlaces automáticamente entre bóvedas: solo sugiere. Un humano revisa las sugerencias en el diario de sueño.

**Fase 3 (existente): Promoción de esquema.** Sin cambios.

**Fase 4 (nueva, para un PR de seguimiento): Estabilidad bidireccional.** Aquí es donde ocurre el olvido. Las entradas de alta señal (accedidas frecuentemente, reforzadas recientemente mediante coactivación hebbiana o recomendadas por el LLM) reciben un aumento de estabilidad de 1.2x. Las entradas de baja señal (rara vez accedidas, antiguas, baja relevancia, no promovidas por el LLM) se debilitan a 0.8x con un límite inferior de 14 días: nunca caen por debajo de la estabilidad predeterminada. Las recomendaciones del LLM anulan los ajustes basados en reglas. Esto modela el efecto de espaciamiento: las entradas que se recuperan se mantienen fuertes, las que no se desvanecen gradualmente.

**Fase 5 (existente): Inferencia transitiva.** Sin cambios.

**Fase 6 (nueva, para un PR de seguimiento): Diario de sueños.** La narrativa del LLM más el informe de consolidación se formatean en una entrada legible por humanos y se añaden a `~/.muninn/dream.journal.md`. Esta es la salida que realmente lees. Te dice qué conexiones se descubrieron, qué se fortaleció, qué se limpió y qué se omitió.

### Niveles de confianza por bóveda

No todas las bóvedas son iguales y no todos los proveedores de LLM son iguales. MuninnDB aplica niveles de confianza por bóveda:

Las bóvedas legales omiten por completo la Fase 2b: nunca se envían a ningún LLM, ni siquiera a uno local. Las entradas legales se conservan literalmente y nunca son tocadas por la consolidación.

Las bóvedas de trabajo y personales están restringidas a Ollama local o a la API de Anthropic. Nunca se envían a OpenAI ni a otros proveedores.

Las bóvedas globales y de proyecto pueden usar cualquier proveedor configurado.

Esto es configurable, no está codificado de forma rígida. El orden de resolución prioriza primero Ollama (local, sin datos que salgan de la máquina), luego Anthropic y finalmente OpenAI, siempre que la política de la bóveda lo permita.

### Modelo de ejecución

La metáfora de sueño/despertar se asigna directamente al ciclo de vida del servidor. Cuando MuninnDB se detiene (`muninn stop`), escribe un archivo sidecar `dream.due` en el directorio de datos. Cuando se inicia nuevamente (`muninn start`), verifica el archivo y las condiciones de activación. Si ambas se cumplen, ejecuta un sueño antes de abrir los puertos. Si el sueño supera un tiempo de espera configurable (predeterminado 60 segundos), se aborta y arranca con normalidad. El servidor nunca se bloquea indefinidamente esperando un sueño.

Para uso manual: `muninn dream --dry-run` muestra lo que sucedería sin escribir nada. La ejecución simulada sigue generando la narrativa completa del diario y la imprime en stdout con un encabezado `[DRY RUN]` header. Esto es esencial para la confianza: puedes ver exactamente lo que haría el motor antes de permitirle escribir.

## Lo que dejé fuera

**Autoenlace de sugerencias entre bóvedas.** El Motor de sueños sugiere conexiones pero nunca las crea automáticamente. Un humano lee el diario y decide. La confianza va antes que la automatización.

**Uso compartido de memoria entre múltiples agentes.** MuninnDB es un usuario, una instancia. La memoria compartida entre agentes implica un modelo de amenazas completamente distinto.

**Alertas temporales.** El LLM podría notar "esta clave de API caduca en 4 días", pero el seguimiento de fechas de caducidad es una función, no consolidación. Fuera del alcance para la v1.

**Modelado de emociones.** La puntuación de saliencia es un indicador aproximado. La ponderación emocional real requiere señales que un sistema basado en texto no posee. Aplazado.

## El diario de sueños

Esto es lo que producirá una ejecución de sueño una vez que las fases de LLM se envíen en un PR de seguimiento:

```
---
## 2026-03-28T06:00:00Z -- Dream

**Connections discovered:**
- Your note about DNS timeout in the k8s cluster shares the same
  root cause as the prod incident from March 21. (suggested link)

**Strengthened:**
- 3 memories about auth patterns reinforced (accessed 8+ times)

**Cleaned up:**
- Merged 2 near-duplicate notes about Docker networking
- Resolved 1 contradiction: old API endpoint superseded by new one

*Scanned 47 entries across 3 vaults (legal: 8 skipped) in 4.2s*
```

Cada mañana, lees de qué soñó tu sistema de memoria. Las conexiones que notó. El ruido que limpió. Las contradicciones que resolvió. Es un registro de cambios para tu conocimiento, redactado en prosa. MuninnDB es el backend de memoria cognitiva para [Hrafn](https://github.com/5queezer/hrafn), un entorno de ejecución de agentes de IA ligero y modular.

## Pruébalo

La base de solo lectura (Fase 0 + desduplicación configurable + CLI para dry-run) se integró en [PR #306](https://github.com/scrypster/muninndb/pull/306) y ya está fusionada. Las fases de escritura (estabilidad bidireccional, consolidación con LLM, diario) seguirán en un PR separado. La especificación de diseño completa se encuentra en el repositorio, en `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni construye infraestructura para agentes de IA. Hrafn está en [github.com/5queezer/hrafn](https://github.com/5queezer/hrafn). MuninnDB está en [github.com/scrypster/muninndb](https://github.com/scrypster/muninndb).*