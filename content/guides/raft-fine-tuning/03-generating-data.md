---
title: "03 — Generating Training Data with a Teacher"
description: "Self-distill answers from a stronger local teacher, in exactly the inference format, with oracle and distractor-only contexts and hints the student never sees."
weight: 3
type: "guide"
build:
  list: local
  render: always
---

# 03 — Generating Training Data with a Teacher

## Core Idea

Each training example is built the same way:

1. Sample a passage from a training document.
2. Let the teacher write a realistic question that the passage answers.
3. Retrieve context for that question with the production retriever.
4. Decide the case: oracle (source passage in context) or distractor-only (source document removed).
5. Let the teacher answer, then check the answer (see [Filtering](04-filtering-and-datasheet.md)).

## One Prompt Function

The single most important rule: training prompts and inference prompts come from the same function.

```python
def prompt(passages, question):
    sources = {f"S{n}": p for n, p in enumerate(passages, 1)}
    blocks = [passage_block(p, label) for label, p in sources.items()]
    return sources, SYSTEM, "\n\n".join(blocks) + "\n\n" + TASK + question
```

The data generator and the serving code both call it, and the context comes from the same running retriever with the same `k`. Any drift between the two quietly erases the gains.

## Oracle and Distractor Cases

```python
def context(oracle, hits, mode, k, rng):
    if mode == "distractor":
        return [p for p in hits if p.doc_id != oracle.doc_id][:k]
    rest = [p for p in hits if not overlaps(p, oracle)][:k - 1]
    pos = rng.randrange(len(rest) + 1)          # never always first
    return rest[:pos] + [oracle] + rest[pos:]
```

The example run used 80% oracle and 20% distractor-only attempts, and kept generating distractor-only examples until at least 12% of the kept examples were abstentions. Distractor-only does not always mean abstain. If the other passages genuinely answer the question, answering is correct.

## Teacher Hints

The teacher can see what the student must infer. In the oracle case it gets a line such as "passage S3 is where this question came from, build the answer mainly from it". In the distractor case it gets "none of these passages was the source, answer only if they really cover the question". The hint is part of the teacher's prompt only and is never stored in the training example.

## Choosing a Teacher

A larger model of the same family is a good default because its output style is close to what the student can learn. The example used `qwen3.5:9b` locally for a 4B student and also for the 9B student. Self-distilling into the same size still helped, because the filters keep only the teacher's best answers.

Sample more than once. The example kept a second teacher sample whenever the first failed the checks, and a third of the final examples came from that second try.

## Structured Output

Ask for JSON with a schema, for example `answer`, `insufficient` and `citations`. Structured output turns "did the model follow the format" into a parse check instead of a regex guess, and it gives you a clean abstention flag to evaluate.

## Common Mistakes

- Generating questions from the same passages you evaluate on.
- Putting the oracle at a fixed position.
- Storing the teacher hint in the training data.
- Using a different retriever or `k` for data than for inference.
