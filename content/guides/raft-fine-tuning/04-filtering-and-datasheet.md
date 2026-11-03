---
title: "04 — Filtering and the Datasheet"
description: "Rejection-sample the teacher's answers with explicit checks, count every drop reason, and read a datasheet before you train."
weight: 4
type: "guide"
build:
  list: local
  render: always
---

# 04 — Filtering and the Datasheet

## Core Idea

The student learns whatever the kept examples do, including the teacher's bad habits. Filtering decides the quality of the model more than any hyperparameter.

> Keep only answers you would be happy to see at inference, and count why everything else was dropped.

## A Filter Catalog

Each check below exists because an early sample showed the failure. Drop counts are from 7,988 attempts in the example run, of which 3,012 (38%) were kept.

| Check | What it catches | Drops |
|---|---|---|
| uncited sentence | a claim without a source marker | 1,569 |
| low verbatim share | paraphrase instead of the source's own wording | 1,019 |
| formulaic abstention | the same stock phrase for every "not covered" | 875 |
| invalid citation | quote not found in the cited passage | 513 |
| unresolved marker | marker that points to no citation | 393 |
| marker without quote | citation id with no quote | 240 |
| declined | refusal to answer at all | 221 |
| third person | "the speaker says" instead of first person | 77 |
| false denial | "I haven't talked about that" with the answer in context | 35 |

## The False Denial

The sneakiest failure: in an oracle example the source passage is in the context, yet the answer opens with a denial and then answers anyway. Train on that and the student learns to deny what it knows. A regex on the opening catches most cases.

```python
FALSE_DENIAL = re.compile(
    r"^(?:\w+,\s+)?I(?: (?:haven't|have not|never|don't|didn't) "
    r"(?:talk|talked|say|said|discuss|discussed|cover|covered|mention|mentioned)\b)")
```

Apply it again at export, because filters improve after examples already exist.

## The Datasheet

Write a datasheet next to the data on every export. It should include:

- attempts, kept and keep rate
- drop reasons, both final and "first sample dropped, second kept"
- the oracle, distractor-answered and abstention shares
- topic distribution of the questions
- the most common answer and abstention openings
- 20 random examples, in full

The openings list is the most useful line. When "I haven't talked" showed up 189 times as an answer opening, that was the signal to add the formulaic-abstention check.

## How Much Data

The example used 2,858 training and 144 validation examples (validation split by document, 5% of documents). That was enough to move style and abstention behavior clearly. More examples of the same distribution help less than better filters.

## Common Mistakes

- Filtering only for format and not for behavior (false denials, third person).
- Not counting drops, so you cannot tell which check matters.
- Splitting validation by example instead of by document, which leaks passages.
