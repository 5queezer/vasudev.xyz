---
title: "11 — Grounding und Referenzen"
description: "Das RAFT-Paper, die im Beispiellauf verwendeten Bibliotheken und die Herkunft der Zahlen in diesem Leitfaden."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "6b06a679a5d4b9fdcd4c2ed272fc6c32"
---

# 11 — Grounding und Referenzen

Dieser Leitfaden beschreibt einen vollständigen Lauf. Die Methode folgt dem RAFT-Paper, und die Zahlen stammen aus den Berichten dieses Laufs. Mit deinen Daten werden sie anders ausfallen.

## Methode

- [RAFT: Adapting Language Model to Domain Specific RAG](https://arxiv.org/abs/2403.10131) (Zhang et al., 2024). Das Paper, das Training mit Ablenkungsdokumenten und wörtlichem Zitieren definiert.
- [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685) (Hu et al., 2021).

## Bibliotheken und Werkzeuge

- [Unsloth](https://github.com/unslothai/unsloth): Laden des Modells, LoRA, `train_on_responses_only` und der 16-Bit-Merge.
- [TRL SFTTrainer](https://huggingface.co/docs/trl/sft_trainer): die Schleife für überwachtes Fine-Tuning.
- [PEFT](https://huggingface.co/docs/peft): die zugrunde liegende Adapterimplementierung.
- [llama.cpp](https://github.com/ggml-org/llama.cpp): GGUF-Konvertierung und Quantisierung.
- [Ollama](https://github.com/ollama/ollama): lokales Serving und das Modelfile-Format.
- [Qwen3.5-9B auf Hugging Face](https://huggingface.co/Qwen/Qwen3.5-9B): das Basismodell des größeren Laufs.
- [Open WebUI](https://github.com/open-webui/open-webui): die Chat-Oberfläche vor dem Serving-Wrapper.
- [RunPod](https://www.runpod.io/): die gemietete GPU für den 9B-Lauf.

## Wie die Zahlen entstanden sind

- Korpus: etwa 870 Videos eines Creators, lokal mit Whisper transkribiert. Für das Training wurden nur Solo-Videos verwendet.
- Eval-Set: 129 überprüfte Fragen (103 beantwortbare, 26 unbeantwortbare). Jedes Dokument, auf das ein Eval-Beleg verwies, wurde vom Training ausgeschlossen.
- Retrieval: ein lokaler Dienst, `k = 8` Passagen für Antworten, `hit@10 = 0.738` auf dem Eval-Set.
- Teacher und Judge: `qwen3.5:9b`, lokal ausgeführt. Dass der Judge zugleich Teacher ist, stellt eine bekannte Verzerrung dar.
- Trainingsdaten: 7.988 Versuche, 3.012 behalten, nach Exportfiltern 2.858 Trainings- und 144 Validierungsbeispiele.
- Modelle: Qwen3.5-4B (RTX 5070 Ti, 16 GB) und Qwen3.5-9B (RTX 6000 Ada, 48 GB), BF16-LoRA mit Rang 16, 2 Epochen, als GGUF Q4_K_M über Ollama bereitgestellt.

## Begleitartikel

Die betriebliche Geschichte des Laufs einschließlich der Fehler steht in [Mein erstes RAFT-Fine-Tuning auf einer geteilten 16-GB-GPU: 7 Stolperfallen, die im Paper fehlen](/de/blog/mein-erstes-raft-fine-tuning-auf-einer-geteilten-16-gb-gpu-7-stolperfallen-die-im-paper-fehlen/).
