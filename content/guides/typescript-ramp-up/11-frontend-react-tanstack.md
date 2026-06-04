---
title: "11 — Frontend: React and TanStack"
description: "React with TypeScript for backend engineers, plus the TanStack Query concepts interviewers actually probe: caching, invalidation, optimistic updates, and pagination."
weight: 11
type: "guide"
build:
  list: local
  render: always
---

# 11 — Frontend: React and TanStack

You do not need to become a frontend specialist to do well in a full-stack or backend-leaning TypeScript role. You need to be able to read React, type components correctly, and explain server-state management. TanStack Query is where most interview depth lives, so weight your time there.

## React With TypeScript, Briefly

A component is a function that takes props and returns markup. Type the props with an interface.

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

The hooks you will meet most:

- `useState` holds local component state. Its type is usually inferred from the initial value, or annotated as `useState<User | null>(null)`.
- `useEffect` runs side effects after render. Reach for it less than you might expect, because data fetching belongs to TanStack Query.
- `useMemo` and `useCallback` memoize values and functions for performance.

The single most common React mental-model point: a component re-renders when its state or props change, and you describe what the UI should look like for the current state rather than mutating the DOM yourself.

## Why TanStack Query Exists

There are two kinds of state in a frontend. Client state is local UI state like "is this menu open." Server state is data that lives on the server and is merely cached in the browser. The insight behind TanStack Query is that server state has different needs: caching, background refetching, staleness, deduplication, and synchronization across components. Treating it like local state is where most hand-rolled data fetching goes wrong.

A senior engineer should be able to explain caching, query invalidation, optimistic updates, and pagination in TanStack Query. That is most of what gets probed.

## Queries

A query reads data. You give it a key and a function. The key identifies the cache entry.

```tsx
import { useQuery } from "@tanstack/react-query";

function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

The hook returns `data`, `error`, and status flags like `isPending` and `isError`. That status is itself a discriminated union, so the same modeling idea from earlier shows up in the UI.

- **Caching**: results are cached under the query key. Multiple components asking for the same key share one fetch.
- **Staleness**: `staleTime` controls how long data is considered fresh before a background refetch is eligible. This is the knob people most often misconfigure.

## Invalidation

After a write, you tell the cache that certain queries are out of date, and it refetches them.

```ts
queryClient.invalidateQueries({ queryKey: ["user", id] });
```

Invalidation is how you keep the UI consistent after a mutation without manually wiring refetches everywhere.

## Mutations and Optimistic Updates

A mutation writes data. An optimistic update applies the expected result to the cache immediately, then rolls back if the request fails.

```tsx
import { useMutation } from "@tanstack/react-query";

const mutation = useMutation({
  mutationFn: updateUser,
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey: ["user", next.id] });
    const previous = queryClient.getQueryData(["user", next.id]);
    queryClient.setQueryData(["user", next.id], next);
    return { previous };
  },
  onError: (_err, next, context) => {
    queryClient.setQueryData(["user", next.id], context?.previous);
  },
  onSettled: (_data, _err, next) => {
    queryClient.invalidateQueries({ queryKey: ["user", next.id] });
  },
});
```

Being able to walk through this lifecycle, optimistic write, rollback on error, invalidate on settle, is a strong signal in an interview.

## Pagination and Infinite Scroll

For paged data, include the page in the query key so each page caches separately. For infinite scroll, `useInfiniteQuery` manages pages and exposes a `fetchNextPage` function plus a way to compute the next page parameter. Conceptually it is the same cache keyed by page cursor.

## The Rest of TanStack

- **TanStack Router**: a type-safe router. Routes, params, and search parameters are typed, so navigation and links are checked at compile time.
- **TanStack Table**: a headless table library. It manages sorting, filtering, and pagination logic and leaves the rendering to you.

Learn Query first and deeply. Treat Router and Table as "know what they are and read the docs when needed" until a role requires more.

## Quick Self-Test

- What is the difference between client state and server state?
- What does a query key do, and why does `staleTime` matter?
- Walk through an optimistic update including the rollback path.
- How do you keep the UI consistent after a mutation?
