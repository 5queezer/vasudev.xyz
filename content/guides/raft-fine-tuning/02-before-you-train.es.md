---
title: "02 — Antes de entrenar: recuperación, conjunto de evaluación y holdout"
description: "Mide la recuperación, crea un conjunto de evaluación con holdout y registra los valores base del modelo sin ajustar antes de generar un solo ejemplo de entrenamiento."
weight: 2
type: "guide"
build:
  list: local
  render: always
translationHash: "acb7b42ba107ee9a2a71cb597b986a87"
---

# 02 — Antes de entrenar: recuperación, conjunto de evaluación y holdout

## Idea central

No puedes saber si RAFT ayudó sin conocer el punto de partida. Antes de que existan datos de entrenamiento deben existir tres cosas: un recuperador medido, un conjunto de evaluación y un holdout que mantenga honesta la evaluación.

## 1. Medir la recuperación

RAFT entrena al modelo para responder a partir del contexto que recibe. Si el pasaje correcto rara vez está en ese contexto, ningún fine-tuning lo arreglará.

Mide `hit@k` (¿hay algún pasaje correcto entre los primeros k?) y `recall@k` sobre tus preguntas de evaluación con el mismo `k` que usarás en inferencia. En la ejecución de ejemplo, `hit@10` fue 0,738, así que aproximadamente una cuarta parte de las preguntas nunca tuvo la respuesta en el contexto. Más adelante, esa cifra explica la mayoría de las abstenciones «falsas».

## 2. Crear un conjunto de evaluación

Escribe o genera preguntas con una respuesta de referencia, los puntos clave que debe contener una buena respuesta y los fragmentos de evidencia de tu corpus. Incluye a propósito preguntas sin respuesta. El conjunto de ejemplo tenía 129 preguntas revisadas: 103 contestables y 26 no contestables.

Las preguntas deben abarcar los tipos que te interesan. El ejemplo usó preguntas factuales, preguntas entre episodios que necesitan dos fuentes y preguntas de atribución («¿qué dice él sobre X?»).

## 3. Fijar un holdout

Cada documento citado por la evidencia de evaluación pasa a un conjunto de holdout, y nada del holdout puede aparecer en el entrenamiento, ni como fuente ni como distractor.

```python
def usable(examples, holdout: set):
    return [e for e in examples
            if e["file_id"] not in holdout
            and not {p["file_id"] for p in e["context"]} & holdout]
```

Aplica el filtro durante la generación y otra vez al exportar, porque el holdout puede crecer después de que existan ejemplos. Antes de entrenar, ejecuta una comprobación independiente sobre los archivos de entrenamiento finales.

## 4. Registrar la línea base

Ejecuta la pipeline completa con el modelo base sin ajustar y con un modelo más potente en el que confíes, y puntúa ambos. Esas son las cifras que RAFT debe superar. Conserva los informes, porque los cambios posteriores en la recuperación y el prompt hacen que las ejecuciones antiguas dejen de ser comparables.

## Qué excluir

Excluye los datos que enseñen algo incorrecto aunque sean abundantes. En la ejecución de ejemplo se excluyeron por completo los vídeos con varios hablantes (entrevistas y llamadas), porque los transcritos sin etiquetas de hablante enseñarían al modelo a presentar las opiniones de un invitado como propias del creador.

## Errores habituales

- Omitir preguntas sin respuesta, lo que oculta el comportamiento de abstención.
- Reservar el documento fuente sin comprobar los distractores.
- Comparar con una línea base que usa otro recuperador u otro `k`.
