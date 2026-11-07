---
title: "07 — Exportación y serving"
description: "Fusiona el adaptador, cuantiza a GGUF, registra en Ollama el modelo y un modelo base empaquetado igual, y sirve la pipeline completa tras un endpoint compatible con OpenAI."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "abb81678409882260e0adeda396ec4cc"
---

# 07 — Exportación y serving

## Idea central

Un modelo ajustado es solo la mitad del producto. La otra mitad es la pipeline que lo rodea: recuperación, función de prompt y verificador de citas. Sírvelos juntos.

## Pasos de exportación

1. Fusiona el adaptador LoRA con los pesos base a 16 bits.
2. Convierte a GGUF y cuantiza, por ejemplo a `Q4_K_M`.
3. Registra el modelo con un Modelfile.

```text
FROM /abs/path/to/models/raft-4b/model-Q4_K_M.gguf
RENDERER qwen3.5
PARSER qwen3.5
PARAMETER temperature 1
PARAMETER top_k 20
PARAMETER top_p 0.95
PARAMETER presence_penalty 1.5
```

La ruta de `FROM` debe ser absoluta. Una ruta relativa se interpreta como nombre de modelo y `ollama create` falla con un error confuso.

## Empaquetar igual el modelo base

Para una comparación justa, exporta el modelo base sin ajustar con exactamente los mismos pasos, cuantización y Modelfile. De lo contrario comparas RAFT con un modelo cuantizado o configurado de otra forma y no aprendes nada.

## Espacio en disco

Un modelo 9B produce una fusión a 16 bits (unos 18 GB), un GGUF BF16 (unos 17 GB) y el GGUF cuantizado (unos 5,6 GB). Ollama copia el GGUF a su propio almacén durante `create`, por lo que los archivos intermedios pueden eliminarse después. Conserva el adaptador (unos cientos de MB), ya que permite recrearlo todo.

## Servir la pipeline

El modelo devuelve JSON con marcadores `[S3]`. Coloca delante un pequeño servidor compatible con OpenAI que, para cada mensaje de chat:

1. recupere pasajes,
2. construya el prompt con la función compartida,
3. llame al modelo con el esquema JSON,
4. verifique las citas y reescriba los marcadores,
5. devuelva Markdown con cada referencia enlazada a su fuente y las citas plegadas debajo.

Dos endpoints bastan para la mayoría de interfaces: `GET /v1/models` y `POST /v1/chat/completions`, respondiendo al streaming en un solo fragmento. Serializa las generaciones con un lock si se comparte la GPU.

## Detalles de la interfaz de chat

Las interfaces envían más que preguntas. Saludos como «hola» deben recibir una respuesta fija en vez de una cita forzada. Preguntas cortas de seguimiento como «¿por qué?» necesitan la pregunta anterior para recuperar. Las interfaces también generan títulos y etiquetas de chats mediante el modelo seleccionado. Asigna otro modelo a esa tarea o cada título recorrerá toda la pipeline.

Open WebUI permite que cada conexión use la API Chat Completions o la API Responses más reciente. Un servidor que solo implementa `/v1/chat/completions` devuelve «not found» si la conexión está configurada como Responses.

## Errores habituales

- Servir el modelo crudo sin el verificador.
- Compararlo con un modelo base empaquetado de forma distinta.
- Eliminar el adaptador después de exportar.
