---
title: "02 — Before You Train: Retrieval, Eval Set and Holdout"
description: "Measure retrieval, build an eval set with a holdout, and record baseline numbers for the untuned model before you generate a single training example."
weight: 2
type: "guide"
build:
  list: local
  render: always
---

# 02 — Before You Train: Retrieval, Eval Set and Holdout

## Core Idea

You cannot tell whether RAFT helped unless you know where you started. Three things must exist before training data does: a measured retriever, an eval set, and a holdout that keeps the eval honest.

## 1. Measure Retrieval

RAFT trains the model to answer from the context it gets. If the right passage is rarely in that context, no fine-tune will fix it.

Measure `hit@k` (is any correct passage in the top k?) and `recall@k` on your eval questions with the `k` you will use at inference. In the example run, `hit@10` was 0.738, so about a quarter of questions never had the answer in context. That number later explains most of the "false" abstentions.

## 2. Build an Eval Set

Write or generate questions with a reference answer, the key points a good answer must contain, and the evidence spans in your corpus. Include unanswerable questions on purpose. The example set had 129 reviewed questions: 103 answerable and 26 unanswerable.

Questions should cover the kinds you care about. The example used factual questions, cross-episode questions that need two sources, and attribution questions ("what does he say about X").

## 3. Freeze a Holdout

Every document referenced by eval evidence goes into a holdout set, and nothing from the holdout may appear in training, not as the source and not as a distractor.

```python
def usable(examples, holdout: set):
    return [e for e in examples
            if e["file_id"] not in holdout
            and not {p["file_id"] for p in e["context"]} & holdout]
```

Apply the filter at generation and again at export, because the holdout can grow after examples exist. Before training, run an independent check over the final training files.

## 4. Record the Baseline

Run the full pipeline with the untuned base model and with a stronger model you trust, and score both. These are the numbers RAFT has to beat. Keep the reports, because retrieval and prompt changes later make old runs incomparable.

## What to Exclude

Exclude data that teaches the wrong thing even if it is plentiful. In the example run, multi-speaker videos (interviews, call-ins) were excluded entirely, because transcripts without speaker labels would teach the model to present a guest's views as the creator's own.

## Common Mistakes

- Skipping unanswerable questions, which hides abstention behavior.
- Holding out the source document but not checking distractors.
- Comparing against a baseline run with a different retriever or `k`.
