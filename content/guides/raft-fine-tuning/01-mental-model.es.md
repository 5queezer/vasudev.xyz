---
title: "01 — Modelo mental: qué enseña RAFT y qué no"
description: "RAFT enseña a un modelo a usar el contexto recuperado. No le enseña hechos nuevos; entender la diferencia determina si merece la pena aplicarlo."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "920afc25145ddfc240d8f88d9c07544d"
---

# 01 — Modelo mental: qué enseña RAFT y qué no

## Idea central

Hay tres formas de hacer que un modelo responda preguntas sobre tus documentos:

| Enfoque | Qué cambia | Puntos fuertes | Puntos débiles |
|---|---|---|---|
| RAG | el prompt (pasajes recuperados) | hechos recientes, citas | estilo, ignorar pasajes malos |
| Fine-tuning con documentos | los pesos | estilo, vocabulario del dominio | los hechos quedan obsoletos, sin citas |
| RAFT | los pesos, entrenados con prompts de RAG | usar el contexto, abstenerse, estilo | sigue necesitando una buena recuperación |

RAFT es fine-tuning sobre la propia tarea de RAG. Cada ejemplo de entrenamiento contiene una pregunta, un conjunto de pasajes recuperados y la respuesta que un buen modelo daría a partir de ellos.

> RAFT enseña al modelo qué hacer con el contexto. Los hechos permanecen en el recuperador.

## Los dos tipos de ejemplos

**Ejemplos oracle.** El pasaje del que procede la pregunta aparece en el contexto, mezclado con distractores en una posición aleatoria. El modelo aprende a encontrarlo y a responder a partir de él.

**Ejemplos solo con distractores.** Se eliminan todos los pasajes del documento fuente. A menudo, la respuesta correcta pasa a ser «esto no está cubierto», y el modelo aprende a decirlo en lugar de contestar desde el pasaje que más se parece.

Sin el segundo tipo, un modelo ajustado se equivoca con seguridad cada vez que falla la recuperación.

## Qué cambia en la práctica

En la ejecución de ejemplo, al comparar un modelo ajustado con RAFT con su modelo base sin ajustar bajo una recuperación idéntica:

- El respaldo factual se mantuvo igual (69 % frente a 69 % de las preguntas contestables en 9B).
- La reutilización literal de las palabras de la fuente aumentó con fuerza (de 0,35 a 0,57 en 9B y de 0,20 a 0,60 en 4B).
- Mejoró la abstención correcta en preguntas sin respuesta (de 0,85 a 0,92 en 9B).
- Empeoró la abstención falsa en preguntas contestables (de 2,9 % a 5,8 % en 9B).

Este patrón es habitual. RAFT es la herramienta adecuada cuando importa cómo usa el modelo el contexto: fundamentación, disciplina de citas, abstención y voz. Es la herramienta equivocada cuando al modelo base simplemente le falta la capacidad de razonamiento o el conocimiento necesario para responder.

## Cuándo no usar RAFT

- Tu recuperación falla la mayor parte del tiempo. Corrígela primero, porque RAFT entrena al modelo para confiar en el contexto.
- Un prompt mejor ya consigue el resultado. Mide primero el modelo base con ese prompt (consulta [Antes de entrenar](02-before-you-train.md)).
- Necesitas introducir hechos nuevos en el modelo. Para eso sirven el preentrenamiento continuado o un RAG normal, no RAFT.

## Errores habituales

- Esperar mejoras de precisión cuando el cuello de botella es la recuperación.
- Entrenar solo con ejemplos oracle.
- Juzgar el éxito por la pérdida de evaluación en vez de por una evaluación de la tarea frente al modelo base.
