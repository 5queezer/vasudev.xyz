---
title: "11 — Plantillas y programación genérica"
description: "Las plantillas permiten escribir código que funciona con muchos tipos y que se compila como código eficiente y específico para cada tipo."
weight: 11
type: "guide"
build:
  list: local
  render: always
translationHash: "37d99baa0c6083b5cb26062fe6969962"
---

# 11 — Plantillas y programación genérica

## Idea principal

Las plantillas permiten escribir código que funciona con muchos tipos y que se compila como código eficiente y específico para cada tipo.

## Plantillas de funciones

```cpp
template <typename T>
T max_value(T a, T b) {
    return a < b ? b : a;
}
```

Uso:

```cpp
auto x = max_value(3, 7);
auto y = max_value(2.5, 1.1);
```

## Plantillas de clases

```cpp
template <typename T>
class Box {
    T value_;
public:
    explicit Box(T value) : value_(std::move(value)) {}
    const T& value() const { return value_; }
};
```

## Instanciación de plantillas

Las plantillas se compilan cuando se utilizan con tipos concretos.

```cpp
Box<int> a{42};
Box<std::string> b{"hello"};
```

El compilador genera código para esos tipos específicos.

## Requisitos de tipos

El código de una plantilla presupone que existen ciertas operaciones.

```cpp
template <typename T>
void print_twice(const T& x) {
    std::cout << x << x;
}
```

Esto requiere que `operator<<` funcione para `T`.

## Concepts en C++20

Los Concepts permiten declarar claramente los requisitos de los tipos.

```cpp
#include <concepts>

template <std::integral T>
T add(T a, T b) {
    return a + b;
}
```

## `typename` frente a `class`

En las listas de parámetros de plantilla suelen ser equivalentes:

```cpp
template <typename T>
template <class T>
```

`typename` es más habitual en los ejemplos modernos.

## Errores de plantillas

Los errores de plantillas pueden ser largos y desagradables. Lee desde el primer error significativo cercano a tu código, no solo la última línea.

## Usos habituales

Las plantillas son la base de:

- contenedores,
- algoritmos,
- punteros inteligentes,
- utilidades genéricas,
- programación en tiempo de compilación,
- abstracciones sin coste adicional.

## No abuses de ellas

No empieces escribiendo metaprogramación de plantillas ingeniosa. Aprende primero las plantillas normales, después los Concepts y, solo cuando haga falta, los patrones avanzados.

## Autoevaluación rápida

Deberías poder responder:

- ¿Qué genera una plantilla?
- ¿Qué ocurre cuando un tipo no admite una operación usada en una plantilla?
- ¿Por qué son útiles las plantillas para el rendimiento?
- ¿Qué aportan los Concepts?
- ¿Cuándo deberías evitar las plantillas?
