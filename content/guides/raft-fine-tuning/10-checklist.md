---
title: "10 — Checklist"
description: "A one-page checklist for a RAFT run, from retrieval baseline to shipped model."
weight: 10
type: "guide"
build:
  list: local
  render: always
---

# 10 — Checklist

## Before Data

- [ ] `hit@k` and `recall@k` measured with the inference `k`
- [ ] eval set with answerable and unanswerable questions, reviewed
- [ ] holdout recorded from eval evidence
- [ ] baseline reports for the untuned base model and a stronger reference model
- [ ] documents that teach the wrong thing excluded (for example multi-speaker sources)

## Data

- [ ] one prompt function shared by data generation and inference
- [ ] context from the production retriever with the production `k`
- [ ] oracle at a random position, distractor-only examples included
- [ ] teacher hints used and never stored
- [ ] structured output with an explicit abstention flag
- [ ] filters for citations, verbatim share, abstention phrasing, false denials, voice
- [ ] drop reasons counted, datasheet written and read
- [ ] holdout filter applied at export, independent leakage check passed
- [ ] validation split by document

## Training

- [ ] token lengths checked, long examples dropped, not truncated
- [ ] loss on the assistant reply only
- [ ] checkpoints and resume tested
- [ ] eval loss falling, no divergence

## Export and Serving

- [ ] adapter kept
- [ ] base model packaged with the same quantization and Modelfile
- [ ] serving wrapper runs retrieval, model and verifier together
- [ ] chat UI task model pointed elsewhere

## Evaluation

- [ ] identical retrieval for every model
- [ ] supported reported over answered and over all answerable
- [ ] paired comparison on questions both answered
- [ ] every false abstention checked against its retrieval hit
- [ ] 10 answer pairs read by a human
- [ ] decision rule written down before the run
