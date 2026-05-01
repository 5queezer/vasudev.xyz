---
title: "18 — Project Ideas"
description: "A serious project beats passive study. Pick one project that forces you to use modern C++ features, tooling, debugging, and domain concepts."
weight: 18
type: "guide"
build:
  list: local
  render: always
---

# 18 — Project Ideas

## Core Idea

A serious project beats passive study. Pick one project that forces you to use modern C++ features, tooling, debugging, and domain concepts.

## Beginner Recovery Projects

### 1. Command-Line Todo App

Practice:

- STL containers,
- file I/O,
- classes,
- serialization,
- testing.

Stretch:

- JSON persistence,
- search/filter,
- dates with `chrono`.

### 2. Log Parser

Practice:

- string processing,
- `string_view`,
- maps,
- algorithms,
- performance measurement.

Stretch:

- parse large files,
- benchmark alternatives,
- multithreaded processing.

## Intermediate Projects

### 3. TCP Chat Server

Practice:

- sockets,
- concurrency,
- RAII wrappers for file descriptors,
- error handling.

Stretch:

- rooms,
- authentication,
- async/event loop.

### 4. Key-Value Store

Practice:

- data structures,
- file persistence,
- APIs,
- tests,
- performance.

Stretch:

- write-ahead log,
- compaction,
- TCP protocol.

### 5. 2D Physics Simulation

Practice:

- value types,
- vectors/math,
- game loop,
- performance.

Stretch:

- collision detection,
- visualization,
- spatial partitioning.

## Strong Portfolio Projects

### 6. Order Book Simulator

Practice:

- performance,
- data structures,
- cache-friendly design,
- testing,
- benchmarking.

Stretch:

- market data replay,
- latency measurements,
- Python visualization.

### 7. Robot Path Planner

Practice:

- algorithms,
- simulation,
- geometry,
- C++/Python split.

Stretch:

- A*, RRT,
- ROS 2 integration,
- visualization.

### 8. Embedded Sensor Logger

Practice:

- C/C++,
- serial protocols,
- constrained memory,
- real hardware.

Stretch:

- dashboard,
- network upload,
- power optimization.

### 9. Python Extension in C++

Practice:

- C++ library design,
- Python interop,
- performance,
- packaging.

Stretch:

- expose a fast parser or numerical routine to Python.

### 10. Safe File Format Parser

Practice:

- binary parsing,
- memory safety,
- fuzzing,
- error handling.

Stretch:

- fuzz with AFL/libFuzzer,
- sanitize builds,
- security writeup.

## Project Rules

For any project, include:

- `README.md`,
- CMake build,
- tests,
- sanitizer instructions,
- at least one benchmark or demo,
- clear explanation of design trade-offs.

## Best First Serious Project

If undecided, build a **multithreaded TCP server** or a **key-value store**. Both teach systems, ownership, concurrency, tests, and performance.
