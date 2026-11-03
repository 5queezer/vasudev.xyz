---
title: "06 — Training a LoRA Adapter"
description: "BF16 LoRA with Unsloth and TRL, loss on the assistant reply only, a token length check before training, and checkpoints that survive a shared GPU."
weight: 6
type: "guide"
build:
  list: local
  render: always
---

# 06 — Training a LoRA Adapter

## Core Idea

The training run is the most standard part of RAFT. Use known-good defaults, check the inputs before you spend GPU hours, and make the run resumable.

## Check Before You Train

Run a CPU-only check over the training files first:

- token length per example under the chat template, with the median and how many exceed `max_seq_length`
- that the loss mask covers only the assistant reply

RAFT prompts are long because they carry passages. The example used `max_seq_length = 6144`. Examples above it were dropped, not truncated, since a truncated context can cut off the passage the answer cites.

## Default Configuration

These settings trained both example models without tuning:

```python
model, tok = FastLanguageModel.from_pretrained(
    "Qwen/Qwen3.5-4B", max_seq_length=6144, dtype=torch.bfloat16, load_in_4bit=False)
model = FastLanguageModel.get_peft_model(
    model, r=16, lora_alpha=16, lora_dropout=0, target_modules=TARGET_MODULES,
    use_gradient_checkpointing="unsloth", random_state=3407)
args = SFTConfig(
    per_device_train_batch_size=1, gradient_accumulation_steps=16,
    num_train_epochs=2, learning_rate=2e-4, lr_scheduler_type="linear",
    warmup_steps=0.03, weight_decay=0.001, optim="adamw_8bit",
    max_length=6144, packing=False, eval_steps=50, save_steps=50)
trainer = train_on_responses_only(trainer, instruction_part=INSTRUCTION_PART,
                                  response_part=RESPONSE_PART)
```

`train_on_responses_only` matters. Without it, most of the loss is spent predicting the passages, which teaches the model nothing about answering.

## Resource Numbers

| Model | GPU | Peak VRAM | Steps | Time | Final eval loss |
|---|---|---|---|---|---|
| Qwen3.5-4B | RTX 5070 Ti 16 GB | 10.8 GB | 358 | 2 h 49 min | 0.190 |
| Qwen3.5-9B | RTX 6000 Ada 48 GB | 25.1 GB | 358 | 3 h 35 min | 0.139 |

BF16 LoRA rather than 4-bit QLoRA was a deliberate choice. The 4B model fits in BF16 on 16 GB, and it avoids quantization noise in the comparison with the base model.

## Shared GPUs

If other jobs use the same card, set `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, save checkpoints every 50 steps, and make `train` resume from the latest checkpoint when it is started again with the same output directory. An out-of-memory crash then costs minutes, not hours. Refuse to start below a free-memory threshold instead of crashing mid-epoch.

## Reading Eval Loss

Eval loss tells you the model is learning the format and is not overfitting. It does not tell you whether answers got better. Two epochs gave steadily falling eval loss in the example (0.154, 0.146, 0.143, 0.142 at steps 50 to 200 on 9B). The decision to keep the model came only from the task eval.

## Common Mistakes

- Computing loss on the whole prompt.
- Truncating long RAFT prompts instead of dropping them.
- Reading a lower eval loss as a better model.
