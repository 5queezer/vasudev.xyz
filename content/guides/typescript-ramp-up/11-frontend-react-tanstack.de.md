---
title: "11 — Frontend: React und TanStack"
description: "React mit TypeScript für Backend-Entwickler, die in Interviews abgefragten TanStack-Query-Konzepte und die Integration von Router und Query über Loader und einen gemeinsamen Cache."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "c6af70c9849267a7ad550a5cc26dae84"
---

# 11 — Frontend: React und TanStack

Du musst kein Frontend-Spezialist werden, um in einer Full-Stack- oder Backend-lastigen TypeScript-Rolle zu überzeugen. Du solltest React lesen, Komponenten korrekt typisieren und das Management von Server State erklären können. TanStack Query bietet den meisten Stoff für tiefergehende Interviewfragen; investiere dort entsprechend mehr Zeit.

## React mit TypeScript in Kürze

Eine Komponente ist eine Funktion, die Props entgegennimmt und Markup zurückgibt. Typisiere die Props mit einem Interface.

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

Diese Hooks werden dir am häufigsten begegnen:

- `useState` hält lokalen Komponenten-State. Der Typ wird normalerweise aus dem Anfangswert abgeleitet oder mit `useState<User | null>(null)` annotiert.
- `useEffect` führt Seiteneffekte nach dem Rendern aus. Du brauchst ihn seltener als erwartet, da Datenabrufe in TanStack Query gehören.
- `useMemo` und `useCallback` speichern Werte und Funktionen aus Leistungsgründen zwischen.

Der wichtigste Punkt im mentalen Modell von React: Eine Komponente wird neu gerendert, wenn sich ihr State oder ihre Props ändern. Du beschreibst, wie die Oberfläche für den aktuellen Zustand aussehen soll, statt das DOM selbst zu verändern.

## Warum TanStack Query existiert

In einem Frontend gibt es zwei Arten von State. Client State ist lokaler UI-Zustand wie „Ist dieses Menü geöffnet?“. Server State sind Daten, die auf dem Server liegen und im Browser lediglich zwischengespeichert werden. Die Erkenntnis hinter TanStack Query lautet, dass Server State andere Anforderungen hat: Caching, erneutes Abrufen im Hintergrund, Veralten, Deduplizierung und Synchronisierung zwischen Komponenten. Wenn er wie lokaler State behandelt wird, scheitern die meisten selbstgebauten Datenabrufe.

Ein Senior Engineer sollte Caching, Query-Invalidierung, optimistische Updates und Paginierung in TanStack Query erklären können. Das ist der Kern der meisten tiefergehenden Fragen.

## Queries

Eine Query liest Daten. Du gibst ihr einen Schlüssel und eine Funktion. Der Schlüssel identifiziert den Cache-Eintrag.

```tsx
import { useQuery } from "@tanstack/react-query";

function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

Der Hook gibt `data`, `error` und Status-Flags wie `isPending` und `isError` zurück. Dieser Status ist selbst eine Discriminated Union; dasselbe Modellierungskonzept taucht also in der UI wieder auf.

- **Caching**: Ergebnisse werden unter dem Query Key zwischengespeichert. Mehrere Komponenten, die denselben Schlüssel anfragen, teilen sich einen Abruf.
- **Veralten**: `staleTime` legt fest, wie lange Daten als aktuell gelten, bevor ein erneuter Abruf im Hintergrund möglich wird. Diese Einstellung wird am häufigsten falsch konfiguriert.

## Invalidierung

Nach einem Schreibvorgang teilst du dem Cache mit, dass bestimmte Queries veraltet sind; anschließend werden sie erneut abgerufen.

```ts
queryClient.invalidateQueries({ queryKey: ["user", id] });
```

Durch Invalidierung hältst du die UI nach einer Mutation konsistent, ohne überall manuell erneute Abrufe zu verdrahten.

## Mutations und optimistische Updates

Eine Mutation schreibt Daten. Ein optimistisches Update wendet das erwartete Ergebnis sofort auf den Cache an und setzt es zurück, falls der Request fehlschlägt.

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

Diesen Lebenszyklus erklären zu können – optimistisches Schreiben, Zurücksetzen bei Fehlern und Invalidierung nach Abschluss – ist in einem Interview ein starkes Signal.

## Paginierung und Infinite Scroll

Nimm bei paginierten Daten die Seite in den Query Key auf, damit jede Seite separat zwischengespeichert wird. Für Infinite Scroll verwaltet `useInfiniteQuery` die Seiten und stellt eine Funktion `fetchNextPage` sowie eine Methode zur Berechnung des nächsten Seitenparameters bereit. Konzeptionell handelt es sich um denselben Cache, der über den Seiten-Cursor adressiert wird.

## Router und Query zusammen verwenden

Wenn ein Projekt sowohl TanStack Router als auch TanStack Query nutzt, ist ihre Verbindung der interessante Teil. Der Router kann einen Abruf in einem Route Loader starten, bevor die Komponente gerendert wird, während Query weiterhin den Cache verwaltet. Das ist ein starkes Signal dafür, diesen Stack wirklich verwendet zu haben. Die Muster stammen von Dominik Dorfmeister, einem Maintainer von Query (siehe die Referenz unter [Fundierung](14-grounding-and-references.md)).

Definiere zunächst jede Query genau einmal mit `queryOptions`, damit Loader und Komponente denselben Schlüssel und dieselbe Funktion verwenden:

```ts
import { queryOptions } from "@tanstack/react-query";

function userQuery(id: string) {
  return queryOptions({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

Lege den `queryClient` in den Router-Kontext, damit Loader darauf zugreifen können, und lasse den Router bei erkennbarer Absicht vorladen:

```ts
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});
```

Anschließend wärmt ein Route Loader den Cache vor, und die Komponente liest daraus:

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

Diese Regeln sorgen dafür, dass das funktioniert, und sind in Interviews besonders relevant:

- **Lies in der Komponente immer mit einem Hook.** Rufe `useQuery` oder `useSuspenseQuery` auf, auch wenn der Loader die Daten bereits geladen hat. Query hält einen Cache-Eintrag nur aktuell, solange ihn eine Komponente beobachtet. Ohne Observer wird bei Fokus und Invalidierung nicht erneut abgerufen, und der Eintrag kann vom Garbage Collector entfernt werden. Der Loader füllt den Cache, der Hook abonniert ihn.
- **`ensureQueryData` lädt nur bei einem Cache Miss.** Bei vorhandenen Daten gibt die Funktion den Cache zurück, andernfalls ruft sie sie ab. Ein warmer Cache macht die Navigation damit unmittelbar. Nutze `prefetchQuery`, wenn du den Abruf starten möchtest, ohne auf das Ergebnis zu warten.
- **`defaultPreload: "intent"` liefert Vorabrufe beim Hover kostenlos.** Der Router startet den Loader, wenn ein Link mit der Maus berührt oder fokussiert wird, manchmal noch bevor der Komponentencode geladen ist.
- **Warte im Loader, um zu blockieren; verzichte auf `await`, um aufzuschieben.** Das Warten auf `ensureQueryData` zusammen mit `useSuspenseQuery` in der Komponente blockiert die Navigation hinter der Pending Boundary des Routers. Ohne Warten und mit einem normalen `useQuery` wird die Seite sofort gerendert und füllt die Daten nach ihrem Eintreffen ein.
- **Setze `defaultPreloadStaleTime: 0`.** Damit überlässt du alle Entscheidungen zum Veralten Query, statt den Router einen separaten Cache führen zu lassen. So widersprechen sich beide nicht darüber, was aktuell ist.

Das mentale Modell: Der Router entscheidet, *wann* der Abruf beginnt; Query verwaltet Cache, Deduplizierung und Aktualität. Sie konkurrieren nicht, sondern ergänzen sich schichtweise.

## Der übrige TanStack

- **TanStack Table**: Eine Headless-Tabellenbibliothek. Sie verwaltet Logik für Sortierung, Filterung und Paginierung und überlässt dir das Rendering.

Lerne zuerst Query und lerne es gründlich. Die oben beschriebene Integration von Router und Query ist wichtig, wenn eine Rolle beides verwendet. Bei Table reicht „wissen, was es ist, und bei Bedarf die Dokumentation lesen“, bis eine Rolle mehr verlangt.

## Kurzer Selbsttest

- Worin unterscheiden sich Client State und Server State?
- Was bewirkt ein Query Key, und warum ist `staleTime` wichtig?
- Erkläre ein optimistisches Update einschließlich des Pfads zum Zurücksetzen.
- Wie hältst du die UI nach einer Mutation konsistent?
