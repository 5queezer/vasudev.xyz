---
title: "Stoppt das Horten von Agenten‑Erinnerungen. Lasst sie schlafen."
date: 2026-04-07
tags: ["ai", "memory", "dream-engine", "consolidation"]
description: "Dein KI‑Agent erinnert sich an alles und lernt nichts. Schlafstil‑Konsolidierung ist die fehlende Architektur."
images: ["/images/dream-engine.png"]
translationHash: "d5a7ab7406be3836400c752b52070251"
chunkHashes: "6e595da33e676f68"
---
Ich habe eine Speicher‑Schicht für KI‑Agenten gebaut. Nach drei Wochen täglicher Nutzung hatte der Store 2.000 Einträge. Semantische Suche funktionierte weiterhin. Die Abruf‑Qualität sank. Die Datenbank erinnerte sich an alles und verstand nichts.

**Das Problem ist nicht die Erfassung. Jedes Speichersystem erfasst perfekt. Das Problem ist, was zwischen den Sitzungen passiert.**

Die meisten Agenten‑Frameworks behandeln Speicher als append‑only. Neue Fakten gehen rein, nichts kommt heraus, nichts wird vereinigt. Das ist nicht Speicher. Das ist Logging. Neurowissenschaften haben dieses Problem vor langer Zeit gelöst: Konsolidierung findet während des Schlafs statt. Selektive Replay stärkt wichtige Verbindungen. Interference wird ausgelöscht. Near‑duplicates werden zusammengeführt. Das Ergebnis ist ein kleinerer, dichter, besser abrufbarer Speicher.

Das ist genau das, was [MuninnDB's Dream Engine](https://vasudev.xyz/blog/why-ai-agents-need-sleep/) tut. Sie führt einen sechsphasigen Offline‑Pipeline durch, die aus dem Schlaf‑Neuroscience übernommen wurde: Hebbian replay, deduplication, LLM‑getriebene Konsolidierung, bidirektionale Stabilitäts‑Checks, transitive Inferenz und ein Traum‑Journal, das jede Mutation protocolliert. Der Agent wacht mit weniger Erinnerungen und besserer Recall‑Fähigkeit auf. Ich habe die [full architecture, the ablation results, and what three independent traditions say about why this works](https://vasudev.xyz/blog/svapna-sushupti/).

Der unbequeme Teil: Als ich jede Phase isoliert benchmarkte, war nur eine davon net‑positiv. Die restlichen sahen auf Dashboards großartig aus, während [retrieval accuracy stayed flat or dropped](https://vasudev.xyz/blog/memory-metrics-lying-how-to-ground-them/). Konsolidierungs‑Metriken können sich verbessern, ohne dass die Abruf‑Qualität steigt. Wenn du deine Speicher‑Metriken nicht an Abruf‑Benchmarks koppelst, optimierst du eine Zahl, die nichts bedeutet.

Wenn dein Agent‑Speicher heute größer ist als letztes Monat, ist das dann eine Funktion oder ein Fehlermodus?

---

Christian Pojoni baut kognitive Infrastruktur bei [vasudev.xyz].