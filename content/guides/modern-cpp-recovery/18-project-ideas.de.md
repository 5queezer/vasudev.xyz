---
title: "18 — Projektideen"
description: "Ein ernsthaftes Projekt ist wertvoller als passives Lernen. Wähle ein Projekt, das dich zwingt, moderne C++-Features, Tooling, Debugging und Fachkonzepte einzusetzen."
weight: 18
type: "guide"
build:
  list: local
  render: always
translationHash: "bbc47e2c32913fc14076f3f3c6c5987f"
---

# 18 — Projektideen

## Kernidee

Ein ernsthaftes Projekt ist wertvoller als passives Lernen. Wähle ein Projekt, das dich zwingt, moderne C++-Features, Tooling, Debugging und Fachkonzepte einzusetzen.

## Einstiegsprojekte für den Wiedereinstieg

### 1. Todo-App für die Kommandozeile

Übe:

- STL-Container,
- Datei-I/O,
- Klassen,
- Serialisierung,
- Tests.

Erweiterungen:

- JSON-Persistenz,
- Suche und Filter,
- Datumswerte mit `chrono`.

### 2. Log-Parser

Übe:

- String-Verarbeitung,
- `string_view`,
- Maps,
- Algorithmen,
- Performance-Messung.

Erweiterungen:

- große Dateien parsen,
- Alternativen benchmarken,
- Verarbeitung mit mehreren Threads.

## Projekte für Fortgeschrittene

### 3. TCP-Chatserver

Übe:

- Sockets,
- Nebenläufigkeit,
- RAII-Wrapper für Dateideskriptoren,
- Fehlerbehandlung.

Erweiterungen:

- Räume,
- Authentifizierung,
- asynchroner Event Loop.

### 4. Key-Value-Store

Übe:

- Datenstrukturen,
- Dateipersistenz,
- APIs,
- Tests,
- Performance.

Erweiterungen:

- Write-ahead Log,
- Kompaktierung,
- TCP-Protokoll.

### 5. 2D-Physiksimulation

Übe:

- Werttypen,
- Vektoren und Mathematik,
- Game Loop,
- Performance.

Erweiterungen:

- Kollisionserkennung,
- Visualisierung,
- räumliche Partitionierung.

## Starke Portfolio-Projekte

### 6. Orderbuch-Simulator

Übe:

- Performance,
- Datenstrukturen,
- cachefreundliches Design,
- Tests,
- Benchmarking.

Erweiterungen:

- Marktdaten-Replay,
- Latenzmessungen,
- Visualisierung mit Python.

### 7. Roboter-Pfadplanung

Übe:

- Algorithmen,
- Simulation,
- Geometrie,
- Aufteilung zwischen C++ und Python.

Erweiterungen:

- A*, RRT,
- ROS-2-Integration,
- Visualisierung.

### 8. Embedded-Sensorlogger

Übe:

- C/C++,
- serielle Protokolle,
- begrenzten Speicher,
- echte Hardware.

Erweiterungen:

- Dashboard,
- Netzwerk-Upload,
- Energieoptimierung.

### 9. Python-Erweiterung in C++

Übe:

- Entwurf von C++-Bibliotheken,
- Python-Interoperabilität,
- Performance,
- Paketierung.

Erweiterung:

- Stelle Python einen schnellen Parser oder eine numerische Routine zur Verfügung.

### 10. Sicherer Dateiformat-Parser

Übe:

- binäres Parsing,
- Speichersicherheit,
- Fuzzing,
- Fehlerbehandlung.

Erweiterungen:

- Fuzzing mit AFL/libFuzzer,
- Builds mit Sanitizern,
- Security-Bericht.

## Projektregeln

Jedes Projekt sollte Folgendes enthalten:

- `README.md`,
- CMake-Build,
- Tests,
- Anweisungen für Sanitizer,
- mindestens einen Benchmark oder eine Demo,
- eine klare Erklärung der Designabwägungen.

## Bestes erstes ernsthaftes Projekt

Wenn du unentschlossen bist, baue einen **nebenläufigen TCP-Server** oder einen **Key-Value-Store**. Beide vermitteln Systeme, Besitz, Nebenläufigkeit, Tests und Performance.
