---
title: "13 — Nebenläufigkeit: Threads, Mutexe, Atomics"
description: "Nebenläufiger Code lässt mehrere Dinge gleichzeitig geschehen, bringt aber Data Races, Deadlocks, Ordnungsprobleme und schwierige Fehlersuche mit sich."
weight: 13
type: "guide"
build:
  list: local
  render: always
translationHash: "69d9eaa849ccca2e03c0a61dffc8651f"
---

# 13 — Nebenläufigkeit: Threads, Mutexe, Atomics

## Kernidee

Nebenläufiger Code lässt mehrere Dinge gleichzeitig geschehen, bringt aber Data Races, Deadlocks, Ordnungsprobleme und schwierige Fehlersuche mit sich.

## Threads

```cpp
#include <thread>
#include <iostream>

void work() {
    std::cout << "working\n";
}

int main() {
    std::thread t(work);
    t.join();
}
```

Rufe vor der Zerstörung eines `std::thread` immer `join` oder `detach` auf.

## `std::jthread`

Der C++20-Typ `jthread` ist ein RAII-Wrapper für Threads: Sein Destruktor fordert das Stoppen an und führt automatisch einen Join durch.

```cpp
std::jthread t([] {
    // work
});
```

Bevorzuge ihn, wenn er verfügbar ist.

## Data Race

Ein Data Race tritt auf, wenn zwei widersprüchliche Auswertungen gleichzeitig auf denselben Speicher zugreifen, mindestens eine ihn verändert und keine Synchronisierung beziehungsweise Happens-before-Beziehung besteht.

Data Races sind undefiniertes Verhalten.

## Mutex

```cpp
std::mutex m;
int counter = 0;

void increment() {
    std::lock_guard<std::mutex> lock(m);
    ++counter;
}
```

RAII gibt den Mutex automatisch frei.

## `std::unique_lock`

Flexibler als `lock_guard` und nützlich zusammen mit Condition Variables.

```cpp
std::unique_lock<std::mutex> lock(m);
```

## Condition Variables

Sie dienen dazu, zu warten, bis eine Bedingung wahr wird. Warte immer mit einem Prädikat, damit falsche Aufweckvorgänge korrekt behandelt werden.

```cpp
std::condition_variable cv;
std::mutex m;
bool ready = false;

void wait_thread() {
    std::unique_lock lock(m);
    cv.wait(lock, [] { return ready; });
}
```

## Atomics

Verwende atomare Typen für einfache gemeinsam genutzte Werte.

```cpp
std::atomic<int> counter = 0;
++counter;
```

Gehe nicht davon aus, dass Atomics komplexe Logik automatisch sicher machen.

## Deadlock

Ein Deadlock entsteht, wenn Threads für immer aufeinander warten.

Eine häufige Ursache ist das Sperren von Mutexen in unterschiedlicher Reihenfolge.

## Häufige Muster

- Producer-Consumer-Queue.
- Worker-Thread-Pool.
- Gemeinsam genutzte, schreibgeschützte Daten.
- Message Passing.
- Unveränderliche Daten und Übertragung des Besitzes.

## Häufige Fehler

- Veränderlichen Zustand ohne Sperren gemeinsam nutzen.
- Sperren zu lange halten.
- Unbekannten Code ausführen, während eine Sperre gehalten wird.
- Mehrere Mutexe in uneinheitlicher Reihenfolge sperren.
- Annehmen, `volatile` bedeute threadsicher. Das tut es nicht.

## Kurzer Selbsttest

Du solltest folgende Fragen beantworten können:

- Was ist ein Data Race?
- Warum folgt `lock_guard` dem RAII-Prinzip?
- Wann würdest du eine Condition Variable verwenden?
- Was ist ein Deadlock?
- Warum ist `volatile` kein Synchronisierungsmechanismus?
