---
title: "08 — Evaluating Against the Base Model"
description: "Identical retrieval for every model, metrics that separate knowledge from style, a paired comparison, and a look at every false abstention."
weight: 8
type: "guide"
build:
  list: local
  render: always
---

# 08 — Evaluating Against the Base Model

## Core Idea

The question is not "is the RAFT model good" but "is it better than the untuned base under exactly the same conditions, and in which way".

## Identical Conditions

Run every model on the same eval set with the same retrieved passages per question. In the example, `hit@10` (0.738) and `recall@10` were identical for all models, so any difference came from the model alone.

## Metrics That Separate Knowledge from Style

| Metric | Computed by | What it shows |
|---|---|---|
| supported | judge | is the answer backed by the passages |
| key-point coverage | judge | how much of the reference answer is there |
| citation validity | code | do quotes exist in their passages |
| citation precision | judge | do quotes support their sentences |
| correct abstention | code | abstains on unanswerable questions |
| false abstention | code | abstains on answerable questions |
| verbatim share | code | how much wording comes from the source |
| style | judge | sounds like the source author (1 to 5) |

Report "supported" both over answered questions and over all answerable questions. A model that abstains more looks better on the first and worse on the second.

## Example Results

| Metric | RAFT-9B | Base-9B | RAFT-4B | Base-4B |
|---|---|---|---|---|
| supported (all answerable) | 69% | 69% | 64% | 64% |
| key-point coverage | 0.50 | 0.46 | 0.48 | 0.44 |
| citation precision | 0.63 | 0.55 | 0.63 | 0.61 |
| correct abstention | 0.92 | 0.85 | 0.85 | 0.85 |
| false abstention | 5.8% | 2.9% | 9.7% | 2.9% |
| verbatim share | 0.57 | 0.35 | 0.60 | 0.20 |
| style (1 to 5) | 3.66 | 2.36 | 3.80 | 2.09 |

Factual support did not move. Voice and abstention did.

## Paired Comparison

Compare on the questions both models answered. On 9B that was 97 questions: supported 71 vs 70 and coverage 0.53 vs 0.48. Paired numbers remove the effect of different abstention rates.

## Inspect Every False Abstention

List each false abstention with its retrieval hit. In the example, 5 of the 6 false abstentions of RAFT-9B were questions with `hit@10 = 0`. The answer was not in the context, so abstaining was the honest reply. Only one was a real loss. Without this check, the regression looks three times worse than it is.

## Judge Bias

If the judge is also the teacher, it prefers answers that sound like its own. Prefer code-computed metrics where you can (validity, verbatim share, abstention), read 10 answer pairs yourself, and use a judge from another model family when the result matters.

## Decision Rule

Decide before you run the eval what counts as worse. The example rule was simple: stop and reconsider if RAFT is worse than the base overall. It was not, so the model shipped with its false-abstention trade-off documented.

## Common Mistakes

- Comparing models with different retrieval runs.
- Reporting only one "supported" number.
- Trusting a judge that is also the teacher.
