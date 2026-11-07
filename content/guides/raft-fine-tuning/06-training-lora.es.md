---
title: "06 — Entrenar un adaptador LoRA"
description: "LoRA en BF16 con Unsloth y TRL, pérdida solo sobre la respuesta del assistant, comprobación de longitud de tokens antes de entrenar y checkpoints que sobreviven a una GPU compartida."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "cd9afdcc5992a1ad5d9c5b4ef50622bc"
---

# 06 — Entrenar un adaptador LoRA

## Idea central

La ejecución del entrenamiento es la parte más estándar de RAFT. Usa valores predeterminados fiables, comprueba las entradas antes de gastar horas de GPU y permite que la ejecución se pueda reanudar.

## Comprobar antes de entrenar

Ejecuta primero una comprobación solo con CPU sobre los archivos de entrenamiento:

- longitud de tokens por ejemplo bajo la plantilla de chat, con la mediana y cuántos superan `max_seq_length`
- que la máscara de pérdida cubra solo la respuesta del assistant

Los prompts de RAFT son largos porque contienen pasajes. El ejemplo usó `max_seq_length = 6144`. Los ejemplos que lo superaban se descartaron, no se truncaron, porque un contexto truncado puede cortar el pasaje citado por la respuesta.

## Configuración predeterminada

Estos ajustes entrenaron ambos modelos de ejemplo sin afinarlos:

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

`train_on_responses_only` es importante. Sin ello, la mayor parte de la pérdida se dedica a predecir los pasajes, lo que no enseña nada al modelo sobre cómo responder.

## Cifras de recursos

| Modelo | GPU | Pico de VRAM | Pasos | Tiempo | Pérdida final de evaluación |
|---|---|---|---|---|---|
| Qwen3.5-4B | RTX 5070 Ti 16 GB | 10,8 GB | 358 | 2 h 49 min | 0,190 |
| Qwen3.5-9B | RTX 6000 Ada 48 GB | 25,1 GB | 358 | 3 h 35 min | 0,139 |

Elegir LoRA en BF16 en lugar de QLoRA de 4 bits fue deliberado. El modelo 4B cabe en BF16 sobre 16 GB y así se evita ruido de cuantización al compararlo con el modelo base.

## GPU compartidas

Si otros trabajos usan la misma tarjeta, establece `PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True`, guarda checkpoints cada 50 pasos y haz que `train` reanude desde el último checkpoint cuando vuelva a iniciarse con el mismo directorio de salida. Un fallo por falta de memoria costará minutos, no horas. Rechaza el inicio por debajo de un umbral de memoria libre en vez de fallar en mitad de una época.

## Interpretar la pérdida de evaluación

La pérdida de evaluación muestra que el modelo aprende el formato y no está sobreajustando. No indica si las respuestas mejoraron. Dos épocas produjeron una pérdida de evaluación que descendía de forma continua en el ejemplo (0,154, 0,146, 0,143 y 0,142 en los pasos 50 a 200 para 9B). La decisión de conservar el modelo procedió únicamente de la evaluación de la tarea.

## Errores habituales

- Calcular la pérdida sobre todo el prompt.
- Truncar prompts largos de RAFT en vez de descartarlos.
- Interpretar una pérdida de evaluación menor como un modelo mejor.
