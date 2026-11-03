---
title: "RAFT Fine-Tuning Guide"
description: "A practical path from a working RAG pipeline to a small local model fine-tuned with RAFT: data, filtering, training, serving and an honest eval."
date: 2026-11-03
guideTags: ["llm", "rag", "fine-tuning"]
type: "guide"
build:
  list: local
  render: always
---

# RAFT Fine-Tuning Guide

A compact guide for engineers who already have a retrieval pipeline and want a small local model that answers from retrieved passages better than a prompted base model does.

RAFT (Retrieval-Augmented Fine-Tuning) trains a model on questions paired with retrieved passages, some relevant and some distractors, so it learns to answer from the right passage, ignore the rest and say so when nothing fits. The training itself is a standard LoRA run. The work is in the data, the checks and the evaluation, and that is what this guide spends its pages on.

The running example is a real project: about 870 transcribed videos of a single creator, a local retrieval service, and Qwen3.5 4B and 9B models fine-tuned to answer in the creator's first-person voice with a verified citation for every sentence. The 4B model trained on a 16 GB consumer GPU. The 9B model trained on a rented 48 GB card. The war stories from that run are in the companion post [My First RAFT Fine-Tune on a Shared 16 GB GPU](/blog/my-first-raft-fine-tune-on-a-shared-16-gb-gpu-7-gotchas-the-paper-doesnt-mention/).

## How to Use This Guide

Read the pages in order. Each one answers four questions:

1. What problem does this step solve?
2. What is the default choice?
3. What fails silently if you skip it?
4. How do you check that it worked?

## What Is Genuinely New

If you have built RAG systems, most of this is familiar. Only a few ideas are specific to RAFT:

- The model learns from contexts that contain distractors, and from contexts where the answer is missing entirely.
- Training examples must use exactly the prompt format of inference, built from the same retriever.
- A stronger teacher can see hints at generation time that the student never sees.
- The gain is mostly in how the model uses context and how it sounds, not in what it knows.

## Recommended Path

### Phase 1: Foundations

1. [Mental Model: What RAFT Teaches and What It Does Not](01-mental-model.md)
2. [Before You Train: Retrieval, Eval Set and Holdout](02-before-you-train.md)

### Phase 2: Data

3. [Generating Training Data with a Teacher](03-generating-data.md)
4. [Filtering and the Datasheet](04-filtering-and-datasheet.md)
5. [Citations Belong in Code](05-citations-in-code.md)

### Phase 3: Model

6. [Training a LoRA Adapter](06-training-lora.md)
7. [Export and Serving](07-export-and-serve.md)

### Phase 4: Proof

8. [Evaluating Against the Base Model](08-evaluating.md)
9. [Renting a GPU for the Bigger Model](09-renting-a-gpu.md)
10. [Checklist](10-checklist.md)
11. [Grounding and References](11-grounding-and-references.md)

## Fastest Practical Plan

A focused week is enough for a first run if your retrieval already works.

- Day 1: eval set, holdout and baseline numbers for the untuned model.
- Days 2 and 3: data generation with filters, then read the datasheet and fix the filters.
- Day 4: train a small model and export it.
- Day 5: evaluate against the base model with identical retrieval and write down what changed.

## Default Target Stack

If you do not know where to start, aim for this combination:

**Qwen3.5 4B + Unsloth BF16 LoRA + TRL SFTTrainer with response-only loss + GGUF Q4_K_M + Ollama, with a local teacher model for data generation.**

It fits a 16 GB GPU, trains in a few hours and keeps every transcript on your machine.

## Grounding

This is a field guide from one complete run, not a survey of the literature. Numbers are from that run and will differ on your data. For the paper, library documentation and version notes, see [Grounding and References](11-grounding-and-references.md).
