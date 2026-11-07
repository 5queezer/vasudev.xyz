---
title: "11 — Frontend: React y TanStack"
description: "React con TypeScript para ingenieros de backend, los conceptos de TanStack Query que se exploran en entrevistas y cómo se integran Router y Query mediante loaders y una caché compartida."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "c6af70c9849267a7ad550a5cc26dae84"
---

# 11 — Frontend: React y TanStack

No necesitas convertirte en especialista en frontend para rendir bien en un puesto full-stack o de TypeScript orientado al backend. Debes poder leer React, tipar los componentes correctamente y explicar la gestión del estado del servidor. TanStack Query concentra la mayor parte de la profundidad de las entrevistas, así que dedica más tiempo a esa parte.

## React con TypeScript, brevemente

Un componente es una función que recibe props y devuelve marcado. Tipa las props con una interfaz.

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

Los hooks que verás con más frecuencia:

- `useState` mantiene el estado local de un componente. Su tipo suele inferirse a partir del valor inicial o se anota como `useState<User | null>(null)`.
- `useEffect` ejecuta efectos secundarios después del renderizado. Lo necesitarás menos de lo que podrías esperar, porque la obtención de datos pertenece a TanStack Query.
- `useMemo` y `useCallback` memorizan valores y funciones para mejorar el rendimiento.

El punto más habitual del modelo mental de React: un componente vuelve a renderizarse cuando cambian su estado o sus props, y tú describes cómo debe verse la interfaz para el estado actual en lugar de modificar el DOM directamente.

## Por qué existe TanStack Query

En un frontend hay dos tipos de estado. El estado del cliente es estado local de la interfaz, como «¿está abierto este menú?». El estado del servidor son datos que viven en el servidor y solo se almacenan en caché en el navegador. La idea central de TanStack Query es que el estado del servidor tiene necesidades distintas: caché, actualización en segundo plano, caducidad, deduplicación y sincronización entre componentes. Tratarlo como estado local es donde falla la mayoría de los sistemas de obtención de datos hechos a mano.

Un ingeniero senior debe poder explicar la caché, la invalidación de consultas, las actualizaciones optimistas y la paginación en TanStack Query. Es la mayor parte de lo que se evalúa.

## Consultas

Una consulta lee datos. Le proporcionas una clave y una función. La clave identifica la entrada de caché.

```tsx
import { useQuery } from "@tanstack/react-query";

function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

El hook devuelve `data`, `error` y marcadores de estado como `isPending` e `isError`. Ese estado es en sí una unión discriminada, por lo que la misma idea de modelado anterior reaparece en la interfaz.

- **Caché**: los resultados se guardan bajo la clave de consulta. Varios componentes que pidan la misma clave comparten una única petición.
- **Caducidad**: `staleTime` controla durante cuánto tiempo se consideran recientes los datos antes de que sea posible una actualización en segundo plano. Es el ajuste que más se configura mal.

## Invalidación

Después de una escritura, indicas a la caché que determinadas consultas están desactualizadas y esta vuelve a obtenerlas.

```ts
queryClient.invalidateQueries({ queryKey: ["user", id] });
```

La invalidación mantiene la interfaz coherente tras una mutación sin conectar manualmente nuevas peticiones por todas partes.

## Mutaciones y actualizaciones optimistas

Una mutación escribe datos. Una actualización optimista aplica inmediatamente a la caché el resultado esperado y revierte el cambio si falla la petición.

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

Poder explicar este ciclo de vida —escritura optimista, reversión en caso de error e invalidación al finalizar— es una buena señal en una entrevista.

## Paginación y desplazamiento infinito

Para datos paginados, incluye la página en la clave de consulta para que cada página se guarde en caché por separado. Para el desplazamiento infinito, `useInfiniteQuery` gestiona las páginas y expone una función `fetchNextPage`, además de una forma de calcular el parámetro de la siguiente página. Conceptualmente es la misma caché indexada por el cursor de página.

## Usar Router y Query juntos

Cuando un proyecto usa tanto TanStack Router como TanStack Query, lo interesante es cómo se conectan. El router puede iniciar una petición en un loader de ruta antes de que se renderice el componente, mientras Query sigue siendo el propietario de la caché. Es una buena señal de «he utilizado realmente este stack», y los patrones proceden de Dominik Dorfmeister, mantenedor de Query (consulta la referencia en [Fundamentación](14-grounding-and-references.md)).

El primer paso es definir cada consulta una única vez con `queryOptions`, para que el loader y el componente compartan la misma clave y función:

```ts
import { queryOptions } from "@tanstack/react-query";

function userQuery(id: string) {
  return queryOptions({
    queryKey: ["user", id],
    queryFn: () => fetchUser(id),
  });
}
```

Coloca el `queryClient` en el contexto del router para que los loaders puedan acceder a él y deja que el router precargue al detectar la intención:

```ts
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});
```

Después, un loader de ruta prepara la caché y el componente lee de ella:

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

Estas reglas hacen que funcione y son las que gusta oír en una entrevista:

- **Lee siempre mediante un hook en el componente.** Llama a `useQuery` o `useSuspenseQuery` aunque el loader ya haya obtenido los datos. Query solo mantiene reciente una entrada de caché mientras un componente la observa. Sin observador deja de actualizarse al recuperar el foco o al invalidarse, y puede ser eliminada por el recolector de basura. El loader prepara la caché; el hook se suscribe a ella.
- **`ensureQueryData` solo obtiene datos cuando faltan.** Devuelve los datos en caché si existen y los obtiene en caso contrario, por lo que una caché preparada hace instantánea la navegación. Usa `prefetchQuery` cuando quieras iniciar la petición sin esperar el resultado.
- **`defaultPreload: "intent"` ofrece precarga al pasar el cursor sin trabajo adicional.** El router inicia el loader cuando un enlace recibe el cursor o el foco, a veces incluso antes de que se cargue el código del componente.
- **Espera en el loader para bloquear; no uses `await` para diferir.** Esperar a `ensureQueryData` y usar `useSuspenseQuery` en el componente bloquea la navegación tras el límite de espera del router. No esperar y combinarlo con un `useQuery` normal permite renderizar la página de inmediato y completar los datos cuando lleguen.
- **Configura `defaultPreloadStaleTime: 0`.** Así dejas todas las decisiones sobre caducidad en manos de Query, en lugar de permitir que el router mantenga una caché separada. Ambos evitan discrepar sobre qué datos están actualizados.

El modelo mental: el router decide *cuándo* empezar a obtener datos, y Query se encarga de la caché, la deduplicación y la vigencia. No compiten; forman capas.

## El resto de TanStack

- **TanStack Table**: una biblioteca de tablas sin interfaz. Gestiona la lógica de ordenación, filtrado y paginación y deja el renderizado en tus manos.

Aprende primero Query y hazlo a fondo. Merece la pena entender la integración anterior entre Router y Query si un puesto utiliza ambos. Considera Table como algo cuya función debes conocer y cuya documentación consultarás cuando sea necesario, hasta que un puesto exija más.

## Autoevaluación rápida

- ¿Cuál es la diferencia entre el estado del cliente y el estado del servidor?
- ¿Qué hace una clave de consulta y por qué importa `staleTime`?
- Explica una actualización optimista, incluido el camino de reversión.
- ¿Cómo mantienes coherente la interfaz después de una mutación?
