---
title: "Stop Designing Your AI System. Design Its Environment."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Self-evolving AI harnesses fail when they optimize a fixed evaluator. The biological model is right: what needs to evolve is the selection pressure, not just the genome."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
---






I spent a week trying to design a "vector-native programming language for LLMs." The idea was to program model behavior directly at the activation level, no prompts, just intervention vectors. It was intellectually satisfying and practically wrong. What I actually wanted was not a language. It was an organism.

**The unit of evolution is not the feature. It is the mutation/selection cycle.**

That distinction changes everything about how you build a self-evolving AI harness. Most systems that call themselves "self-improving" are doing AutoML. They optimize over a fixed search space toward a fixed objective. That can produce adaptation, but it is closer to AutoML than to open-ended evolution. The difference turns out to be architecturally decisive in two ways.

---

## Genotype and Phenotype Are Not the Same Layer

Biological systems separate what persists from what gets selected. The genome is not tested directly. The phenotype is. Mutations happen to the genome. Selection happens to the phenotype. The genome survives by producing phenotypes that survive. This asymmetry is the source of evolvability itself.

An AI harness has an analogous structure if you build it correctly, not as literal biological equivalence, but as a useful architectural mapping. The genome is your persistent state: adapter weights, retrieval policies, tool configurations, activation steering rules, codebase patches. The phenotype is observable behavior on tasks. The evaluator sees behavior, not internals. Mutations target the genome. Selection targets the phenotype.

Many self-improving agent designs collapse this distinction, at least implicitly. They measure behavior, then directly edit the thing they measured. That is like evolving organisms by editing their phenotypes. It does not generalize because you are patching the symptom, not the cause.

The correct architecture separates these layers explicitly:

The **persistence tier** stores what survives: adapters (long-term), retrieval and tool policies (medium-term), activation steering rules (ephemeral). The **mutation generators** propose changes to the persistence tier, not to behavior directly. The **evaluator** observes behavior only, and gates which mutations survive. Nothing in the persistence tier gets updated except through this gate.

---

## The Evaluator Is Not a Loss Function

Here is where biological thinking breaks with ML thinking in a way that matters for architecture.

A loss function is a smooth, differentiable, locally defined objective. You minimize it. It assumes the correct answer is known and fixed. A selection pressure is none of these things. It is the environment, and the environment is not designed by you. It is whatever kills things that cannot handle it.

When you hand-design a task battery for your self-evolving harness and never change it, you have not built an environment. You have built a loss function with extra steps. The system will optimize for that battery and stop. It will find shortcuts the battery does not catch. This is Goodhart's Law at the architectural level: once a measure becomes a target, it ceases to be a good measure.

A fixed evaluator eventually becomes a ceiling. To sustain robust improvement, the evaluation environment needs to expand, diversify, or adversarially adapt. This means the task battery needs adversarial tasks specifically designed to catch surface-level gaming. It needs capability tasks (can it do the thing?), calibration tasks (does it know when it can't?), and regression tasks (did it break what it already knew?). And it needs at least one human-in-the-loop evaluation path that the system cannot predict, because predictable evaluators get gamed.

Practically, this means: start with a small fixed battery, but build the infrastructure to extend it from the beginning. Every mutation the system retains should generate a test case that would have caught a failure of that mutation. Over time, the battery grows with the system. That is co-evolution in the minimal viable form.

---

## SAE Steering Is One Operator, Not the Foundation

Sparse autoencoders can expose sparse latent features, many of which are interpretable enough to steer behavior locally, though feature quality and causal specificity remain active research questions. You can steer a model toward or away from a concept by adding or suppressing a feature vector at a specific layer during the forward pass. This is fast, reversible, and does not require retraining.

But it is one operator class in a mixed action space. The mutation generators in a serious harness should produce proposals across at least four substrates. The first substrate is prompt and retrieval transforms: cheap, reversible, always the starting point. The second is activation steering rules: fast, local, mid-tier commitment. The third is adapter and LoRA updates: heavier, requires training, medium-term persistence. The fourth is code and policy edits: highest commitment, hardest to roll back.

Starting with only SAE steering is like building an evolutionary system that can only mutate one gene. You get fast local adaptation and brittle global behavior. The system needs to be able to modify how it retrieves context, how it routes tools, and eventually how it processes information at the weight level, not because those are more powerful operators, but because different problems live in different substrates.

The right discipline is: a successful low-cost intervention should be re-expressed in a cheaper or more stable substrate where possible, as a prompt transform, retrieval rule, or adapter update, provided the causal effect survives translation. This is not a rule for safety alone. It is a rule for evolvability: the system should resist expensive mutations until cheap ones have found the right neighborhood.

---

## What a Minimal Viable Loop Actually Looks Like

The loop has six stages. Observe. Propose. Sandbox. Evaluate. Retain the winner (or reject all candidates). Update the search prior.

Observe means running the current genome against the task battery and recording behavioral metrics. Propose means the search policy generating candidate mutations, one per operator class, in parallel. Sandbox means each candidate runs in isolation: no shared state, hard resource limits, rollback guaranteed. Evaluate means scoring behavioral delta against the current baseline. Retain means writing the winner into the persistence tier with full provenance: before/after metrics, which prompts it affected, which operator class it used, and expiry and revalidation policy. Update search prior means the bandit or evolutionary policy learning which operator classes and which regions of the search space are producing survivors.

Every retained mutation needs a rollback handle. Not as a safety feature. As a design requirement. If you cannot roll back a mutation, you cannot measure its marginal contribution. If you cannot measure its marginal contribution, you are not evolving. You are accumulating.

---

## What I Left Out

**Self-modification of code.** Darwin-Gödel Machine-style self-editing works in sandboxed coding-agent settings with formal verifiers. For a general harness without those constraints, it is a Phase 4 concern, not because it is impossible, but because the prerequisite infrastructure (stable evaluator, rollback guarantees, narrow task scope) needs to be in place first.

**Feature universality.** SAE features are model-specific and sometimes checkpoint-specific. Whether useful features transfer across model versions is an open research question. The harness should be designed to re-extract feature dictionaries on each base model update rather than assuming stability.

**Multi-agent evaluators.** Using a judge model as part of the evaluation loop adds robustness but also creates an adversarial surface. The system can learn to satisfy the judge rather than the underlying task. This needs explicit counter-measures that I have not designed yet.

**Compute budgeting.** A mutation that improves capability by 2% but doubles latency is not a win. Latency and cost need to be first-class constraints in the evaluator, not afterthoughts.

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB is the persistence tier. The Dream Engine, modeled on sleep-phase memory consolidation, is the mechanism that promotes ephemeral observations into medium-term policy. The missing pieces are the search policy and the co-evolving evaluator. That is what gets built next.

If you are building in this space, the prior that is most worth borrowing is not from ML. It is from evolutionary biology: the environment does the selection. Your job is to build the environment, not the organism.

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). The genome/phenotype separation is already wired. What needs building is the evaluator that co-evolves with the system it measures.

---

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

*The cover image for this post was generated by AI.*
