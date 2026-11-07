---
title: "03 — Generar datos de entrenamiento con un teacher"
description: "Destila respuestas de un teacher local más potente en el formato exacto de inferencia, con contextos oracle y solo de distractores, además de pistas que el estudiante nunca ve."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "06cbf6209d0c8588ddeb3928dc85b33f"
---

# 03 — Generar datos de entrenamiento con un teacher

## Idea central

Cada ejemplo de entrenamiento se construye del mismo modo:

1. Selecciona un pasaje de un documento de entrenamiento.
2. Pide al teacher que escriba una pregunta realista que el pasaje responda.
3. Recupera contexto para esa pregunta con el recuperador de producción.
4. Decide el caso: oracle (pasaje fuente en el contexto) o solo distractores (documento fuente eliminado).
5. Pide al teacher que responda y comprueba después la respuesta (consulta [Filtrado](04-filtering-and-datasheet.md)).

## Una sola función de prompt

La regla más importante: los prompts de entrenamiento y de inferencia deben proceder de la misma función.

```python
def prompt(passages, question):
    sources = {f"S{n}": p for n, p in enumerate(passages, 1)}
    blocks = [passage_block(p, label) for label, p in sources.items()]
    return sources, SYSTEM, "\n\n".join(blocks) + "\n\n" + TASK + question
```

Tanto el generador de datos como el código de serving la llaman, y el contexto procede del mismo recuperador en ejecución con el mismo `k`. Cualquier divergencia entre ambos borra silenciosamente las mejoras.

## Casos oracle y distractor

```python
def context(oracle, hits, mode, k, rng):
    if mode == "distractor":
        return [p for p in hits if p.doc_id != oracle.doc_id][:k]
    rest = [p for p in hits if not overlaps(p, oracle)][:k - 1]
    pos = rng.randrange(len(rest) + 1)          # never always first
    return rest[:pos] + [oracle] + rest[pos:]
```

La ejecución de ejemplo usó un 80 % de intentos oracle y un 20 % solo con distractores, y siguió generando ejemplos solo con distractores hasta que al menos el 12 % de los ejemplos conservados fueran abstenciones. Solo distractores no siempre significa abstenerse. Si los otros pasajes responden de verdad a la pregunta, responder es correcto.

## Pistas para el teacher

El teacher puede ver lo que el estudiante debe inferir. En el caso oracle recibe una línea como «el pasaje S3 es el origen de esta pregunta; construye la respuesta principalmente a partir de él». En el caso distractor recibe «ninguno de estos pasajes era la fuente; responde solo si realmente cubren la pregunta». La pista forma parte únicamente del prompt del teacher y nunca se guarda en el ejemplo de entrenamiento.

## Elegir un teacher

Un modelo mayor de la misma familia es una buena opción inicial porque su estilo de salida se acerca a lo que puede aprender el estudiante. El ejemplo usó `qwen3.5:9b` localmente para un estudiante 4B y también para el estudiante 9B. La autodestilación hacia el mismo tamaño siguió ayudando porque los filtros conservan únicamente las mejores respuestas del teacher.

Toma más de una muestra. El ejemplo conservaba una segunda muestra del teacher cuando la primera fallaba las comprobaciones, y un tercio de los ejemplos finales procedía de ese segundo intento.

## Salida estructurada

Solicita JSON con un esquema, por ejemplo `answer`, `insufficient` y `citations`. La salida estructurada convierte «¿siguió el modelo el formato?» en una comprobación de parseo en lugar de una conjetura con regex, y proporciona una bandera de abstención limpia para evaluar.

## Errores habituales

- Generar preguntas a partir de los mismos pasajes usados para evaluar.
- Colocar el oracle en una posición fija.
- Guardar la pista del teacher en los datos de entrenamiento.
- Usar para los datos otro recuperador u otro `k` distinto al de inferencia.
