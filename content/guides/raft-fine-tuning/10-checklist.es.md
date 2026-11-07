---
title: "10 — Lista de comprobación"
description: "Una lista de una página para una ejecución de RAFT, desde la línea base de recuperación hasta el modelo publicado."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "2866042a51ba0cf9292a4b426aaace48"
---

# 10 — Lista de comprobación

## Antes de los datos

- [ ] `hit@k` y `recall@k` medidos con el `k` de inferencia
- [ ] conjunto de evaluación revisado con preguntas contestables y no contestables
- [ ] holdout registrado a partir de la evidencia de evaluación
- [ ] informes de línea base para el modelo base sin ajustar y un modelo de referencia más potente
- [ ] documentos que enseñan algo incorrecto excluidos (por ejemplo, fuentes con varios hablantes)

## Datos

- [ ] una función de prompt compartida por la generación de datos y la inferencia
- [ ] contexto del recuperador de producción con el `k` de producción
- [ ] oracle en posición aleatoria y ejemplos solo con distractores incluidos
- [ ] pistas del teacher utilizadas y nunca almacenadas
- [ ] salida estructurada con una bandera explícita de abstención
- [ ] filtros de citas, proporción literal, frases de abstención, negaciones falsas y voz
- [ ] motivos de descarte contados; ficha de datos escrita y leída
- [ ] filtro de holdout aplicado al exportar y comprobación independiente de fugas superada
- [ ] validación dividida por documento

## Entrenamiento

- [ ] longitudes de tokens comprobadas; ejemplos largos descartados, no truncados
- [ ] pérdida solo sobre la respuesta del assistant
- [ ] checkpoints y reanudación probados
- [ ] pérdida de evaluación descendente, sin divergencia

## Exportación y serving

- [ ] adaptador conservado
- [ ] modelo base empaquetado con la misma cuantización y Modelfile
- [ ] wrapper de serving ejecuta juntos recuperación, modelo y verificador
- [ ] modelo de tareas de la interfaz de chat asignado a otro modelo

## Evaluación

- [ ] recuperación idéntica para cada modelo
- [ ] supported informado sobre las preguntas respondidas y sobre todas las contestables
- [ ] comparación emparejada sobre preguntas respondidas por ambos
- [ ] cada abstención falsa comprobada contra su acierto de recuperación
- [ ] 10 pares de respuestas leídos por una persona
- [ ] regla de decisión escrita antes de la ejecución
