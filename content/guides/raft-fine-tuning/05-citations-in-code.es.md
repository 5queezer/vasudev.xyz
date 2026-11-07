---
title: "05 — Las citas pertenecen al código"
description: "Haz que el modelo cite ids de pasajes y fragmentos literales; después verifica las citas y genera marcas de tiempo y enlaces mediante código."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "d49115201aadd8cc5b5a69488817fbf7"
---

# 05 — Las citas pertenecen al código

## Idea central

Un modelo que escriba por sí mismo marcas de tiempo, números de página o URL acabará inventando uno plausible. Dale únicamente opciones que puedas comprobar.

> El modelo elige un id de pasaje y copia una cita. El código verifica la cita y escribe la referencia.

## El contrato

El modelo responde con marcadores como `[S3]` y una lista de citas:

```json
{
  "answer": "Start where you already are every day [S2].",
  "insufficient": false,
  "citations": [{"source": "S2", "quote": "the easiest place to practice is the coffee shop you already walk into every morning"}]
}
```

La cita debe ser un tramo contiguo de 8 a 40 palabras del pasaje. Sin paráfrasis ni puntos suspensivos.

## El verificador

Para cada cita, el código busca el texto en el pasaje (ignorando mayúsculas, puntuación y espacios), lo asigna a marcas de tiempo por palabra y reescribe el marcador:

```python
for c in out["citations"]:
    p = sources.get(c["source"])
    span = p and locate_quote(p, c["quote"])
    if not span:
        invalid += 1                    # marker gets removed from the answer
        continue
    refs[c["source"]] = f"#{p.doc_id} {clock(span.start)}"
answer = MARKERS.sub(lambda m: f"[{refs[m[1]]}]" if m[1] in refs else "", out["answer"])
```

La validez de las citas pasa a ser 1,00 por construcción. Cada referencia de una respuesta apunta a palabras que existen.

## Ajustar las citas

Los modelos pequeños suelen citar 6 palabras o 45, o unir dos frases. En lugar de descartar esas respuestas, ajusta las citas: limita una demasiado larga, amplía una corta dentro de la transcripción o recórtala hasta su tramo literal más largo. En los datos de ejemplo, aproximadamente la mitad de los ejemplos tenía al menos una cita ajustada. Aplica el mismo ajuste durante la inferencia para que entrenamiento y serving coincidan.

## Lo que no cubre la validez

Una cita verificada existe, pero no necesariamente respalda la frase a la que está unida. Mídelo por separado como precisión de citas con un judge (consulta [Evaluación](08-evaluating.md)). Los modelos del ejemplo alcanzaron 0,63; esa es la cifra honesta para esta brecha.

## Consecuencia para el serving

La salida cruda del modelo es JSON con marcadores `[S3]`, algo inútil en una interfaz de chat. Necesitas un servidor ligero que ejecute recuperación, modelo y verificador para cada mensaje y devuelva Markdown terminado (consulta [Exportación y serving](07-export-and-serve.md)).

## Errores habituales

- Dejar que el modelo genere marcas de tiempo o URL.
- Descartar citas ajustadas durante el entrenamiento pero ajustarlas en inferencia, o al revés.
- Confundir validez de cita con calidad de cita.
