---
title: "19 — Lista de comprobación rápida"
description: "Usa esta lista como autoevaluación rápida."
weight: 19
type: "guide"
build:
  list: local
  render: always
translationHash: "f65dab7fd47edf7c9b480f2dfbff641b"
---

# 19 — Lista de comprobación rápida

Usa esta lista como autoevaluación rápida.

## Fundamentos de C++ moderno

- [ ] Entiendo la duración de vida en la pila y en el heap.
- [ ] Puedo explicar RAII.
- [ ] Evito `new` y `delete` manuales en el código normal.
- [ ] Sé cuándo usar `unique_ptr`.
- [ ] Sé cuándo no usar `shared_ptr`.
- [ ] Entiendo los punteros crudos como vistas no propietarias.
- [ ] Entiendo las referencias frente a los punteros.
- [ ] Puedo explicar la corrección de const.

## Semántica de movimiento y de valores

- [ ] Sé qué hace realmente `std::move`.
- [ ] Sé qué significa que un objeto esté en estado moved-from.
- [ ] Entiendo el constructor de copia y la asignación por copia.
- [ ] Entiendo el constructor de movimiento y la asignación por movimiento.
- [ ] Conozco la Rule of 0, Rule of 3 y Rule of 5.
- [ ] Prefiero la semántica de valores cuando es posible.

## STL

- [ ] Uso `std::vector` como contenedor secuencial predeterminado.
- [ ] Conozco `map` frente a `unordered_map`.
- [ ] Conozco `set` frente a `unordered_set`.
- [ ] Entiendo la invalidación de iteradores.
- [ ] Puedo usar `sort`, `find`, `count`, `transform` y `remove_if`.
- [ ] Puedo escribir lambdas para algoritmos.

## Sintaxis moderna

- [ ] Uso `auto` adecuadamente.
- [ ] Uso `for` basado en rangos.
- [ ] Uso lambdas.
- [ ] Uso `nullptr`.
- [ ] Uso `enum class`.
- [ ] Entiendo los fundamentos de `constexpr`.
- [ ] Puedo leer structured bindings.

## Tipos modernos de la biblioteca

- [ ] Sé cuándo usar `optional`.
- [ ] Sé cuándo usar `variant`.
- [ ] Entiendo los riesgos de duración de vida de `string_view`.
- [ ] Entiendo `span` como vista no propietaria.
- [ ] Puedo usar `filesystem`.
- [ ] Puedo usar duraciones de `chrono`.

## Plantillas

- [ ] Puedo escribir una plantilla de función.
- [ ] Puedo escribir una plantilla de clase sencilla.
- [ ] Entiendo la instanciación de plantillas.
- [ ] Puedo leer plantillas básicas restringidas por Concepts.

## Gestión de errores

- [ ] Entiendo las excepciones.
- [ ] Entiendo los fundamentos de la seguridad ante excepciones.
- [ ] Sé por qué los destructores no deberían lanzar excepciones.
- [ ] Sé cuándo `optional` no basta.
- [ ] Sé que algunos ámbitos evitan las excepciones.

## Concurrencia

- [ ] Puedo crear un hilo y ejecutar su join.
- [ ] Sé qué es una carrera de datos.
- [ ] Puedo usar `mutex` y `lock_guard`.
- [ ] Entiendo las variables de condición a nivel básico.
- [ ] Entiendo los atómicos a nivel básico.
- [ ] Sé qué es un bloqueo mutuo.

## Seguridad y rendimiento

- [ ] Conozco casos habituales de comportamiento indefinido.
- [ ] Uso sanitizadores.
- [ ] Entiendo los fundamentos de la localidad de caché.
- [ ] Sé por qué la asignación en el heap puede ser costosa.
- [ ] Perfilo antes de optimizar.
- [ ] Entiendo `reserve`.

## Herramientas

- [ ] Puedo compilar con CMake.
- [ ] Puedo depurar con gdb/lldb.
- [ ] Puedo activar AddressSanitizer y UBSan.
- [ ] Puedo formatear código con clang-format.
- [ ] Puedo ejecutar pruebas básicas con Catch2 o GoogleTest.

## Portafolio

- [ ] Tengo un proyecto serio en C++.
- [ ] Tiene un README.
- [ ] Tiene pruebas.
- [ ] Usa CMake.
- [ ] Incluye instrucciones para los sanitizadores.
- [ ] Demuestra un ámbito, no solo sintaxis.
