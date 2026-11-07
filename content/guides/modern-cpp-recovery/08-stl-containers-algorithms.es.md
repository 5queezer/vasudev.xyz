---
title: "08 — Contenedores y algoritmos de la STL"
description: "La biblioteca estándar es la caja de herramientas predeterminada. El C++ moderno debe usar contenedores y algoritmos en lugar de memoria manual y bucles escritos a mano en todas partes."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "28e0e1cb54a03ff2b7d733e53a34348e"
---

# 08 — Contenedores y algoritmos de la STL

## Idea central

La biblioteca estándar es la caja de herramientas predeterminada. El C++ moderno debe usar contenedores y algoritmos en lugar de memoria manual y bucles escritos a mano en todas partes.

## Contenedor predeterminado: `std::vector`

Usa `std::vector` salvo que tengas un motivo concreto para no hacerlo.

```cpp
std::vector<int> values = {1, 2, 3};
values.push_back(4);
```

Por qué es bueno:

- memoria contigua,
- aprovecha bien la caché,
- iteración rápida,
- propiedad sencilla.

## Otros contenedores habituales

```cpp
std::array<int, 3> fixed = {1, 2, 3};
std::deque<int> dq;
std::map<std::string, int> ordered;
std::unordered_map<std::string, int> hashed;
std::set<int> unique_sorted;
std::unordered_set<int> unique_hashed;
std::queue<int> q;
std::stack<int> st;
std::priority_queue<int> pq;
```

## Elegir contenedores

- `vector`: secuencia predeterminada.
- `array`: array de tamaño fijo en la pila.
- `deque`: inserción rápida delante y detrás.
- `map`: claves ordenadas, basado en árbol.
- `unordered_map`: tabla hash, búsqueda a menudo más rápida.
- `set`: valores únicos ordenados.
- `unordered_set`: valores únicos con hash.

## Iteradores

Los iteradores son punteros generalizados dentro de los contenedores.

```cpp
auto it = values.begin();
std::cout << *it << '\n';
```

## Invalidación de iteradores

Algunas operaciones invalidan iteradores o referencias existentes.

Ejemplo: `vector::push_back` puede reasignar memoria e invalidar referencias.

```cpp
std::vector<int> v = {1, 2, 3};
int& ref = v[0];
v.push_back(4); // ref may now be invalid
```

## Algoritmos

Prefiere los algoritmos estándar para operaciones habituales.

```cpp
std::sort(values.begin(), values.end());

auto it = std::find(values.begin(), values.end(), 42);

auto count = std::count(values.begin(), values.end(), 7);
```

## Lambdas con algoritmos

```cpp
std::sort(users.begin(), users.end(), [](const User& a, const User& b) {
    return a.score < b.score;
});
```

## Idioma remove-erase

```cpp
values.erase(
    std::remove_if(values.begin(), values.end(), [](int x) { return x < 0; }),
    values.end()
);
```

## Errores habituales

- Usar `list` porque crees que insertar siempre es más rápido.
- Olvidar la invalidación de iteradores.
- Escribir bucles manuales para todo.
- Usar `map` cuando basta con `unordered_map`.
- Guardar punteros propietarios sin procesar en contenedores.

## Autoevaluación rápida

Deberías poder responder:

- ¿Por qué suele ser `vector` el predeterminado?
- ¿Cuándo usarías `unordered_map` en lugar de `map`?
- ¿Qué es la invalidación de iteradores?
- ¿Cómo ordenas con una comparación personalizada?
- ¿Qué es el idioma remove-erase?
