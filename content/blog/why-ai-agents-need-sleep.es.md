---
title: "Por qué los agentes de IA necesitan dormir"
date: 2026-03-28
tags: ["ai", "memory", "llm", "muninndb", "architecture"]
description: "Los agentes de IA capturan recuerdos pero nunca los consolidan. Así es como el Dream Engine de MuninnDB se inspira en la neurociencia para solucionarlo."
images: ["/images/dream-engine.png"]
translationHash: "1bc75a39750f262e2b285a4678a43346"
---
Contribuyo a una basede datos cognitiva para agentes de IA llamada [MuninnDB](https://github.com/scrypster/muninndb). Almacena todo: notas de sesión, contexto del proyecto, observaciones laborales, documentación legal. Después de unas pocas semanas de uso diario, las entradas se acumulan. Encontrar cosas sigue funcionando -- la búsqueda semántica es buena para la recuperación. Pero el almacén en sí mismo estaba pudriéndose. Entradas de duplicados cercanos de sesiones que cubrían el mismo terreno. Factos obsoletos superados por los más nuevos. No hay un sistema para distinguir "nota legal crítica" de "comentario distractor sobre Docker networking".

El problema no es la captura. Cada sistema de memoria consigue la captura. El problema es lo que ocurre entre sesiones -- lo cual suele ser nada.

**Los agentes de IA acumulan memorias como los acaparadores acumulan periódicos. La solución no es una búsqueda mejor. Es dormir.**

## Qué hace realmente el sueño

La consolidación de la memoria humana durante el sueño no es una copia de seguridad. Es un proceso activo y destructivo. El hipocampo repliega experiencias recientes, el neocortex las integra en estructuras de conocimiento existentes, y el cerebro debilita activamente los recuerdos que no se reforzaron. Despiertas con menos recuerdos de los que te acostaste, y eso es el punto.

Tres propiedades son relevantes para el diseño de sistemas de IA. Primero, la consolidación es selectiva -- los recuerdos importantes se refuerzan, el ruido se debilita. Segundo, descubre conexiones -- el cerebro enlaza conceptos a través de dominios durante el sueño REM. Tercero, resuelve conflictos -- los recuerdos contradictorios se adjudican, con versiones más recientes o más reforzadas ganando.

Ningún sistema de memoria de IA convencional hace ninguna de estas cosas. En el mejor de los casos solo hacen deduplicación.

## Arte previo

La idea no es nueva. Investigadores la han estado explorando desde varios ángulos.

Zhong et al. introdujeron [MemoryBank](https://arxiv.org/abs/2305.10250) (2023), un sistema de memoria de LLM con curvas de olvido de Ebbinghaus -- los recuerdos decayen con el tiempo a menos que se refuercen. El modelo ACT-R existente de MuninnDB se apoya en esta base.

El artículo "Language Models Need Sleep" en [OpenReview](https://openreview.net/forum?id=iiZy6xyVVE) (2025) propuso un proceso explícito de "Dreaming" para transferir recuerdos frágiles de corto plazo a conocimiento estable a largo plazo -- el marco teórico más cercano a lo que estamos construyendo.

El marco [SleepGate](https://arxiv.org/abs/2603.14517) de Xie (2026) añadió etiquetado temporal consciente de conflictos y una puerta de olvido, reduciendo la interferencia proactiva de O(n) a O(log n). La idea clave: necesitas saber *cuándo* se aprendió algo para resolver contradicciones, no solo *qué* se aprendió.

Y Anthropic ha estado probando [Auto Dream](https://dev.to/akari_iku/does-claude-code-need-sleep-inside-the-unreleased-auto-dream-feature-2n7m) para Claude Code -- un proceso en segundo plano que consolida archivos de memoria entre sesiones. Funciona con archivos de texto plano. Es razonable para un asistente de codificación. No es suficiente para una base de datos cognitiva.

## La brecha

MuninnDB ya cubría el lado de captura: embeddings vectoriales, decaimiento de Ebbinghaus, aprendizaje de asociación Hebbiana y un trabajador de consolidación en segundo plano que realiza dedup algorítmico cada 6 horas. Lo que no podía hacer: razonar sobre *por qué* dos entradas son similares, resolver contradicciones o descubrir conexiones entre dominios. Tenía una memoria. No tenía sueño.

## El Motor de Sueños

El Motor de Sueños extiende la tubería de consolidación existente con inteligencia de LLM. Se ejecuta entre sesiones -- se activa automáticamente al iniciar el servidor (metáfora del "waking up") o manualmente mediante CLI.

### Gates de activación

Dos condiciones deben cumplirse antes de que se ejecute un sueño: al menos 12 horas desde el último sueño, y al menos 3 nuevas entradas escritas desde el último sueño. Esto evita churning en un almacén inactivo. Los gates pueden omitirse con `--force` para ejecuciones manuales.

### La tubería

El Motor de Sueños reutiliza cuatro fases de consolidación existentes, añade tres nuevas y modifica una. La Fase 0 y el umbral de dedup configurable se enviaron en [PR #306](https://github.com/scrypster/muninndb/pull/306). Las fases de LLM (2b, 4, 6) están diseñadas y especificadas para una PR posterior.

**Phase 0 (new, shipped): Orient.** Escaneo de solo lectura de cada vault. Cuenta entradas, verifica cobertura de embeddings, calcula puntuaciones promedio de relevancia y estabilidad, detecta vaults legales. Esto construye el mapa antes de tocar cualquier cosa.

**Phase 1 (existing): Replay.** Reproducción de activación para actualizaciones de peso de asociación Hebbiana. Sin cambios.

**Phase 2 (existing, modified, shipped): Dedup.** La fase de dedup algorítmica, pero con un umbral dividido. En modo de consolidación normal, las entradas con similitud coseno >= 0.95 se fusionan automáticamente como antes. En modo sueño, el umbral baja a 0.85. Las entradas en el rango 0.85-0.95 *not* se fusionan automáticamente -- se marcan como clusters de near-duplicate y se pasan a la fase siguiente para revisión por LLM. Esta es la decisión arquitectónica clave: que el algoritmo maneje los casos obvios, y que el LLM maneje los ambiguos.

**Phase 2b (new, a follow-up PR): LLM Consolidation.** Los clusters de near-duplicate detectados y cualquier contradicción se envían a un LLM configurado. El LLM devuelve JSON estructurado: operaciones de fusión, resoluciones de contradicción, sugerencias de conexiones entre vaults, recomendaciones de estabilidad y una entrada de diario narrativo. El LLM no enlaza automáticamente nada entre vaults -- solo sugiere. Un humano revisa las sugerencias en el diario de sueño.

**Phase 3 (existing): Schema Promotion.** Sin cambios.

**Phase 4 (new, a follow-up PR): Bidirectional Stability.** Aquí ocurre el olvido. Las entradas de alta señal (accesadas frecuentemente, recientemente reforzadas vía co-activación Hebbiana o recomendadas por el LLM) reciben un impulso de estabilidad de 1.2x. Las entradas de baja señal (pocas accesos, antiguas, baja relevancia, no promovidas por el LLM) se debilitan a 0.8x con un piso de 14 días -- nunca caen por debajo de la estabilidad predeterminada. Las recomendaciones del LLM sobrescriben los ajustes basados en reglas. Esto modela el efecto de espaciado: las entradas que se recuperan permanecen fuertes, las que no se desvanecen gradualmente.

**Phase 5 (existing): Transitive Inference.** Sin cambios.

**Phase 6 (new, a follow-up PR): Dream Journal.** La narrativa del LLM más el informe de consolidación se formatean en una entrada legible por humanos y se adjuntan a `~/.muninn/dream.journal.md`. Este es el resultado que realmente lees. Te indica qué conexiones se descubrieron, qué se reforzó, qué se limpiaron y qué se omitió.

### Niveles de confianza del vaultNo todos los vaults son iguales y no todos los proveedores de LLM son iguales. MuninnDB impone niveles de confianza por vault:

Los vaults legales omiten totalmente la Fase 2b -- nunca se envían a ningún LLM, ni siquiera uno local. Las entradas legales se preservan íntegramente y nunca son tocadas por la consolidación.

Los vaults de trabajo y personales están restringidos a Ollama local o a la API de Anthropic. Nunca se envían a OpenAI ni a otros proveedores.

Los vaults globales y de proyecto pueden usar cualquier proveedor configurado.

Esto se configura, no se codifica de forma rígida. El orden de resolución verifica Ollama primero (local, sin que los datos abandonen la máquina), luego Anthropic, y finalmente OpenAI donde la política del vault lo permite.

### Modelo de ejecución

La metáfora sueño/despierto se mapea directamente al ciclo de vida del servidor. Cuando MuninnDB se detiene (`muninn stop`), escribe un archivo sidecar `dream.due` en el directorio de datos. Cuando se inicia nuevamente (`muninn start`), verifica el archivo y los gates de activación. Si ambos pasan, ejecuta un sueño antes de abrir puertos. Si el sueño supera un tiempo de espera configurable (por defecto 60 segundos), se aborta y se inicia normalmente. El servidor nunca se bloquea indefinidamente en un sueño.

Para uso manual: `muninn dream --dry-run` muestra lo que sucedería sin escribir nada. El modo dry-run aún genera la narrativa completa del diario y la imprime por stdout con un encabezado `[DRY RUN]`. Esto es esencial para la confianza -- puedes ver exactamente lo que haría el motor antes de permitir que escriba.

## Lo que dejé fuera

**Autoenlaces entre vaults** El Motor de Sueños sugiere conexiones pero nunca las crea automáticamente. Un humano lee el diario y decide. Confianza antes de automatizar.

**Compartir memoria entre agentes** MuninnDB es un usuario, una instancia. Compartir memoria entre agentes es un modelo de amenaza completamente distinto.

**Alertas temporales** El LLM podría notar "esta clave API expira en 4 días" pero rastrear fechas de expiración es una funcionalidad, no consolidación. Fuera del alcance para v1.

**Modelado de emociones** La puntuación de salencia es una proxy. El peso emocional real necesita señal que un sistema basado en texto no tiene. Diferido.

## El diario de sueños

Aquí está lo que producirá una ejecución de sueño una vez que las fases de LLM se lancen en una PR posterior:

```
---
## 2026-03-28T06:00:00Z -- Dream**Connections discovered:**
- Your note about DNS timeout in the k8s cluster shares the same  root cause as the prod incident from March 21. (suggested link)

**Strengthened:**
- 3 memories about auth patterns reinforced (accessed 8+ times)

**Cleaned up:**
- Merged 2 near-duplicate notes about Docker networking
- Resolved 1 contradiction: old API endpoint superseded by new one

*Scanned 47 entries across 3 vaults (legal: 8 skipped) in 4.2s*
```

Cada mañana, lees lo que tu sistema de memoria soñó. Las conexiones que notó. El ruido que limpiaron. Las contradicciones que resolvieron. Es un changelog para tu conocimiento, escrito en prosa. MuninnDB es el backend de memoria cognitiva para [Hrafn](https://github.com/5queezer/hrafn), un runtime de agentes de IA ligero y modular.

## Pruébalo

La base de solo lectura (Phase 0 + dedup configurable + CLI dry-run) se lanzó en [PR #306](https://github.com/scrypster/muninndb/pull/306) y se fusionó. Las fases de escritura (estabilidad bidireccional, consolidación de LLM, diario) siguen en una PR separada. La especificación completa del diseño está en el repositorio en `docs/superpowers/specs/2026-03-28-dream-engine-design.md`.

```bash
git clone https://github.com/scrypster/muninndb
cd muninndb && go build ./cmd/muninn/
muninn dream --dry-run
```

---

*Christian Pojoni construye infraestructura de agentes de IA. Hrafn está en [github.com/5queezer/hrafn](https://github.com/5queezer/hrafn). MuninnDB está en [github.com/scrypster/muninndb](https://github.com/scrypster/muninndb).*