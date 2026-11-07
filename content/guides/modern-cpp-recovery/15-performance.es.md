---
title: "15 — Fundamentos de rendimiento"
description: "C++ te da control sobre el rendimiento, pero debes medir. Las conjeturas no son fiables."
weight: 15
type: "guide"
build:
  list: local
  render: always
translationHash: "931af5fb602361085769002579409691"
---

# 15 — Fundamentos de rendimiento

## Idea principal

C++ te da control sobre el rendimiento, pero debes medir. Las conjeturas no son fiables.

## Mide primero

Usa perfiladores antes de optimizar.

Herramientas:

- `perf` en Linux,
- Instruments en macOS,
- Visual Studio Profiler en Windows,
- `valgrind/callgrind`,
- informes del compilador,
- benchmarks con Google Benchmark.

## La notación Big O sigue importando

Un algoritmo `O(n log n)` suele superar a uno `O(n^2)` a gran escala.

Pero también importan los factores constantes, la disposición de memoria y el comportamiento de la caché.

## Localidad de caché

La memoria contigua es rápida.

```cpp
std::vector<User> users;
```

Suele ser mejor que:

```cpp
std::vector<std::unique_ptr<User>> users;
```

Salvo que necesites polimorfismo, direcciones estables o propiedad independiente.

## Costes de asignación

La asignación en el heap es relativamente costosa.

Evita asignaciones innecesarias en bucles críticos.

Mal:

```cpp
for (int i = 0; i < 10; ++i) {
    auto p = std::make_unique<Item>();
}
```

Quizá mejor:

```cpp
std::vector<Item> items;
items.reserve(10);
```

## Evita copias innecesarias

Usa referencias para objetos grandes de solo lectura.

```cpp
void process(const std::vector<int>& values);
```

Usa semántica de movimiento al transferir la propiedad.

```cpp
class Holder {
    std::vector<int> data_;
public:
    void set(std::vector<int> data) {
        this->data_ = std::move(data);
    }
};
```

## `reserve`

Si conoces el tamaño, reserva capacidad.

```cpp
std::vector<int> v;
v.reserve(1000);
```

## Bifurcaciones y disposición

El código crítico puede verse afectado por:

- predicción de saltos,
- fallos de caché,
- uso compartido falso,
- alineación de memoria,
- llamadas virtuales,
- patrones de asignación.

No optimices estos aspectos a ciegas. Mide.

## Optimización del compilador

Opciones habituales:

```bash
-O0  # no optimization, debugging
-O2  # good production default
-O3  # more aggressive, not always better
-g   # debug symbols
```

## Mentalidad de rendimiento

El buen rendimiento suele proceder de:

- mejores algoritmos,
- mejor disposición de datos,
- menos asignaciones,
- menos copias,
- propiedad más sencilla,
- trabajo por lotes,
- el contenedor adecuado.

## Autoevaluación rápida

Deberías poder responder:

- ¿Por qué `vector` favorece la caché?
- ¿Por qué la asignación en el heap puede perjudicar las rutas críticas?
- ¿Qué hace `reserve`?
- ¿Por qué deberías perfilar antes de optimizar?
- ¿Qué es el uso compartido falso?
