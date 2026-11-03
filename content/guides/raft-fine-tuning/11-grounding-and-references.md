---
title: "11 — Grounding and References"
description: "The RAFT paper, the libraries used in the example run, and how the numbers in this guide were produced."
weight: 11
type: "guide"
build:
  list: local
  render: always
---

# 11 — Grounding and References

This guide describes one complete run. The method follows the RAFT paper, and the numbers come from that run's reports. They will differ on your data.

## Method

- [RAFT: Adapting Language Model to Domain Specific RAG](https://arxiv.org/abs/2403.10131) (Zhang et al., 2024). The paper that defines training with distractor documents and verbatim citing.
- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) (Hu et al., 2021).

## Libraries and Tools

- [Unsloth](https://github.com/unslothai/unsloth): model loading, LoRA, `train_on_responses_only` and the 16-bit merge.
- [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer): the supervised fine-tuning loop.
- [PEFT](https://huggingface.co/docs/peft): the adapter implementation underneath.
- [llama.cpp](https://github.com/ggml-org/llama.cpp): GGUF conversion and quantization.
- [Ollama](https://github.com/ollama/ollama): local serving and the Modelfile format.
- [Qwen3.5-9B on Hugging Face](https://huggingface.co/Qwen/Qwen3.5-9B): the base model of the larger run.
- [Open WebUI](https://github.com/open-webui/open-webui): the chat UI in front of the serving wrapper.
- [RunPod](https://www.runpod.io/): the rented GPU for the 9B run.

## How the Numbers Were Produced

- Corpus: about 870 videos of one creator, transcribed locally with Whisper. Training used solo videos only.
- Eval set: 129 reviewed questions (103 answerable, 26 unanswerable). Every document referenced by eval evidence was held out from training.
- Retrieval: one local service, `k = 8` passages for answers, `hit@10 = 0.738` on the eval set.
- Teacher and judge: `qwen3.5:9b`, run locally. The judge being the teacher is a known bias.
- Training data: 7,988 attempts, 3,012 kept, 2,858 training and 144 validation examples after export filters.
- Models: Qwen3.5-4B (RTX 5070 Ti, 16 GB) and Qwen3.5-9B (RTX 6000 Ada, 48 GB), BF16 LoRA rank 16, 2 epochs, served as GGUF Q4_K_M through Ollama.

## Companion Post

The operational story of the run, including what broke, is in [My First RAFT Fine-Tune on a Shared 16 GB GPU: 7 Gotchas the Paper Doesn't Mention](/blog/my-first-raft-fine-tune-on-a-shared-16-gb-gpu-7-gotchas-the-paper-doesnt-mention/).
