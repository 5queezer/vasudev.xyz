---
title: "13 — Concurrencia: hilos, mutexes y operaciones atómicas"
description: "El código concurrente permite que ocurran varias cosas a la vez, pero introduce carreras de datos, bloqueos mutuos, problemas de orden y dificultades de depuración."
weight: 13
type: "guide"
build:
  list: local
  render: always
translationHash: "69d9eaa849ccca2e03c0a61dffc8651f"
---

# 13 — Concurrencia: hilos, mutexes y operaciones atómicas

## Idea principal

El código concurrente permite que ocurran varias cosas a la vez, pero introduce carreras de datos, bloqueos mutuos, problemas de orden y dificultades de depuración.

## Hilos

```cpp
#include <thread>
#include <iostream>

void work() {
    std::cout << "working\n";
}

int main() {
    std::thread t(work);
    t.join();
}
```

Ejecuta siempre `join` o `detach` en un `std::thread` antes de destruirlo.

## `std::jthread`

El `jthread` de C++20 es un contenedor RAII para hilos: su destructor solicita la detención y ejecuta automáticamente el join.

```cpp
std::jthread t([] {
    // work
});
```

Prefiérelo cuando esté disponible.

## Carrera de datos

Una carrera de datos ocurre cuando dos evaluaciones en conflicto acceden a la misma memoria de forma concurrente, al menos una la modifica y no existe sincronización ni una relación happens-before.

Las carreras de datos son comportamiento indefinido.

## Mutex

```cpp
std::mutex m;
int counter = 0;

void increment() {
    std::lock_guard<std::mutex> lock(m);
    ++counter;
}
```

RAII libera el mutex automáticamente.

## `std::unique_lock`

Es más flexible que `lock_guard` y resulta útil con variables de condición.

```cpp
std::unique_lock<std::mutex> lock(m);
```

## Variables de condición

Se usan para esperar hasta que una condición sea verdadera. Espera siempre con un predicado para gestionar correctamente los despertares espurios.

```cpp
std::condition_variable cv;
std::mutex m;
bool ready = false;

void wait_thread() {
    std::unique_lock lock(m);
    cv.wait(lock, [] { return ready; });
}
```

## Operaciones atómicas

Usa tipos atómicos para valores compartidos simples.

```cpp
std::atomic<int> counter = 0;
++counter;
```

No supongas que los atómicos hacen segura automáticamente una lógica compleja.

## Bloqueo mutuo

Un bloqueo mutuo ocurre cuando varios hilos se esperan entre sí para siempre.

Una causa habitual es bloquear mutexes en órdenes distintos.

## Patrones habituales

- Cola productor-consumidor.
- Grupo de hilos de trabajo.
- Datos compartidos de solo lectura.
- Paso de mensajes.
- Datos inmutables y transferencia de propiedad.

## Errores habituales

- Compartir estado mutable sin bloqueos.
- Mantener los bloqueos demasiado tiempo.
- Llamar a código desconocido mientras se mantiene un bloqueo.
- Bloquear varios mutexes en órdenes incoherentes.
- Pensar que `volatile` significa seguridad entre hilos. No es así.

## Autoevaluación rápida

Deberías poder responder:

- ¿Qué es una carrera de datos?
- ¿Por qué `lock_guard` sigue RAII?
- ¿Cuándo usarías una variable de condición?
- ¿Qué es un bloqueo mutuo?
- ¿Por qué `volatile` no es un mecanismo de sincronización?
