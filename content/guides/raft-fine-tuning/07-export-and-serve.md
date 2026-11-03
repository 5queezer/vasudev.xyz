---
title: "07 — Export and Serving"
description: "Merge the adapter, quantize to GGUF, register the model and an equally packaged base model in Ollama, and serve the full pipeline behind an OpenAI-compatible endpoint."
weight: 7
type: "guide"
build:
  list: local
  render: always
---

# 07 — Export and Serving

## Core Idea

A fine-tuned model is only half the product. The other half is the pipeline around it: retrieval, the prompt function and the citation verifier. Serve them together.

## Export Steps

1. Merge the LoRA adapter into the base weights at 16 bit.
2. Convert to GGUF and quantize, for example to `Q4_K_M`.
3. Register the model with a Modelfile.

```text
FROM /abs/path/to/models/raft-4b/model-Q4_K_M.gguf
RENDERER qwen3.5
PARSER qwen3.5
PARAMETER temperature 1
PARAMETER top_k 20
PARAMETER top_p 0.95
PARAMETER presence_penalty 1.5
```

The `FROM` path must be absolute. A relative path is read as a model name, and `ollama create` fails with a confusing error.

## Package the Base Model the Same Way

For a fair comparison, export the untuned base model through the exact same steps, quantization and Modelfile. Otherwise you compare RAFT against a differently quantized or differently templated model and learn nothing.

## Disk Space

A 9B model produces a 16-bit merge (about 18 GB), a BF16 GGUF (about 17 GB) and the quantized GGUF (about 5.6 GB). Ollama copies the GGUF into its own store on `create`, so the intermediates can be deleted afterwards. Keep the adapter (a few hundred MB), because it can recreate everything.

## Serving the Pipeline

The model returns JSON with `[S3]` placeholders. Put a small OpenAI-compatible server in front that, per chat message:

1. retrieves passages,
2. builds the prompt with the shared prompt function,
3. calls the model with the JSON schema,
4. verifies the citations and rewrites the markers,
5. returns markdown with each reference linked to its source and the quotes folded below.

Two endpoints are enough for most chat UIs: `GET /v1/models` and `POST /v1/chat/completions`, with streaming answered as one chunk. Serialize generations with a lock if the GPU is shared.

## Chat UI Details

Chat UIs send more than questions. Greetings like "hi" should get a fixed reply instead of a forced citation. Short follow-ups like "why?" need the previous question for retrieval. UIs also generate chat titles and tags through the selected model. Point that task model somewhere else, or every title runs the whole pipeline.

Open WebUI lets each connection use either the Chat Completions API or the newer Responses API. A server that implements only `/v1/chat/completions` returns "not found" if the connection is set to Responses.

## Common Mistakes

- Serving the raw model without the verifier.
- Comparing against a base model packaged differently.
- Deleting the adapter after export.
