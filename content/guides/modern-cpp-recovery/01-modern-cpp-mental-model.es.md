---
title: "01 — Modelo mental de C++ moderno"
description: "C++ moderno no es «C con clases». Es un lenguaje para construir sistemas eficientes mediante propiedad explícita, limpieza determinista, semántica de valores y abstracciones sin coste."
weight: 1
type: "guide"
build:
  list: local
  render: always
translationHash: "9c38f3c93cfb3f2639dff5416efa25b4"
---

# 01 — Modelo mental de C++ moderno

## Idea central

C++ moderno no es «C con clases». Es un lenguaje para construir sistemas eficientes mediante propiedad explícita, limpieza determinista, semántica de valores y abstracciones sin coste.

Si aprendiste C++ alrededor de 2008, el mayor cambio es este:

> El C++ antiguo solía enseñar gestión manual de memoria. El C++ moderno enseña propiedad y RAII.

## Qué ha cambiado desde 2008

C++11 transformó el lenguaje de forma radical. C++14, 17, 20 y 23 continuaron esa evolución.

Conceptos modernos importantes:

- RAII en todas partes.
- Prefiere valores a punteros sin procesar.
- Prefiere los tipos de la biblioteca estándar a la gestión manual de memoria.
- Usa `std::unique_ptr` para propiedad exclusiva.
- Usa `std::shared_ptr` solo cuando la propiedad sea realmente compartida.
- Comprende la semántica de movimiento.
- Usa `auto`, lambdas, bucles basados en rangos, `nullptr` y `enum class`.
- Usa CMake, sanitizers, depuradores y pruebas.

## Prioridades del estilo moderno

Prefiere esto:

```cpp
std::vector<std::string> names;
```

En lugar de esto:

```cpp
char** names;
```

Prefiere esto:

```cpp
auto user = std::make_unique<User>("Ada");
```

En lugar de esto:

```cpp
User* user = new User("Ada");
delete user;
```

Prefiere esto:

```cpp
for (const auto& item : items) {
    process(item);
}
```

En lugar de esto:

```cpp
for (int i = 0; i < items.size(); ++i) {
    process(items[i]);
}
```

## Qué hace valioso a C++

C++ es valioso porque expone la realidad:

- disposición de memoria,
- duración de los objetos,
- rendimiento,
- concurrencia,
- comportamiento de la caché,
- propiedad de recursos,
- comportamiento indefinido,
- límites del hardware y del sistema operativo.

Esta es también la razón por la que resulta difícil.

## Qué debes evitar

Evita escribir C++ moderno como si fuera C++ de 1998:

- Evita punteros sin procesar que posean recursos.
- Evita `new` / `delete` manuales en el código normal.
- Evita arrays de C cuando funcionen `std::array` o `std::vector`.
- Evita la herencia innecesaria.
- Evita macros cuando basten las características del lenguaje.
- Evita código de plantillas ingenioso antes de comprender el código ordinario.

## Autoevaluación rápida

Estás recuperando C++ moderno cuando puedes explicar:

- Por qué importa RAII.
- Cuándo usar `unique_ptr` frente a `shared_ptr`.
- Qué hace realmente `std::move`.
- Por qué `std::vector` suele ser el contenedor predeterminado.
- Por qué es peligroso el comportamiento indefinido.
- Cómo compilar y depurar un proyecto pequeño de C++.
