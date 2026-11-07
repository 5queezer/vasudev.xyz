---
title: "05 — Semántica de valores y regla de 0/3/5"
description: "C++ moderno prefiere tipos que se comportan como valores. Un buen tipo puede copiarse, moverse, guardarse en contenedores, devolverse desde funciones y destruirse con seguridad."
weight: 5
type: "guide"
build:
  list: local
  render: always
translationHash: "5bb03b547d5152d3ebdce179ac977af2"
---

# 05 — Semántica de valores y regla de 0/3/5

## Idea central

C++ moderno prefiere tipos que se comportan como valores. Un buen tipo puede copiarse, moverse, guardarse en contenedores, devolverse desde funciones y destruirse con seguridad.

## Semántica de valores

Un valor posee sus datos y se comporta de manera predecible.

```cpp
std::string a = "hello";
std::string b = a; // b has its own value
```

Esto es más fácil de razonar que objetos dispersos en el montón detrás de punteros sin procesar.

## Regla de 0

Si tu clase solo contiene miembros de la biblioteca estándar o que gestionan recursos, normalmente no necesitas un destructor, constructor de copia ni constructor de movimiento personalizados.

```cpp
class User {
public:
    std::string name;
    std::vector<int> scores;
};
```

Esto es lo ideal.

## Regla de 3

Si defines uno de estos elementos, probablemente necesites los tres:

- destructor,
- constructor de copia,
- operador de asignación por copia.

Esto suele aparecer en clases de estilo antiguo que poseen memoria de forma manual.

```cpp
class Buffer {
    int* data;
    std::size_t size;
public:
    ~Buffer();
    Buffer(const Buffer& other);
    Buffer& operator=(const Buffer& other);
};
```

## Regla de 5

Con semántica de movimiento, si gestionas un recurso manualmente, puedes necesitar los cinco:

- destructor,
- constructor de copia,
- asignación por copia,
- constructor de movimiento,
- asignación por movimiento.

```cpp
class Buffer {
public:
    ~Buffer();
    Buffer(const Buffer&);
    Buffer& operator=(const Buffer&);
    Buffer(Buffer&&) noexcept;
    Buffer& operator=(Buffer&&) noexcept;
};
```

## Prefiere la regla de 0

En lugar de gestionar memoria manualmente:

```cpp
class Buffer {
    std::vector<int> data;
};
```

Ahora las operaciones generadas por el compilador suelen ser correctas.

## `= default` y `= delete`

Declara explícitamente operaciones predeterminadas:

```cpp
class User {
public:
    User() = default;
};
```

Desactiva operaciones:

```cpp
class NonCopyable {
public:
    NonCopyable(const NonCopyable&) = delete;
    NonCopyable& operator=(const NonCopyable&) = delete;
};
```

## Error habitual

Si tu clase tiene un puntero propietario sin procesar y usa el constructor de copia predeterminado, probablemente tenga un error de doble liberación.

```cpp
class Bad {
    int* data;
};
```

La copia duplica el puntero, no los datos a los que apunta.

## Autoevaluación rápida

Deberías poder explicar:

- ¿Qué significa que un tipo tenga semántica de valores?
- ¿Por qué se prefiere la regla de 0?
- ¿Cuándo necesitas la regla de 5?
- ¿Qué hace `= delete`?
- ¿Por qué son peligrosos los punteros propietarios sin procesar en clases copiables?
