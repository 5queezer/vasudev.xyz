---
title: "04 — Propiedad, punteros sin procesar y punteros inteligentes"
description: "El código C++ moderno debe dejar clara la propiedad."
weight: 4
type: "guide"
build:
  list: local
  render: always
translationHash: "d090afe2d958e5f70ab82ce56c00899c"
---

# 04 — Propiedad, punteros sin procesar y punteros inteligentes

## Idea central

El código C++ moderno debe dejar clara la propiedad.

La propiedad significa ser responsable de destruir un objeto o liberar un recurso.

## Punteros sin procesar

Los punteros sin procesar son válidos como referencias que no poseen el objeto.

```cpp
void print_user(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

Pero los punteros propietarios sin procesar son peligrosos.

Evita:

```cpp
User* user = new User{}; // who deletes this?
```

## Referencias

Usa referencias cuando el objeto deba existir y no pueda ser nulo.

```cpp
void print_user(const User& user) {
    std::cout << user.name << '\n';
}
```

## `std::unique_ptr`

Usa `unique_ptr` para propiedad exclusiva.

```cpp
auto user = std::make_unique<User>("Ada");
```

Características:

- un propietario,
- se puede mover,
- no se puede copiar,
- elimina automáticamente.

Transferir la propiedad:

```cpp
void take_user(std::unique_ptr<User> user);

auto user = std::make_unique<User>();
take_user(std::move(user));
```

## `std::shared_ptr`

Usa `shared_ptr` solo cuando la propiedad sea realmente compartida.

```cpp
auto user = std::make_shared<User>();
```

Características:

- cuenta referencias,
- se puede copiar,
- elimina cuando muere el último propietario,
- tiene coste en tiempo de ejecución,
- puede crear ciclos.

## `std::weak_ptr`

Usa `weak_ptr` para observar un objeto de `shared_ptr` sin poseerlo.

```cpp
std::weak_ptr<User> weak = shared;

if (auto user = weak.lock()) {
    // safe to use user
}
```

## Elegir el tipo adecuado

```cpp
void read(const User& u);                 // must exist, no ownership
void maybe_read(const User* u);           // optional, no ownership
void take(std::unique_ptr<User> u);       // takes ownership
void share(std::shared_ptr<User> u);      // shares ownership
```

## Errores habituales

### Abusar de `shared_ptr`

No uses `shared_ptr` solo porque parezca seguro. La propiedad compartida hace que las duraciones sean más difíciles de razonar.

### Llamar a `delete` manualmente

Si usas correctamente los punteros inteligentes, casi nunca llamarás directamente a `delete`.

### Devolver punteros propietarios sin procesar

Evita:

```cpp
User* make_user();
```

Prefiere:

```cpp
std::unique_ptr<User> make_user();
```

## Autoevaluación rápida

Deberías poder responder:

- ¿Quién posee este objeto?
- ¿Puede ser nulo este puntero?
- ¿Debe asumir la propiedad esta función?
- ¿Por qué suele ser `unique_ptr` mejor que `shared_ptr`?
- ¿Qué problema resuelve `weak_ptr`?
