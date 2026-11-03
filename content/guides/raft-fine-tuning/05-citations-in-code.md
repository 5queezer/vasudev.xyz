---
title: "05 — Citations Belong in Code"
description: "Let the model cite passage ids and verbatim quotes, then verify the quotes and generate timestamps and links in code."
weight: 5
type: "guide"
build:
  list: local
  render: always
---

# 05 — Citations Belong in Code

## Core Idea

A model that writes timestamps, page numbers or URLs itself will eventually invent a plausible one. Give the model only choices you can check.

> The model picks a passage id and copies a quote. Code verifies the quote and writes the reference.

## The Contract

The model answers with markers like `[S3]` and a citation list:

```json
{
  "answer": "Start where you already are every day [S2].",
  "insufficient": false,
  "citations": [{"source": "S2", "quote": "the easiest place to practice is the coffee shop you already walk into every morning"}]
}
```

The quote must be one contiguous run of 8 to 40 words from the passage. No paraphrase, no ellipsis.

## The Verifier

For each citation, code finds the quote in the passage (ignoring case, punctuation and whitespace), maps it to word-level timestamps and rewrites the marker:

```python
for c in out["citations"]:
    p = sources.get(c["source"])
    span = p and locate_quote(p, c["quote"])
    if not span:
        invalid += 1                    # marker gets removed from the answer
        continue
    refs[c["source"]] = f"#{p.doc_id} {clock(span.start)}"
answer = MARKERS.sub(lambda m: f"[{refs[m[1]]}]" if m[1] in refs else "", out["answer"])
```

Citation validity is now 1.00 by construction. Every reference in an answer points at words that exist.

## Quote Fitting

Small models often quote 6 words or 45, or join two sentences. Instead of dropping those, fit them: clamp an overlong quote, extend a short one within the transcript, or cut it to its longest verbatim run. In the example data, about half the examples had at least one fitted quote. Do the same fitting at inference so training and serving agree.

## What Validity Does Not Cover

A verified quote exists. It does not necessarily support the sentence it is attached to. Measure that separately as citation precision with a judge (see [Evaluating](08-evaluating.md)). The example models reached 0.63 there, which is the honest number for this gap.

## Serving Consequence

The raw model output is JSON with `[S3]` placeholders, which is useless in a chat UI. You need a thin server that runs retrieval, the model and the verifier per message and returns finished markdown (see [Export and Serving](07-export-and-serve.md)).

## Common Mistakes

- Letting the model produce timestamps or URLs.
- Dropping fitted quotes in training but fitting them at inference, or the reverse.
- Treating citation validity as citation quality.
