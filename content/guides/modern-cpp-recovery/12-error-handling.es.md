---
title: "12 — Gestión de errores y seguridad ante excepciones"
description: "C++ ofrece varios estilos de gestión de errores. El adecuado depende del ámbito."
weight: 12
type: "guide"
build:
  list: local
  render: always
translationHash: "679d49d26ed92ecb8d446b59749d93d5"
---

# 12 — Gestión de errores y seguridad ante excepciones

## Idea principal

C++ ofrece varios estilos de gestión de errores. El adecuado depende del ámbito.

## Excepciones

Las excepciones separan el flujo normal de la gestión de errores.

```cpp
void handle_work() {
    try {
        risky();
    } catch (const std::exception& e) {
        std::cerr << e.what() << '\n';
    }
}
```

## RAII y excepciones

RAII es lo que hace seguras las excepciones.

```cpp
void f() {
    std::ofstream file("out.txt");
    risky();
} // file closes even if risky throws
```

## Garantías de seguridad ante excepciones

### Garantía básica

El programa sigue siendo válido; no hay fugas ni invariantes dañadas.

### Garantía fuerte

La operación tiene éxito por completo o no produce ningún efecto.

### Garantía de no lanzar

La operación no lanza excepciones.

Se utiliza en destructores y en muchas operaciones de movimiento.

## `noexcept`

Marca las funciones que no deberían lanzar excepciones.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

En general, los destructores no deberían lanzar excepciones.

## Códigos de error

Algunos ámbitos evitan las excepciones, especialmente los sistemas embebidos, los motores de videojuegos, el trading de baja latencia y cierto software de sistemas.

```cpp
enum class Error {
    None,
    NotFound,
    PermissionDenied
};
```

## `std::optional`

Úsalo para representar la simple ausencia de un valor.

```cpp
std::optional<User> find_user(int id);
```

## `std::expected`

C++23 incorpora `std::expected` para representar un valor o un error. Algunos proyectos usan antes tipos equivalentes de bibliotecas.

```cpp
#include <expected>

std::expected<User, Error> load_user(int id);
```

## Elegir un estilo de error

- Usa excepciones para fallos inesperados a nivel de aplicación si tu base de código las permite.
- Usa códigos de error o `expected` en entornos sensibles al rendimiento o sin excepciones.
- Usa `optional` para valores que sencillamente pueden estar presentes o ausentes.
- No uses excepciones para el flujo de control normal.

## Errores habituales

- Lanzar excepciones desde destructores.
- Capturar excepciones por valor en vez de por `const&`.
- Ignorar todas las excepciones sin registrarlas.
- Usar `optional` cuando necesitas detalles del error.
- Devolver números mágicos como `-1` para cualquier error.

## Autoevaluación rápida

Deberías poder responder:

- ¿Qué relación tiene RAII con las excepciones?
- ¿Qué es la garantía fuerte ante excepciones?
- ¿Por qué los destructores no deberían lanzar excepciones?
- ¿Cuándo no basta `optional`?
- ¿Por qué algunos ámbitos de C++ evitan las excepciones?
