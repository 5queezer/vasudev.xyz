---
title: "09 — Renting a GPU for the Bigger Model"
description: "What to upload, how to estimate cost, and the operational traps of unattended cloud training: slow mirrors, silent watchers and volumes tied to one host."
weight: 9
type: "guide"
build:
  list: local
  render: always
---

# 09 — Renting a GPU for the Bigger Model

## Core Idea

When the larger model does not fit your card, rent one for the training run only. Keep data generation, export and evaluation local, and upload as little as possible.

## Upload the Minimum

The example uploaded a 15 MB bundle: the training script, a pinned requirements file, a run script and the training and validation JSONL. No database, no audio, no keys. The pod downloaded the base model itself. Before uploading, an independent script confirmed that no passage came from a holdout or excluded document.

If the data contains material you would not publish, choose a provider's own data centers (for example RunPod Secure Cloud) over community hosts.

## Estimate Cost

Scale from a local run. The 4B model took 2 h 49 min locally. The 9B model needs about twice the compute, and a 48 GB workstation card is somewhat faster than a 16 GB consumer card, so 3 to 4 hours was a reasonable estimate. The actual run took 3 h 35 min at about one dollar per hour. Budget twice the expected time for a failed start.

## Make the Run Script Boring

```bash
set -euo pipefail
export HF_HOME=${HF_HOME:-$PWD/.hf}          # model cache on the persistent volume
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-train.txt
python train.py check
python train.py train --min-free-gb 30
python train.py export --stage merge
```

Pin every version you used locally. Put the Hugging Face cache on the persistent volume, not the container disk. Start it with `nohup` so it survives an SSH drop.

## Traps

**Slow mirrors.** The first pod in the example pulled PyTorch at 140 KB/s. If installation is not done in a few minutes, delete the pod and try another region or GPU type.

**Silent watchers.** A watcher that checks the pod over SSH must not depend on the exit code of its last command:

```bash
st=$(ssh "$POD" 'pgrep -f "^bash run.sh" && echo RUNNING; grep -q Error run.log && echo ERROR; true')
```

Without the final `true`, a healthy log makes `grep` exit 1, every check looks like a connection failure, and the finished pod idles. That cost three idle GPU hours in the example. Test the watcher against a fake "done" state before you go to sleep.

**Volumes tied to a host.** A stopped pod keeps its volume on the physical machine, and restarting needs a free GPU on that same machine. Have the job push its results somewhere (object storage, a network volume, your own server) as its last step, instead of waiting to be pulled.

**A deadline.** Schedule a stop at a fixed time as a safety net, independent of the watcher.

## Finish Cleanly

Download, verify checksums against the pod, then terminate the pod and its volume. Stopping is not enough, because a stopped volume keeps billing.

## Common Mistakes

- Uploading the whole project instead of a bundle.
- Unpinned dependencies on the pod.
- Pull-only result retrieval from a stoppable pod.
