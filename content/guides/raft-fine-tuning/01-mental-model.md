---
title: "01 — Mental Model: What RAFT Teaches and What It Does Not"
description: "RAFT teaches a model how to use retrieved context. It does not teach it new facts, and knowing the difference decides whether it is worth doing."
weight: 1
type: "guide"
build:
  list: local
  render: always
---

# 01 — Mental Model: What RAFT Teaches and What It Does Not

## Core Idea

There are three ways to make a model answer questions about your documents:

| Approach | What changes | Good at | Weak at |
|---|---|---|---|
| RAG | the prompt (retrieved passages) | fresh facts, citations | style, ignoring bad passages |
| Fine-tuning on documents | the weights | style, domain vocabulary | facts drift, no citations |
| RAFT | the weights, trained on RAG prompts | using context, abstaining, style | still needs good retrieval |

RAFT is fine-tuning on the RAG task itself. Each training example is a question, a set of retrieved passages and the answer a good model would give from them.

> RAFT teaches the model what to do with context. The facts stay in the retriever.

## The Two Kinds of Examples

**Oracle examples.** The passage the question came from is in the context, mixed with distractors at a random position. The model learns to find it and answer from it.

**Distractor-only examples.** Every passage from the source is removed. Often the right answer is now "this is not covered", and the model learns to say that instead of answering from the closest-looking passage.

Without the second kind, a fine-tuned model becomes confidently wrong whenever retrieval misses.

## What It Changes in Practice

From the example run, comparing a RAFT-tuned model with its untuned base under identical retrieval:

- Factual support stayed the same (69% vs 69% of answerable questions on 9B).
- Verbatim reuse of source wording rose sharply (0.35 to 0.57 on 9B, 0.20 to 0.60 on 4B).
- Correct abstention on unanswerable questions improved (0.85 to 0.92 on 9B).
- False abstention on answerable questions got worse (2.9% to 5.8% on 9B).

That pattern is typical. RAFT is the right tool when you care about how the model uses context: grounding, citation discipline, abstention, voice. It is the wrong tool when the base model simply lacks the reasoning or knowledge to answer.

## When Not to Use RAFT

- Your retrieval misses most of the time. Fix retrieval first, because RAFT trains the model to trust the context.
- A better prompt already gets you there. Measure the prompted base model first (see [Before You Train](02-before-you-train.md)).
- You need new facts in the model. That is continued pretraining or plain RAG, not RAFT.

## Common Mistakes

- Expecting accuracy gains when the bottleneck is retrieval.
- Training only on oracle examples.
- Judging success by eval loss instead of a task eval against the base model.
