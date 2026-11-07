---
title: "09 — Sintaxis moderna: auto, lambdas, enum class, constexpr"
description: "Usa `auto` cuando el tipo sea obvio o verboso."
weight: 9
type: "guide"
build:
  list: local
  render: always
translationHash: "0e94b60cf9e9bee2510b996d0abfd9ee"
---

# 09 — Sintaxis moderna: auto, lambdas, enum class, constexpr

## `auto`

Usa `auto` cuando el tipo sea obvio o verboso.

```cpp
auto count = users.size();
auto it = map.find("key");
```

No lo uses cuando oculte un significado importante.

```cpp
auto x = get_value(); // unclear if get_value is unclear
```

## For basado en rangos

```cpp
for (const auto& user : users) {
    std::cout << user.name << '\n';
}
```

Usa:

- `auto` para copias,
- `auto&` para mutación,
- `const auto&` para acceso de solo lectura sin copiar.

## Lambdas

Las lambdas son objetos de función en línea.

```cpp
auto is_even = [](int x) {
    return x % 2 == 0;
};
```

Con captura:

```cpp
int threshold = 10;
auto bigger = [threshold](int x) {
    return x > threshold;
};
```

Usa con cuidado la captura por referencia:

```cpp
auto f = [&threshold](int x) {
    return x > threshold;
};
```

Asegúrate de que los objetos referenciados vivan más que la lambda.

## `nullptr`

Usa `nullptr`, no `NULL` ni `0`.

```cpp
User* user = nullptr;
```

## `enum class`

Prefiere enumeraciones con ámbito.

```cpp
enum class Status {
    Ok,
    Error,
    Unknown
};

Status s = Status::Ok;
```

Esto evita contaminar los nombres y la conversión implícita a enteros.

## Inicialización uniforme

```cpp
User user{"Ada", 42};
std::vector<int> values{1, 2, 3};
```

Ten en cuenta que las sobrecargas con listas de inicialización pueden sorprenderte a veces.

## `constexpr`

`constexpr` significa que algo puede evaluarse en tiempo de compilación cuando sea posible.

```cpp
constexpr int square(int x) {
    return x * x;
}

constexpr int nine = square(3);
```

## Enlaces estructurados

```cpp
auto [it, inserted] = map.insert({"key", 42});
```

Útiles para pares, tuplas y estructuras.

## Sentencias de inicialización en if/switch

```cpp
if (auto it = users.find(id); it != users.end()) {
    // use it
}
```

## Autoevaluación rápida

Deberías poder explicar:

- ¿Cuándo debes usar `auto`?
- ¿Qué hace la captura de una lambda?
- ¿Por qué se prefiere `nullptr`?
- ¿Por qué `enum class` es más seguro que las enumeraciones antiguas?
- ¿Qué aporta `constexpr`?
