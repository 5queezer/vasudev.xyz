---
title: "06 — Einen LoRA-Adapter trainieren"
description: "BF16-LoRA mit Unsloth und TRL, Loss nur auf der Antwort des Assistant, eine Tokenlängenprüfung vor dem Training und Checkpoints, die eine gemeinsam genutzte GPU überstehen."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "cd9afdcc5992a1ad5d9c5b4ef50622bc"
---

# 06 — Einen LoRA-Adapter trainieren

## Kerngedanke

Der Trainingslauf ist der standardisierteste Teil von RAFT. Verwende bewährte Voreinstellungen, prüfe die Eingaben vor dem Verbrauch von GPU-Stunden und gestalte den Lauf fortsetzbar.

## Vor dem Training prüfen

Führe zunächst eine reine CPU-Prüfung der Trainingsdateien durch:

- Tokenlänge jedes Beispiels unter dem Chat-Template, einschließlich Median und Anzahl über `max_seq_length`
- dass die Loss-Maske nur die Antwort des Assistant abdeckt

RAFT-Prompts sind lang, weil sie Passagen enthalten. Im Beispiel wurde `max_seq_length = 6144` verwendet. Längere Beispiele wurden verworfen, nicht abgeschnitten, denn ein gekürzter Kontext kann genau die Passage entfernen, auf die sich die Antwort bezieht.

## Standardkonfiguration

Mit diesen Einstellungen wurden beide Beispielmodelle ohne weitere Abstimmung trainiert:

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

`train_on_responses_only` ist entscheidend. Ohne diese Einstellung wird der größte Teil des Loss für die Vorhersage der Passagen aufgewendet, was dem Modell nichts über das Antworten beibringt.

## Ressourcenwerte

| Modell | GPU | Spitzen-VRAM | Schritte | Zeit | Finaler Eval-Loss |
|---|---|---|---|---|---|
| Qwen3.5-4B | RTX 5070 Ti 16 GB | 10,8 GB | 358 | 2 h 49 min | 0,190 |
| Qwen3.5-9B | RTX 6000 Ada 48 GB | 25,1 GB | 358 | 3 h 35 min | 0,139 |

BF16-LoRA statt 4-Bit-QLoRA war eine bewusste Entscheidung. Das 4B-Modell passt in BF16 auf 16 GB und vermeidet Quantisierungsrauschen beim Vergleich mit dem Basismodell.

## Gemeinsam genutzte GPUs

Wenn andere Jobs dieselbe Karte verwenden, setze `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, speichere alle 50 Schritte einen Checkpoint und sorge dafür, dass `train` beim erneuten Start mit demselben Ausgabeverzeichnis vom letzten Checkpoint fortsetzt. Ein Out-of-Memory-Absturz kostet dann Minuten statt Stunden. Verweigere den Start unterhalb einer Schwelle für freien Speicher, statt mitten in einer Epoche abzustürzen.

## Eval-Loss lesen

Der Eval-Loss zeigt, dass das Modell das Format lernt und nicht overfittet. Er zeigt nicht, ob die Antworten besser geworden sind. Zwei Epochen ergaben im Beispiel einen stetig sinkenden Eval-Loss (0,154, 0,146, 0,143 und 0,142 bei den Schritten 50 bis 200 auf 9B). Die Entscheidung, das Modell zu behalten, fiel ausschließlich aufgrund der Aufgaben-Evaluation.

## Häufige Fehler

- Den Loss auf dem gesamten Prompt berechnen.
- Lange RAFT-Prompts abschneiden, statt sie zu verwerfen.
- Einen niedrigeren Eval-Loss als Beweis für ein besseres Modell deuten.
