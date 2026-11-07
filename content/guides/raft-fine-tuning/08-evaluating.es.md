---
title: "08 — Evaluar frente al modelo base"
description: "Recuperación idéntica para cada modelo, métricas que separan conocimiento y estilo, una comparación emparejada y el análisis de cada abstención falsa."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "bd476faf26096b28676e9bb9caae09dc"
---

# 08 — Evaluar frente al modelo base

## Idea central

La pregunta no es «¿es bueno el modelo RAFT?», sino «¿es mejor que el modelo base sin ajustar bajo exactamente las mismas condiciones, y de qué manera?».

## Condiciones idénticas

Ejecuta todos los modelos sobre el mismo conjunto de evaluación con los mismos pasajes recuperados por pregunta. En el ejemplo, `hit@10` (0,738) y `recall@10` fueron idénticos para todos, así que cualquier diferencia procedía únicamente del modelo.

## Métricas que separan conocimiento y estilo

| Métrica | Calculada por | Qué muestra |
|---|---|---|
| Respaldo factual (`supported`) | modelo evaluador | ¿está respaldada la respuesta por los pasajes? |
| Cobertura de puntos clave (`key-point coverage`) | modelo evaluador | ¿cuánto de la respuesta de referencia aparece? |
| Validez de las citas (`citation validity`) | código | ¿existen las citas en sus pasajes? |
| Precisión de las citas (`citation precision`) | modelo evaluador | ¿respaldan las citas sus frases? |
| Abstención correcta (`correct abstention`) | código | se abstiene en preguntas sin respuesta |
| Abstención falsa (`false abstention`) | código | se abstiene en preguntas contestables |
| Proporción literal (`verbatim share`) | código | ¿cuánta redacción procede de la fuente? |
| Estilo (`style`) | modelo evaluador | ¿suena como el autor de la fuente (1 a 5)? |

Informa del respaldo factual tanto sobre las preguntas respondidas como sobre todas las contestables. Un modelo que se abstiene más parece mejor en la primera cifra y peor en la segunda.

## Resultados de ejemplo

| Métrica | RAFT-9B | Base-9B | RAFT-4B | Base-4B |
|---|---|---|---|---|
| Respaldo factual (todas las contestables) | 69 % | 69 % | 64 % | 64 % |
| Cobertura de puntos clave | 0,50 | 0,46 | 0,48 | 0,44 |
| Precisión de las citas | 0,63 | 0,55 | 0,63 | 0,61 |
| Abstención correcta | 0,92 | 0,85 | 0,85 | 0,85 |
| Abstención falsa | 5,8 % | 2,9 % | 9,7 % | 2,9 % |
| Proporción literal | 0,57 | 0,35 | 0,60 | 0,20 |
| Estilo (1 a 5) | 3,66 | 2,36 | 3,80 | 2,09 |

El respaldo factual no cambió. La voz y la abstención sí.

## Comparación emparejada

Compara las preguntas que respondieron ambos modelos. En 9B fueron 97 preguntas: respaldo factual 71 frente a 70 y cobertura 0,53 frente a 0,48. Las cifras emparejadas eliminan el efecto de las distintas tasas de abstención.

## Inspeccionar cada abstención falsa

Enumera cada abstención falsa junto a su acierto de recuperación. En el ejemplo, 5 de las 6 abstenciones falsas de RAFT-9B eran preguntas con `hit@10 = 0`. La respuesta no estaba en el contexto, por lo que abstenerse era lo honesto. Solo una fue una pérdida real. Sin esta comprobación, la regresión parece tres veces peor de lo que es.

## Sesgo del modelo evaluador

Si el modelo evaluador es también el modelo maestro, prefiere respuestas que suenan como las suyas. Usa métricas calculadas por código donde sea posible (validez, proporción literal, abstención), lee personalmente 10 pares de respuestas y, si el resultado importa, utiliza un modelo evaluador de otra familia de modelos.

## Regla de decisión

Decide antes de ejecutar la evaluación qué se considera peor. La regla del ejemplo era simple: parar y replantear si RAFT era peor que el modelo base en conjunto. No lo fue, así que el modelo se publicó documentando su trade-off de abstenciones falsas.

## Errores habituales

- Comparar modelos con ejecuciones de recuperación distintas.
- Informar de una sola cifra de respaldo factual.
- Confiar en un modelo evaluador que también es el modelo maestro.
