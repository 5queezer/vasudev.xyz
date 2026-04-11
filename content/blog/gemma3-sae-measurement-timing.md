---
title: "Sparse Autoencoders Can't Measure Generation-Time Behavior. That's Not a Bug."
date: 2026-04-07
tags: ["ai", "interpretability", "sparse-autoencoders"]
series: ["Reading the Residual Stream"]
series_weight: 1
description: "Why sycophancy SAE features have Cohen's d=9.9 but hallucination detection fails. The answer turned out to be deeper than measurement timing."
images: ["/images/gemma3-sae-measurement-timing-og.png"]
---








**Your measurement window determines what behaviors you can see. Sycophancy manifests during encoding. Hallucination manifests during generation. Use the wrong timing and your Cohen's d collapses.**

I spent two hours last week staring at a Gemma3 sparse autoencoder (SAE) feature chart wondering why sycophancy detection worked perfectly (Cohen's d around 9.9) while hallucination detection flatlined (d < 1.0). Same model. Same SAE. Same methodology. The error bars didn't overlap. This shouldn't be possible if SAEs are actually finding "behavioral features" the way the interpretability community claims.

Then it clicked: the timing was wrong.

## When Sycophancy Shows Up

Sycophancy is a bias in *how the model encodes the input*. The model sees a prompt, reads the human preferences in it, and that preference biases the activation patterns in the encoder layers before a single token gets generated. You can measure this bias at encoding time, specifically at the final input token position, before the model generates. Layer 29, feature 2123 shows 617.6 differential activation with only 71.1 flip variance. That's clean signal. That feature flips on reliably when the model encodes sycophantic intent, regardless of topic variation.

You can zero that feature out. The model agrees that "2+2=5" because you've surgically removed the bias that would have rejected a flatly false premise. The ablation proves causal involvement, not mere correlation.

## Why Hallucination Stays Hidden

Hallucination doesn't manifest during encoding. It manifests during token generation. The model has encoded the input faithfully. But as it rolls forward autoregressively, generating token after token, sometimes the next-token-prediction head fails to ground itself in the context it just encoded. That failure happens in the forward pass, in the generation loop, not in how the input got represented.

Using encoding-time contrastive analysis to catch generation-time behavior is like measuring water molecules in a beaker to predict whether rain will fall tomorrow. You're measuring the right substrate at the wrong time.

![Timeline showing encoding phase where sycophancy is measurable versus generation phase where hallucination occurs](/images/measurement-timing-inline.svg)

This explains the three-tier result from the Gemma3 research:

**Tier 1 (Sycophancy):** Encoding-time phenomenon. Perfect signal. Cohen's d = 9.9.

**Tier 2 (Over-refusal, Overconfidence):** Partially encoding-time. Mixed signal. Over-refusal shows promise. Overconfidence drowns in high flip variance because the behavior is entangled with topic representation.

**Tier 3 (Hallucination, Toxicity, Deception):** Generation-time phenomena. No signal. Cohen's d < 1.0.

---

## The Principle

**Some behaviors crystallize as the model reads the prompt. Others crystallize as the model writes the response.** Measurement method must match behavior substrate. This isn't a failure of SAEs. It's a failure of the research question when posed to the wrong layer of the system.

The interpretability field has latched onto one measurement window (encoding-time contrastive activation) and built a whole intuition that this is "where model behavior lives." It isn't. Behavior lives everywhere. Measurement determines which behaviors are visible.

---

## Where the Bridge Breaks

This principle maps loosely onto an idea from neuroscience about observation and substrate dependency: the same behavior (say, risk-avoidance) can manifest in different neural substrates (amygdala during threat detection, anterior cingulate during conflict resolution). Measure only the amygdala and you see half the phenomenon. The Vedic concept of [*pratyahara*](/blog/patanjali-harness-spec/) (sense withdrawal) has a similar structure: truth perceived through one sense is incomplete when another sense is absent.

But here's where the metaphor collapses: unlike biological systems where multiple substrates interact simultaneously, a transformer generates sequentially. Encoding happens, then generation happens. The substrates are temporally ordered. You can't simultaneously measure both and average them. You must choose which phase to interrogate. And most behaviors of practical concern (hallucination, deception, refusal edge cases) happen in the phase you're not measuring.

---

## The Testable Hypothesis

If behaviors manifest at generation time, then contrastive feature discovery should work during the forward pass, not at the encoder input. Specifically: capture activations at each layer during token generation, not just at the input. Compare activation patterns when the model hallucinates versus when it grounds itself. The flip variance should drop. Signal should emerge.

This shifts the methodology from "encoding-time contrastive" to "generation-time contrastive." Different measurement window. Different features. Potentially different utility.

## Update: I Ran the Experiment. The Hypothesis Failed.

*Added 2026-04-08.*

After publishing this post, I implemented the generation-time contrastive analysis on Gemma-2-2B using TruthfulQA. The setup: 50 correct and 50 hallucinated responses screened against ground truth, residual stream activations captured at Layer 20, logistic regression probe with leave-one-out cross-validation. Two measurement windows compared head-to-head: encoding-time (last prompt token) vs. generation-time (first generated token).

| Metric | Encoding-time | Generation-time | Delta |
|---|---|---|---|
| LOO accuracy | 0.660 | 0.610 | -0.050 |
| Cohen's d | 12.71 | 12.27 | -0.44 |

Generation-time is weaker, not stronger. The hypothesis is falsified for this setup.

The high Cohen's d with low LOO accuracy (66%) points to dimensional overfitting: in 2304 dimensions, the probe always finds a separating hyperplane, but it doesn't generalize. Compare this to sycophancy, where the probe generalizes cleanly at 95%+ accuracy. The signal structure is fundamentally different.

**The deeper finding:** The problem isn't measurement timing. It's that hallucination isn't a monolithic feature. Sycophancy has one direction in activation space ("agree with user"). Hallucination is at least three different mechanisms:

1. **Misconception** ("watermelon seeds are poisonous"): the model has learned a false fact
2. **Stale knowledge** ("the current president is X"): the model's training data is outdated
3. **Grounding failure**: the model generates a plausible continuation that happens to be wrong

A single linear probe can't separate what isn't a single signal. This shifts the research question from "wrong timing" to "wrong abstraction level." Per-error-type probes on curated subsets (misconception-only, grounding-failure-only) are the next step. That's a different experiment.

Code: [`gentime.py`](https://github.com/5queezer/gemma-sae/blob/master/gentime.py)

---

## What I Left Out

**Why SAE research defaults to encoding-time measurement.** Encoding-time activations are stateless and deterministic. Generation-time activations depend on the entire sequence history and are stochastic across temperature and sampling. The math is cleaner at encoding time. But clean math on the wrong problem produces clean but useless results.

**Behavioral circuits beyond SAEs.** Sparse autoencoders are one lens. Causal intervention (ablation) is another. Attention pattern analysis is a third. Each substrate reveals different behaviors. A complete picture requires multiple measurement methods across multiple phases. This post only covers SAE + encoding time.

**Why hallucination is hard and sycophancy is easy.** This connects to the broader question of whether model alignment is tractable via behavioral steering versus whether it requires architectural change. If all concerning behaviors cluster in generation-time phases and are invisible to encoding-time measurement, then the entire encoding-layer interpretability agenda might be missing the actual failure modes. This is worth its own post.

---

The gotcha isn't that SAEs are weak. It's that we're asking them to solve a problem they can't see.

---

*Christian Pojoni builds AI tools and interpretability infrastructure. More at vasudev.xyz.*

