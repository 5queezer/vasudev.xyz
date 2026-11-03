---
title: "My First RAFT Fine-Tune on a Shared 16 GB GPU: 7 Gotchas the Paper Doesn't Mention"
date: 2026-11-03
description: "I fine-tuned Qwen3.5 with RAFT to answer in one creator's voice with verified citations. The training was the easy part."
images: ["/images/first-raft-fine-tune-gotchas-og.png"]
author: "Christian Pojoni"
tags: ["ai", "benchmarks", "llm"]
agentQuestions:
  - "What is RAFT and how do you build the training data?"
  - "How do you make a fine-tuned model cite sources reliably?"
  - "Did RAFT beat the base model on a real eval?"
series: ["Field Notes"]
---

[RAFT](https://arxiv.org/abs/2403.10131) (Retrieval-Augmented Fine-Tuning) trains a model on questions paired with retrieved passages, some relevant and some distractors, so it learns to answer from the right passage and ignore the rest. I wanted to understand it by doing it once, end to end, on a corpus I already had: about 870 videos of a single YouTube creator, transcribed locally, mostly solo monologues. The goal was a local model that answers in the first person, in his words, cites every sentence as `[#video mm:ss]`, and honestly says so when the transcripts don't cover the question.

It works. Qwen3.5-4B trained on my RTX 5070 Ti in under three hours, Qwen3.5-9B on a rented 48 GB card for about $3.50 of training time, and both now answer through Open WebUI with citations that code has checked against the transcript. Getting there taught me more about data pipelines and evaluation than about training.

**In RAFT, the training run is a commodity. The data filter and the eval decide everything.**

---

## 1. Train on exactly the bytes you will serve

The most common way to waste a fine-tune is a format mismatch: the training examples use one system prompt and passage layout, and the inference code uses a slightly different one. The model then sees an input distribution at serving time that it never trained on, and the gains quietly evaporate.

The fix is structural, not a matter of discipline. One function builds the prompt, and both the data generator and the answer pipeline call it:

```python
def prompt(passages: list[Passage], question: str) -> tuple[dict, str, str]:
    """(passages by id S1..Sn, system prompt, user message). Training examples are built with this too, so
    the fine-tuned model sees exactly the inference format."""
    sources = {f"S{n}": p for n, p in enumerate(passages, 1)}
    blocks = [_passage_block(p, label) for label, p in sources.items()] or ["(no passages found)"]
    return sources, SYSTEM, "\n\n".join(blocks) + "\n\n" + TASK + question
```

The context for each training example also comes from the same running retrieval service the chat uses, with the same `k`. **The student never sees a passage layout, ranking, or context length that inference won't produce.**

Lesson: if training and serving build prompts in two places, they will drift. Make it one function.

---

## 2. The teacher gets a hint the student never sees

RAFT needs two kinds of examples. In the oracle case the passage the question came from sits somewhere in the context among distractors. In the distractor-only case every passage from that video is removed, and the right answer is often that the transcripts don't cover it.

I self-distilled the answers from a local teacher, `qwen3.5:9b`. Left alone, the teacher answers from whatever passage looks closest and rarely abstains. So the teacher gets one extra line that is never stored in the training data:

```python
HINT_ORACLE = ("Hint (not shown at inference): passage {label} is where this question came from; build the answer "
               "mainly from his words there. " + VOICE)
```

The distractor hint says the opposite: none of these passages was the source, answer only if they really cover it, otherwise abstain in his voice. The oracle goes to a random position among the best `k-1` hits, so the student can't learn that the answer always comes first. 80% of attempts are oracle cases and the rest distractor-only, and generation continues until at least 12% of the kept examples are abstentions.

Lesson: **the teacher can know things at generation time that the student must learn to infer.** Use that asymmetry, and strip the hint from what you store.

---

## 3. Filtering is the real work: I kept 38%

The teacher made 7,988 attempts. 3,012 survived. The drop reasons say a lot about what a 9B teacher does with a strict format:

| Reason | Drops |
|---|---|
| sentence without a citation | 1,569 |
| too little verbatim wording from the passage | 1,019 |
| formulaic abstention ("I haven't talked about") | 875 |
| citation quote not found in the passage | 513 |
| marker pointing to no citation | 393 |

Each filter exists because an early sample showed the failure. The sneakiest one is the false denial: in an oracle example the answer is in the context, yet the teacher opens with "I haven't talked about that" and then answers anyway. Train on that and the student learns to deny things it knows. A regex catches the opening, and those examples are dropped at export too:

```python
FALSE_DENIAL = re.compile(  # an oracle answer opening with a denial although the source passage is in context
    r"^(?:\w+,\s+)?I(?: (?:(?:haven[’']t|have not|have never|never|don[’']t|do not|didn[’']t) (?:talk|talked|say|"
    r"said|discuss|discussed|cover|covered|mention|mentioned)\b|haven[’']t \w+)|[’']ve (?:never|not) \w+)")
```

Every drop reason gets counted in a datasheet next to the data, together with topic shares, the most common answer openings and 20 random samples. When "I haven't talked" showed up 189 times as an opening, that was the signal to add the formulaic-abstention filter.

Lesson: **a rejection-sampling pipeline with counted drop reasons is worth more than any hyperparameter.** Read the datasheet before you train.

---

## 4. Never let the model write timestamps

A model that writes `[#470 00:04]` itself will eventually make up a plausible timestamp. So the model never sees timestamps. It cites passage ids like `[S3]` and, for each one, a verbatim quote of 8 to 40 words. Code then finds the quote in the transcript, maps it to word-level timestamps and rewrites the marker:

```python
fit = fit_quote(p, str(c.get("quote", "")).strip()) if p else None
span = quote_span(p, fit[0]) if fit else None
if not span:
    invalid += 1                      # marker gets removed from the answer
    refs.setdefault(label, []).append(None)
    continue
refs.setdefault(label, []).append(f"#{p.doc.file_id} {clock(span[0])}")
```

Citation validity is therefore 1.00 by construction: every timestamp in an answer points at words that are really there.

The catch showed up when I wanted to chat with it. The raw model returns JSON with `[S3]` placeholders, which is useless in a chat UI, so I wrote a small OpenAI-compatible server that runs retrieval, model and validation per message and returns markdown with the markers linked to YouTube. Open WebUI then showed a "not found" error. The new connection was set to the Responses API and was calling `POST /v1/responses`. Switching the connection to Chat Completions fixed it.

Lesson: **put the facts the model can get wrong (ids, timestamps, URLs) in code, and let the model choose only between options you can check.**

---

## 5. Leakage is a data problem, so check it like one

An eval is only worth something if no eval episode leaks into training. Every video referenced by an eval answer goes into a holdout set, and multi-speaker videos (interviews, call-ins) are excluded because the transcripts have no speaker labels and the guest's views would end up in his voice. The filter runs at generation and again at export, because the holdout can grow after examples exist:

```python
def usable(examples: list[dict], holdout: set) -> list[dict]:
    return [e for e in examples if not false_denial(e) and e["meta"]["context"] and e["meta"]["file_id"] not in holdout
            and not {x["file_id"] for x in e["meta"]["context"] + e["meta"]["retrieved"]} & holdout]
```

Note the last line: not only the source video but every passage in the context must be outside the holdout. Before uploading anything to a cloud GPU I ran a separate script over the final `train.jsonl` and `val.jsonl` that matched passages back to files: zero hits from the 113 holdout episodes, zero from multi-speaker videos.

Lesson: check the export file itself, not just the code that was supposed to produce it.

---

## 6. RAFT bought style, not facts

Same 129 questions, identical retrieval for every model (hit@10 0.738), judged by `qwen3.5:9b`:

| Metric | RAFT-9B | Base-9B | RAFT-4B | Base-4B |
|---|---|---|---|---|
| supported (of 103 answerable) | 69% | 69% | 64% | 64% |
| key-point coverage | 0.50 | 0.46 | 0.48 | 0.44 |
| citation precision | 0.63 | 0.55 | 0.63 | 0.61 |
| correct abstention (26 unanswerable) | 0.92 | 0.85 | 0.85 | 0.85 |
| false abstention | 5.8% | 2.9% | 9.7% | 2.9% |
| verbatim share | 0.57 | 0.35 | 0.60 | 0.20 |
| style (1-5) | 3.66 | 2.36 | 3.80 | 2.09 |

**Factual support didn't move. Voice moved a lot.** The verbatim share nearly tripled on 4B and the style score went from "generic assistant" to recognisably him. On 9B, coverage, citation precision and correct abstention improved a little.

The price is false abstention: RAFT says "I haven't covered that" more often than the base. I checked each case: on 9B, 5 of the 6 false abstentions were questions where retrieval hadn't found the answer at all (hit@10 = 0), so abstaining was the honest reply to that context. One was a real loss. And the larger 9B base still beats both 4B models on support, which says more about parameters than any LoRA does.

One caveat I can't fix cheaply: the judge is the same model as the teacher, so it likes answers that sound like its own. The verbatim share is computed in code and doesn't have that bias, and it tells the same story.

Lesson: separate "what does it know" from "how does it say it" in your eval, or a style win will look like a knowledge win.

---

## 7. Cloud GPUs fail in boring ways

The 9B model needs about 25 GB for BF16 LoRA training, so it ran on RunPod's Secure Cloud. My first pod pulled PyTorch at 140 KB/s for 18 minutes before I deleted it. The second, an RTX 6000 Ada at $0.99/h, trained in 3 h 35 min to an eval loss of 0.139 (4B: 0.190).

Then my overnight watcher missed the finish. It polled the pod over SSH and skipped to the next round whenever SSH failed:

```bash
st=$(ssh "$POD" 'pgrep -f "^bash runpod_9b.sh" && echo RUNNING;
      grep -qE "Traceback|Error:" run.log && echo ERROR') || { sleep 120; continue; }
```

The exit status of the remote command is that of the last `grep`, which is 1 whenever the log has *no* error. So every healthy check counted as a failed connection, and the pod sat idle for three hours until a deadline script stopped it. Ending the remote command with `; true` fixes it.

The second surprise: a stopped pod keeps its volume on the physical host, and restarting needs a free GPU on that same host. There wasn't one until the early morning, so the finished model was out of reach for hours. Next time the job pushes its results somewhere as its last step instead of waiting to be pulled.

Lesson: **for unattended cloud jobs, write the watcher as carefully as the training script, and test it on a fake "done" state first.**

---

## What I Left Out

- **An independent judge.** The teacher judging its own student flatters style. A different model family as judge is the obvious next step.
- **Checking that a quote supports the claim.** Code verifies that a quote exists verbatim, not that it backs the sentence it's attached to. Citation precision of 0.63 is the honest number for that gap.
- **Multi-turn training.** Every example is one question. For a short follow-up such as "why?" the chat server prepends the previous question. That is a workaround, not a skill.
- **Retriever and reranker training.** The export already writes query/passage/hard-negative pairs. With hit@10 at 0.738, a quarter of the questions never get the right passage into the context, so that's where the next real gain is.
- **Preference tuning against false abstention.** DPO pairs of "abstained with the answer in context" vs. "answered" would target exactly the regression in gotcha 6.

## The Setup

Everything except the 9B training ran on one desktop: RTX 5070 Ti (16 GB) shared with other jobs through a small lease tool, so data generation, training, and evals queued for VRAM instead of crashing each other. 4B training used BF16 LoRA rank 16 on 200 modules, 2 epochs, 358 steps, peaking at 10.8 GB. Models are exported to GGUF Q4_K_M and served by Ollama. No transcript left the machine except the training bundle for the rented GPU, which was deleted with the pod.

If you want to try RAFT, start with gotcha 3: build the rejection filter and the datasheet before you write a single line of training code. That's where I spent most of my time, and it was the part worth spending it on. The step-by-step version with defaults and a checklist is the [RAFT Fine-Tuning Guide](/guides/raft-fine-tuning/).

---

*Christian Pojoni builds local AI systems and writes about what breaks. More at [vasudev.xyz](https://vasudev.xyz).*
