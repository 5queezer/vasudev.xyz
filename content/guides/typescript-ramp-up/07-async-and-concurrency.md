---
title: "07 — Async and Concurrency"
description: "Promises, async/await, the single-threaded event loop, structured concurrency with Promise combinators, and where worker threads fit."
weight: 7
type: "guide"
build:
  list: local
  render: always
---

# 07 — Async and Concurrency

You already understand async programming. This page is about how JavaScript and TypeScript express it and where the runtime model differs from threads.

## The Runtime Model

JavaScript runs your code on a single thread with an event loop. There is no preemption of your own code. A function runs to completion before the next task is picked up. Concurrency comes from yielding at `await` points and letting I/O complete in the background, not from parallel execution of your JavaScript.

The practical consequences:

- You do not get data races on shared variables within your own synchronous code, because nothing else runs while it runs.
- A long synchronous loop blocks everything, including the server accepting new requests. Keep CPU-bound work out of the request path.
- True parallelism for CPU work needs worker threads or separate processes, covered at the end.

## Promises and async/await

A `Promise<T>` is a value that will resolve to a `T` or reject with an error. `async`/`await` is the syntax you will use almost always.

```ts
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as User;
}
```

An `async` function always returns a `Promise`. The `Awaited<T>` utility type unwraps it if you need the resolved type.

## Errors Are Just Thrown

There is one error channel. A rejected promise surfaces as a thrown error at the `await`, so you handle it with `try`/`catch`.

```ts
try {
  const user = await getUser("1");
} catch (err) {
  // err is typed as unknown in strict mode
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

In modern TypeScript the caught value is `unknown`, so narrow it before use. This is the same narrowing discipline from the previous page.

The most common async bug is a floating promise: calling an async function without awaiting it, so errors vanish. Enable the lint rule `no-floating-promises` to catch these (see [Tooling and Testing](12-tooling-and-testing.md)).

## Running Work Concurrently

To run independent async work at the same time, start the promises and await them together. Do not `await` in a loop when the iterations are independent.

```ts
// Sequential, slow: each await waits for the previous.
const a = await getUser("1");
const b = await getUser("2");

// Concurrent: both requests are in flight at once.
const [c, d] = await Promise.all([getUser("1"), getUser("2")]);
```

The combinators:

- `Promise.all` resolves when all succeed, rejects on the first failure.
- `Promise.allSettled` waits for all and reports each outcome, success or failure.
- `Promise.race` settles as soon as the first promise settles.
- `Promise.any` resolves on the first success, rejects only if all fail.

## Cancellation with AbortController

JavaScript promises are not cancellable on their own. The standard mechanism is `AbortController`, which `fetch` and many APIs accept.

```ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);
try {
  const res = await fetch("/slow", { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

## CPU Parallelism

When you genuinely need to use multiple cores for CPU-bound work, Node provides `worker_threads`, and the browser provides Web Workers. These run separate JavaScript contexts and communicate by message passing, not shared mutable memory (with the narrow exception of `SharedArrayBuffer`). For most backend services, the answer is to keep heavy work off the event loop, not to thread it.

## Quick Self-Test

- Why does a long synchronous loop block an entire Node server?
- When do you use `Promise.all` versus `Promise.allSettled`?
- Why is the caught error `unknown`, and how do you handle it?
- How do you cancel an in-flight `fetch`?
