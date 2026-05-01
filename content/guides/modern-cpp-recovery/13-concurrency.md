---
title: "13 — Concurrency: Threads, Mutexes, Atomics"
description: "Concurrent code lets multiple things happen at once, but introduces data races, deadlocks, ordering issues, and debugging pain."
weight: 13
type: "guide"
build:
  list: local
  render: always
---

# 13 — Concurrency: Threads, Mutexes, Atomics

## Core Idea

Concurrent code lets multiple things happen at once, but introduces data races, deadlocks, ordering issues, and debugging pain.

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

Always `join` or `detach` a `std::thread` before destruction.

## `std::jthread`

C++20 `jthread` is an RAII thread wrapper: its destructor requests stop and joins automatically.

```cpp
std::jthread t([] {
    // work
});
```

Prefer it when available.

## Data Race

A data race occurs when two conflicting evaluations access the same memory concurrently, at least one modifies it, and there is no synchronization / happens-before relationship.

Data races are undefined behavior.

## Mutex

```cpp
std::mutex m;
int counter = 0;

void increment() {
    std::lock_guard<std::mutex> lock(m);
    ++counter;
}
```

RAII unlocks the mutex automatically.

## `std::unique_lock`

More flexible than `lock_guard`, useful with condition variables.

```cpp
std::unique_lock<std::mutex> lock(m);
```

## Condition Variables

Used for waiting until a condition becomes true. Always wait with a predicate so spurious wakeups are handled correctly.

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

Use atomics for simple shared values.

```cpp
std::atomic<int> counter = 0;
++counter;
```

Do not assume atomics make complex logic automatically safe.

## Deadlock

Deadlock occurs when threads wait on each other forever.

Common cause: locking mutexes in different orders.

## Common Patterns

- Producer/consumer queue.
- Worker thread pool.
- Shared read-only data.
- Message passing.
- Immutable data + ownership transfer.

## Common Mistakes

- Sharing mutable state without locks.
- Holding locks too long.
- Calling unknown code while holding a lock.
- Locking multiple mutexes inconsistently.
- Thinking `volatile` means thread-safe. It does not.

## Quick Self-Test

You should be able to answer:

- What is a data race?
- Why is `lock_guard` RAII?
- When would you use a condition variable?
- What is a deadlock?
- Why is `volatile` not a synchronization primitive?
