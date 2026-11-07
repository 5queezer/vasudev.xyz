---
title: "10 — Tipos modernos de la biblioteca"
description: "Usa optional cuando un valor pueda existir o no."
weight: 10
type: "guide"
build:
  list: local
  render: always
translationHash: "d44d5d95f1b4da50a921aaaa2cf0850a"
---

# 10 — Tipos modernos de la biblioteca

## `std::optional`

Úsalo cuando un valor pueda existir o no.

```cpp
std::optional<User> find_user(int id);

if (auto user = find_user(42)) {
    std::cout << user->name << '\n';
}
```

Evita valores centinela como `-1` o cadenas vacías cuando la ausencia tenga significado.

## `std::variant`

Úsalo para un valor que puede ser uno de varios tipos conocidos.

```cpp
using Result = std::variant<int, std::string>;
```

Visítalo:

```cpp
std::visit([](const auto& value) {
    std::cout << value << '\n';
}, result);
```

## `std::any`

Puede contener cualquier tipo, pero úsalo con moderación. Se pierde claridad sobre el tipo.

```cpp
std::any value = 42;
```

## `std::string_view`

Una vista que no posee los datos de una cadena.

```cpp
void print(std::string_view text) {
    std::cout << text << '\n';
}
```

Importante: no posee la cadena. Evita devolver un `string_view` hacia datos temporales.

Mal:

```cpp
std::string_view bad() {
    std::string s = "dead";
    return s;
}
```

## `std::span`

Una vista sin propiedad sobre memoria contigua.

```cpp
void process(std::span<int> values) {
    for (int& v : values) {
        v += 1;
    }
}
```

Funciona con vectores, arrays y arrays de C.

## `std::filesystem`

Operaciones portables con el sistema de archivos.

```cpp
#include <filesystem>

namespace fs = std::filesystem;

for (const auto& entry : fs::directory_iterator(".")) {
    std::cout << entry.path() << '\n';
}
```

## `std::chrono`

Gestión con seguridad de tipos para tiempo y duraciones.

```cpp
using namespace std::chrono_literals;

auto timeout = 500ms;
```

Medir el tiempo:

```cpp
auto start = std::chrono::steady_clock::now();
// work
auto end = std::chrono::steady_clock::now();
```

## Autoevaluación rápida

Deberías poder responder:

- ¿Cuándo debes usar `optional`?
- ¿Por qué es peligroso `string_view` si se usa mal?
- ¿Qué problema resuelve `span`?
- ¿Cuándo es `variant` mejor que la herencia?
- ¿Por qué usar `chrono` en lugar de enteros sin tipo para el tiempo?
