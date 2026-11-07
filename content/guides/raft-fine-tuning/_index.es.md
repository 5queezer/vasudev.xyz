---
title: "Guía de fine-tuning con RAFT"
description: "Un camino práctico desde un pipeline RAG que funciona hasta un modelo local pequeño ajustado con RAFT: datos, filtrado, entrenamiento, servicio y una evaluación honesta."
date: 2026-11-03
guideTags: ["llm", "rag", "fine-tuning"]
type: "guide"
build:
  list: local
  render: always
translationHash: "698ccc9a1b103ce9258c785c9083d34e"
---

# Guía de fine-tuning con RAFT

Una guía compacta para quien ya tiene un pipeline de recuperación y quiere un modelo local pequeño que responda a partir de pasajes recuperados mejor que un modelo base con un buen prompt.

RAFT (Retrieval-Augmented Fine-Tuning) entrena un modelo con preguntas acompañadas de pasajes recuperados, algunos relevantes y otros solo distractores, para que aprenda a responder desde el pasaje correcto, ignorar el resto y decirlo cuando nada encaja. El entrenamiento en sí es una ejecución LoRA normal. El trabajo está en los datos, las comprobaciones y la evaluación, y a eso dedica esta guía sus páginas.

El ejemplo que recorre toda la guía es un proyecto real: unos 870 vídeos transcritos de un único creador, un servicio de recuperación local y modelos Qwen3.5 de 4B y 9B ajustados para responder en primera persona con la voz del creador y una cita verificada para cada frase. El modelo de 4B se entrenó en una GPU de consumo de 16 GB y el de 9B en una tarjeta alquilada de 48 GB. Lo que falló en esa ejecución está en el artículo complementario [Mi primer fine-tuning con RAFT en una GPU compartida de 16 GB](/es/blog/mi-primer-fine-tuning-con-raft-en-una-gpu-compartida-de-16-gb-7-trampas-que-el-paper-no-menciona/).

## Cómo usar esta guía

Lee las páginas en orden. Cada una responde a cuatro preguntas:

1. ¿Qué problema resuelve este paso?
2. ¿Cuál es la opción por defecto?
3. ¿Qué se rompe sin avisar si te lo saltas?
4. ¿Cómo compruebas que ha funcionado?

## Lo que de verdad es nuevo

Si ya has construido sistemas RAG, casi todo te resultará familiar. Solo unas pocas ideas son propias de RAFT:

- El modelo aprende de contextos con distractores y de contextos en los que la respuesta falta por completo.
- Los ejemplos de entrenamiento deben usar exactamente el formato de prompt de la inferencia, construido con el mismo recuperador.
- Un modelo maestro más fuerte puede ver al generar pistas que el alumno nunca ve.
- La mejora está sobre todo en cómo el modelo usa el contexto y en cómo suena, no en lo que sabe.

## Camino recomendado

### Fase 1: Fundamentos

1. [Modelo mental: qué enseña RAFT y qué no](01-mental-model.md)
2. [Antes de entrenar: recuperación, conjunto de evaluación y holdout](02-before-you-train.md)

### Fase 2: Datos

3. [Generar datos de entrenamiento con un teacher](03-generating-data.md)
4. [Filtrado y ficha de datos](04-filtering-and-datasheet.md)
5. [Las citas pertenecen al código](05-citations-in-code.md)

### Fase 3: Modelo

6. [Entrenar un adaptador LoRA](06-training-lora.md)
7. [Exportación y serving](07-export-and-serve.md)

### Fase 4: Prueba

8. [Evaluar frente al modelo base](08-evaluating.md)
9. [Alquilar una GPU para el modelo grande](09-renting-a-gpu.md)
10. [Lista de comprobación](10-checklist.md)
11. [Fundamentación y referencias](11-grounding-and-references.md)

## El plan práctico más rápido

Una semana concentrada basta para una primera ejecución si tu recuperación ya funciona.

- Día 1: conjunto de evaluación, conjunto reservado y cifras de partida del modelo sin ajustar.
- Días 2 y 3: generación de datos con filtros, luego leer la hoja de datos y afinar los filtros.
- Día 4: entrenar un modelo pequeño y exportarlo.
- Día 5: evaluar frente al modelo base con recuperación idéntica y anotar qué ha cambiado.

## Stack por defecto

Si no sabes por dónde empezar, apunta a esta combinación:

**Qwen3.5 4B + LoRA en BF16 con Unsloth + TRL SFTTrainer con pérdida solo en la respuesta + GGUF Q4_K_M + Ollama, con un modelo maestro local para generar los datos.**

Cabe en una GPU de 16 GB, entrena en pocas horas y mantiene cada transcripción en tu máquina.

## Fundamentos

Esta es una guía práctica a partir de una ejecución completa, no una revisión de la literatura. Las cifras salen de esa ejecución y serán distintas con tus datos. El paper, la documentación de las bibliotecas y las notas de versión están en [Fundamentación y referencias](11-grounding-and-references.md).
