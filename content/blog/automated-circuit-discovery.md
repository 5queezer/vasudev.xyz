---
title: "Capital-of Is Not a Single SAE Feature. So I Built a Mutation Loop to Find What Is."
date: 2026-04-11
tags: ["ai", "interpretability", "llm", "sparse-autoencoders"]
agentQuestions:
  - "Why is capital-of not a single SAE feature?"
  - "How did the mutation loop find better signals?"
  - "Why was tokenization the bottleneck?"
series: ["Reading the Residual Stream"]
series_weight: 2
description: "SAE features can't isolate relations in Gemma-2-2B. I built a mutation-selection loop that can. The bottleneck was tokenization."
images: ["/images/automated-circuit-discovery-og.png"]
---







**The bottleneck in automated interpretability is not probes, not SAEs, not compute. It is tokenization.**

Element-symbol has a differential ablation score of -16.72 in Gemma-2-2B. That is the strongest causal signal I have found in the model's residual stream, and I found it by hand. The question that drove everything that follows: can a machine find signals like this on its own?

The answer is yes. It took 42 failed proposals, a feedback loop that teaches an LLM what another model's tokenizer does, and a realization that the hardest part of automated interpretability has nothing to do with interpretability.

## Capital-of Does Not Exist as a Single Feature

I ran six experiments across two SAE widths (16k and 65k) on Gemma-2-2B looking for a "capital-of" feature. More than 300 candidate features. Layer 12, layer 20. Single-entity prompts, multi-entity prompts. Tight same-frame contrasts, loose contrasts. The best candidate, feature 14610 ("references to specific countries and their roles in various contexts"), passed multi-entity scoring across four countries and showed both steering and ablation causality.

Then I trained a linear probe and projected it onto all 16,384 SAE decoder directions. Feature 14610 ranked four-thousandth in alignment with the actual capital-of direction. It was a red herring. The feature that correlated most with capital-of, feature 4314 ("churches, bishops, geographical locations"), sat at a cosine similarity of 0.34. That is roughly a 30-degree angle from the real direction. A different limitation from the [measurement timing problem](/blog/gemma3-sae-measurement-timing/), but equally fundamental.

The capital-of relation is distributed across approximately five SAE features. Each one encodes a facet: political centers, geographic entities, formal documents, socioeconomic conditions. None is sufficient. Together they define the concept.

A logistic regression probe finds it instantly. Layer 20 residual stream, last token position, 12 capital-of prompts versus 12 other country-attribute prompts. Leave-one-out accuracy: 100%, 24 out of 24. Ablate the probe direction and capital prompts lose 3.56 logits on average. Other country-attribute prompts lose 0.87. The probe is four times more selective than any SAE feature.

Probes work. But probe directions require labeled prompt sets. Someone has to design the positive and negative classes by hand: same syntactic frame, different relation, single-token targets, diverse entities. For capital-of, that is a few hours. For systematic discovery across unknown domains, it is a dead end.

## The Mutation-Selection Loop

The architecture is minimal. An LLM proposes a new relation: a label, eight positive prompts with expected single-token completions, eight negative prompts with expected completions. The pipeline extracts residual stream activations at layer 20, trains a logistic probe with leave-one-out cross-validation, then ablates the probe direction and measures the differential impact on positive versus negative prompts. If ablation hurts positive prompts significantly more than negative (or vice versa) and LOO accuracy exceeds 0.8, the relation is SELECTIVE. It gets archived and the loop moves on.

The mutation operator receives a structured summary of everything tested so far: which relations were selective (with scores), which were not (with diagnostic reasons), and which were margin-gated before probing. This is the selection pressure. The LLM explores freely, constrained only by what the pipeline can evaluate.

![Flow diagram: LLM Proposer to Prompt Set to Tokenizer Gate to Probe Pipeline to Archive, with correction and feedback loops](/images/mutation-loop-inline.svg)

This is open-ended evolutionary search. The genome is the prompt set. The phenotype is the probe result. The evaluator is differential ablation. The archive is the population's memory. There is no fixed objective and no gradient. The [environment does the selection](/blog/ai-environment-design/), not the designer.

## Where It Broke: Zero Out of Fifteen

The first generation produced zero usable proposals. Fifteen attempts, zero relations made it through validation.

Three failure modes emerged. Collapsed answer spaces: "composer-instrument" mapped five of eight composers to " piano." When 62% of positive targets are identical, within-class margin is zero and the probe has nothing to separate. Duplicate concepts: the LLM kept proposing "composer-instrument" under slightly different labels, hitting the dedup gate. But the dominant failure was tokenization. The LLM proposed " 3.14" (five tokens in Gemma), " Salinger" (two tokens), " Impressionism" (two tokens). Every validation attempt died at the single-token gate.

## No LLM Knows What a Token Is

I tested four models as mutation operators.

| Model | JSON compliance | Token accuracy | Proposals passed |
|-------|----------------|---------------|-----------------|
| llama-3.3-70b (OpenRouter) | ~90% | ~70% | best available |
| Claude Sonnet 4.6 (OpenRouter) | ~60% | ~30% | 0/15 |
| Qwen3 14B (Ollama) | ~50% | ~40% | 0/15 |
| Qwen2.5 14B (Ollama) | ~80% | ~30% | 0/15 |

Sonnet 4.6 thinks out loud before producing JSON despite "Return ONLY valid JSON" in the system prompt. Qwen3 generates `<think>` tags that consume the token budget, leaving empty content after stripping. Qwen2.5 produces clean JSON but maps seven of fifteen proposals to "composer-instrument." llama-3.3-70b is the only model with reasonable JSON compliance, but it still fails on token accuracy systematically.

The problem is structural. No LLM has a world model of another LLM's tokenizer. They reason about tokens abstractly ("short strings are probably single tokens") but cannot verify their reasoning. A tokenizer is a lookup table built by BPE merges, not a semantic property. " Au" is one token because that merge was learned during tokenization training, not because gold's chemical symbol is short.

## The Fix: Feedback, Not Instructions

No amount of system prompt engineering teaches an LLM what Gemma's tokenizer does. I tried. More examples, explicit "UNSAFE" lists, capital letters, threat of being shut down. The pass rate stayed at zero.

The fix was to stop trying to teach and start correcting. Instead of rejecting proposals with multi-token targets immediately, the pipeline now collects all failing targets and feeds them back: "These targets are NOT single tokens in Gemma-2-2B: ' 3.14' (5 tokens), ' Salinger' (2 tokens). Replace them with targets that are EXACTLY 1 token. Safe: ' cat', ' A', ' Paris'. Unsafe: decimals, long names, compound words. Return the corrected JSON."

The LLM gets up to three correction rounds per proposal. Structural errors (malformed JSON, missing keys, duplicate labels) still reject immediately. Only token and diversity failures get retries with feedback.

Proposal pass rate: 0 out of 15 without feedback. 3 out of 5 with feedback.

## author-nationality: The First Machine-Found Circuit

The mutation operator proposed the relation `author-nationality` after one correction round. It initially offered ` Dystopian` and ` Satire` as targets, both two tokens in Gemma. After correction it produced valid prompt sets: `"The nationality of author Jane Austen is"` mapping to ` British`, `"The nationality of author Haruki Murakami is"` mapping to ` Japanese`, against `"The literary genre of author Jane Austen is"` mapping to ` Romance` and similar.

Pipeline result: LOO accuracy 1.000. Differential score +1.02. Verdict: SELECTIVE.

This is not as strong as element-symbol (diff=-16.72). But it is a relation that no human proposed. The machine found it, validated it, and archived it without manual intervention.

## The Baldwin Effect, Accidentally

The feedback loop has an evolutionary analog I did not plan for. Within a single proposal, the LLM "learns" which tokens work by receiving corrections in its conversation context. That learning persists across retries. But when the next proposal starts, the conversation resets. The learning is ephemeral.

In evolutionary biology, this is the [Baldwin effect](https://en.wikipedia.org/wiki/Baldwin_effect): organisms that learn during their lifetime gain a survival advantage, and over evolutionary time, the learned behaviors become genetically encoded. The feedback loop is Lamarckian within a generation (direct correction propagates) but Darwinian across generations (each new proposal starts fresh, informed only by the archive summary).

The codebase already tracks "Baldwin markers" for stable probe directions that replicate across runs. This feature was implemented for a practical reason: identifying which probes are robust enough to trust. But it maps exactly onto the biological concept. If a relation keeps getting proposed and keeps testing as selective across independent runs, it is a candidate for promotion to the seed set. Learned behavior becomes part of the genome.

## Where the Metaphor Breaks

Biological mutation operators work on the same substrate they modify. DNA polymerase reads and writes DNA. Transposases cut and paste within the same genome. There is no translation layer between the mutator and the genome.

In this system, the LLM mutator operates on natural language while the target model operates on BPE tokens. The mutation operator cannot see the fitness landscape it explores because it does not share the target's perceptual apparatus. The feedback loop compensates ("that shape does not fit") but it is fundamentally limited by the bandwidth of the correction channel. A biological mutator does not need to be told that ATGC is the valid alphabet. This LLM needs to be told, three times per proposal, that " Impressionism" is two tokens.

## The Testable Hypothesis

If the bottleneck is tokenizer blindness and the fix is feedback, then persisting feedback should eliminate the bottleneck. Concretely: pre-compute a table of valid single-token completions for common answer categories (country names, chemical symbols, musical instruments, numbers) using Gemma's actual tokenizer, and inject this table into the system prompt.

The prediction: with a pre-computed token vocabulary, the proposal pass rate should increase from 3/5 to above 4/5, and the dominant failure mode should shift from tokenization to the margin gate (whether Gemma confidently predicts the expected target token). If the bottleneck does not shift, the token table is not the real fix and the problem is deeper than vocabulary mismatch.

## What I Left Out

The margin gate is now the primary bottleneck. Three of five proposals passed validation but only one passed the margin gate, which requires the model's top-1 prediction to match the expected target with sufficient logit margin. Relations like "bird-habitat" and "painter-style" have fuzzy targets where Gemma does not strongly predict any single next token. Teaching the mutation operator to propose relations where the model has high confidence is the next problem.

Steering does not work for relational probe directions. Every direction in the archive shows strong ablation but zero or negative steering. Adding more of the capital-of direction makes predictions worse at any multiplier, tested up to 200x. These directions are routing signals. The model reads presence or absence, not amplitude. This has implications for the entire activation-steering agenda in alignment research.

The Gemma 4 migration is blocked on GemmaScope SAE availability. The 30-degree distribution finding may or may not replicate in larger models with wider residual streams. That experiment is waiting on tooling.

The code is in `discover.py` (probe loop) and `mutate.py` (mutation operator). Reach out if you want access to the repo.

---

*Christian Pojoni builds automated mechanistic interpretability tools. More at vasudev.xyz.*

*The cover image for this post was generated by AI.*
