---
title: "06 — Semántica de movimiento"
description: "La semántica de movimiento permite que C++ transfiera recursos en lugar de copiarlos."
weight: 6
type: "guide"
build:
  list: local
  render: always
translationHash: "80cfb3a5af5f88385f6f2a94ead0c8f1"
---

# 06 — Semántica de movimiento

## Idea central

La semántica de movimiento permite que C++ transfiera recursos en lugar de copiarlos.

Este es uno de los mayores cambios respecto al C++ antiguo.

## Copia frente a movimiento

Copiar duplica un valor.

```cpp
std::string a = "hello";
std::string b = a; // copy
```

Mover transfiere recursos de un objeto a otro.

```cpp
std::string a = "hello";
std::string b = std::move(a); // move
```

Tras un movimiento, `a` sigue siendo válido, pero su valor no está especificado. Puedes destruirlo o asignarle un valor nuevo.

## Por qué existe el movimiento

Algunos objetos son costosos de copiar:

- vectores,
- cadenas,
- búferes,
- identificadores de archivo,
- sockets,
- objetos con propiedad exclusiva.

Mover evita asignaciones y copias innecesarias.

## Ejemplo con `std::unique_ptr`

`unique_ptr` no se puede copiar porque la propiedad es única.

```cpp
auto a = std::make_unique<User>();
// auto b = a; // error
```

Pero se puede mover:

```cpp
auto b = std::move(a);
```

Ahora `b` posee el objeto y `a` está vacío.

## Lvalues y rvalues

De forma muy simplificada:

- lvalue: tiene nombre o ubicación estable.
- rvalue: valor temporal.

```cpp
std::string name = "Ada";        // name is an lvalue
std::string temporary{"Ada"};    // initializer creates a temporary, then temporary is a named lvalue
```

## Referencias rvalue

Los constructores de movimiento suelen usar `T&&`.

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept;
};
```

## `std::move`

`std::move` no mueve nada por sí mismo. Convierte un objeto en un rvalue para que se pueda mover desde él.

```cpp
std::vector<int> a = {1, 2, 3};
std::vector<int> b = std::move(a);
```

## Constructor de movimiento

```cpp
class Buffer {
    std::vector<int> data;
public:
    Buffer(Buffer&& other) noexcept
        : data(std::move(other.data)) {}
};
```

La mayoría de las veces, deja que el compilador lo genere.

## `noexcept`

Los constructores de movimiento suelen tener que ser `noexcept`. Contenedores como `std::vector` pueden usar las operaciones de movimiento con mayor eficiencia si saben que no lanzan excepciones.

## Errores habituales

### Usar un objeto después de moverlo

```cpp
std::string a = "hello";
std::string b = std::move(a);
std::cout << a; // valid but unspecified content
```

### Mover desde `const`

Normalmente no se puede mover de forma útil desde un objeto `const`, porque mover modifica el origen.

```cpp
const std::string a = "hello";
std::string b = std::move(a); // likely copies
```

## Autoevaluación rápida

Deberías poder responder:

- ¿Qué hace realmente `std::move`?
- ¿Por qué `unique_ptr` puede moverse pero no copiarse?
- ¿En qué estado queda un objeto después de moverlo?
- ¿Por qué los constructores de movimiento suelen ser `noexcept`?
- ¿Cuándo debes preferir la regla de 0 en lugar de escribir tú mismo los movimientos?
