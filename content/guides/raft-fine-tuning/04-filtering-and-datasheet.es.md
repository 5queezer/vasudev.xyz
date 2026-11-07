---
title: "04 — Filtrado y ficha de datos"
description: "Aplica rejection sampling a las respuestas del teacher con comprobaciones explícitas, cuenta cada motivo de descarte y lee una ficha de datos antes de entrenar."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "d0d245bd068aade2f23bf8a387d6f14d"
---

# 04 — Filtrado y ficha de datos

## Idea central

El estudiante aprende todo lo que hacen los ejemplos conservados, incluidos los malos hábitos del teacher. El filtrado determina la calidad del modelo más que cualquier hiperparámetro.

> Conserva solo respuestas que te gustaría ver durante la inferencia y cuenta por qué se descartó todo lo demás.

## Catálogo de filtros

Cada comprobación existe porque una muestra temprana presentó ese fallo. Los descartes proceden de 7.988 intentos de la ejecución de ejemplo, de los que se conservaron 3.012 (38 %).

| Comprobación | Qué detecta | Descartes |
|---|---|---|
| frase sin cita | afirmación sin marcador de fuente | 1.569 |
| poco contenido literal | paráfrasis en vez de las propias palabras de la fuente | 1.019 |
| abstención formularia | la misma frase hecha para cada «no está cubierto» | 875 |
| cita inválida | la cita no aparece en el pasaje citado | 513 |
| marcador sin resolver | marcador que no apunta a ninguna cita | 393 |
| marcador sin cita textual | id de cita sin texto citado | 240 |
| rechazado | negativa total a responder | 221 |
| tercera persona | «el hablante dice» en lugar de primera persona | 77 |
| negación falsa | «no he hablado de eso» aunque la respuesta está en el contexto | 35 |

## La negación falsa

El fallo más engañoso: en un ejemplo oracle, el pasaje fuente está en el contexto, pero la respuesta comienza negándolo y después responde de todos modos. Si entrenas con eso, el estudiante aprende a negar lo que sabe. Una regex aplicada al inicio detecta la mayoría de los casos.

```python
FALSE_DENIAL = re.compile(
    r"^(?:\w+,\s+)?I(?: (?:haven't|have not|never|don't|didn't) "
    r"(?:talk|talked|say|said|discuss|discussed|cover|covered|mention|mentioned)\b)")
```

Vuelve a aplicarla al exportar, porque los filtros mejoran después de que ya existan ejemplos.

## La ficha de datos

Escribe una ficha junto a los datos en cada exportación. Debe incluir:

- intentos, ejemplos conservados y tasa de conservación
- motivos de descarte, tanto finales como «primera muestra descartada, segunda conservada»
- proporciones de oracle, distractores respondidos y abstenciones
- distribución temática de las preguntas
- inicios más frecuentes de respuestas y abstenciones
- 20 ejemplos aleatorios completos

La lista de inicios es la línea más útil. Cuando «I haven't talked» apareció 189 veces al comienzo de una respuesta, fue la señal para añadir la comprobación de abstención formularia.

## Cuántos datos

El ejemplo usó 2.858 ejemplos de entrenamiento y 144 de validación (división por documento, 5 % de los documentos). Fue suficiente para mover claramente el estilo y el comportamiento de abstención. Más ejemplos de la misma distribución ayudan menos que mejores filtros.

## Errores habituales

- Filtrar solo por formato y no por comportamiento (negaciones falsas, tercera persona).
- No contar los descartes y no poder saber qué comprobación importa.
- Dividir la validación por ejemplo en vez de por documento, lo que filtra pasajes.
