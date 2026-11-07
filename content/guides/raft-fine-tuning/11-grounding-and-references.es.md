---
title: "11 — Fundamentación y referencias"
description: "El paper de RAFT, las bibliotecas usadas en la ejecución de ejemplo y cómo se obtuvieron las cifras de esta guía."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "6b06a679a5d4b9fdcd4c2ed272fc6c32"
---

# 11 — Fundamentación y referencias

Esta guía describe una ejecución completa. El método sigue el paper de RAFT y las cifras proceden de los informes de esa ejecución. Serán distintas con tus datos.

## Método

- [RAFT: Adapting Language Model to Domain Specific RAG](https://arxiv.org/abs/2403.10131) (Zhang et al., 2024). El paper que define el entrenamiento con documentos distractores y citas literales.
- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) (Hu et al., 2021).

## Bibliotecas y herramientas

- [Unsloth](https://github.com/unslothai/unsloth): carga del modelo, LoRA, `train_on_responses_only` y fusión a 16 bits.
- [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer): el bucle de fine-tuning supervisado.
- [PEFT](https://huggingface.co/docs/peft): la implementación subyacente del adaptador.
- [llama.cpp](https://github.com/ggml-org/llama.cpp): conversión y cuantización de GGUF.
- [Ollama](https://github.com/ollama/ollama): serving local y formato Modelfile.
- [Qwen3.5-9B en Hugging Face](https://huggingface.co/Qwen/Qwen3.5-9B): el modelo base de la ejecución grande.
- [Open WebUI](https://github.com/open-webui/open-webui): la interfaz de chat delante del wrapper de serving.
- [RunPod](https://www.runpod.io/): la GPU alquilada para la ejecución 9B.

## Cómo se obtuvieron las cifras

- Corpus: unos 870 vídeos de un creador, transcritos localmente con Whisper. El entrenamiento usó solo vídeos individuales.
- Conjunto de evaluación: 129 preguntas revisadas (103 contestables y 26 no contestables). Cada documento citado por la evidencia de evaluación se reservó fuera del entrenamiento.
- Recuperación: un servicio local, `k = 8` pasajes para las respuestas y `hit@10 = 0.738` sobre el conjunto de evaluación.
- Teacher y judge: `qwen3.5:9b`, ejecutado localmente. Que el judge sea también el teacher es un sesgo conocido.
- Datos de entrenamiento: 7.988 intentos, 3.012 conservados, 2.858 ejemplos de entrenamiento y 144 de validación después de los filtros de exportación.
- Modelos: Qwen3.5-4B (RTX 5070 Ti, 16 GB) y Qwen3.5-9B (RTX 6000 Ada, 48 GB), LoRA BF16 de rango 16, 2 épocas, servidos como GGUF Q4_K_M mediante Ollama.

## Artículo complementario

La historia operativa de la ejecución, incluidos los fallos, aparece en [Mi primer fine-tuning con RAFT en una GPU compartida de 16 GB: 7 trampas que el paper no menciona](/es/blog/mi-primer-fine-tuning-con-raft-en-una-gpu-compartida-de-16-gb-7-trampas-que-el-paper-no-menciona/).
