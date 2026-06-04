---
title: "11 — Frontend: React and TanStack"
description: "React with TypeScript for backend engineers, the TanStack Query concepts interviewers probe, and how Router and Query integrate through loaders and a shared cache."
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

## Using Router and Query Together

When a project uses both TanStack Router and TanStack Query, the interesting part is how they connect. The router can start a fetch in a route loader before the component renders, and Query still owns the cache. This is a strong "I have actually used this stack" signal, and the patterns come from Dominik Dorfmeister, a Query maintainer (see the reference in [Grounding](14-grounding-and-references.md)).

The first move is to define each query once with `queryOptions` so the loader and the component share the same key and function:

```ts
import { queryOptions } from "@tanstack/react-query";

function userQuery(id: string) {
  return queryOptions({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

Put the `queryClient` in the router context so loaders can reach it, and let the router preload on intent:

```ts
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});
```

Then a route loader warms the cache, and the component reads from it:

```tsx
export const Route = createFileRoute("/users/$id")({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(userQuery(params.id)),
  component: UserPage,
});

function UserPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(userQuery(id));
  return <div>{data.name}</div>;
}
```

The rules that make this work, and the ones interviewers like to hear:

- **Always read with a hook in the component.** Call `useQuery` or `useSuspenseQuery` even when the loader already fetched. Query only keeps a cache entry fresh while a component observes it. Without an observer it stops refetching on focus and invalidation, and it can be garbage collected. The loader primes the cache, the hook subscribes to it.
- **`ensureQueryData` fetches only on a miss.** It returns cached data if present and fetches otherwise, so a warm cache makes navigation instant. Use `prefetchQuery` when you want to kick off the fetch without awaiting the result.
- **`defaultPreload: "intent"` gives you hover prefetching for free.** The router starts the loader when a link is hovered or focused, sometimes before the component code has even loaded.
- **Await in the loader to block, skip the await to defer.** Awaiting `ensureQueryData` with `useSuspenseQuery` in the component blocks navigation behind the router's pending boundary. Not awaiting, paired with a plain `useQuery`, lets the page render immediately and fill in the data as it arrives.
- **Set `defaultPreloadStaleTime: 0`.** This hands all staleness decisions to Query rather than letting the router keep its own separate cache, so the two do not disagree about what is fresh.

The mental model: the router decides *when* to start fetching, and Query owns the cache, deduplication, and freshness. They do not compete, they layer.

## The Rest of TanStack

- **TanStack Table**: a headless table library. It manages sorting, filtering, and pagination logic and leaves the rendering to you.

Learn Query first and deeply. The Router and Query integration above is worth understanding if a role uses both. Treat Table as "know what it is and read the docs when needed" until a role requires more.

## Quick Self-Test

- What is the difference between client state and server state?
- What does a query key do, and why does `staleTime` matter?
- Walk through an optimistic update including the rollback path.
- How do you keep the UI consistent after a mutation?
