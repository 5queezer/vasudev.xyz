---
title: "14 — Comportamiento indefinido y seguridad de memoria"
description: "El comportamiento indefinido significa que el estándar de C++ no impone ningún requisito sobre lo que sucede. El programa puede parecer funcionar, fallar, corromper datos o volverse vulnerable."
weight: 14
type: "guide"
build:
  list: local
  render: always
translationHash: "9e9264e94387a1de8e4a92d8dc0935a1"
---

# 14 — Comportamiento indefinido y seguridad de memoria

## Idea principal

El comportamiento indefinido significa que el estándar de C++ no impone ningún requisito sobre lo que sucede. El programa puede parecer funcionar, fallar, corromper datos o volverse vulnerable.

## Comportamientos indefinidos habituales

### Uso después de liberar memoria

```cpp
int* p = new int(42);
delete p;
std::cout << *p; // UB
```

### Referencia colgante

```cpp
const std::string& bad() {
    std::string s = "hello";
    return s; // UB when used
}
```

### Acceso fuera de límites

```cpp
std::vector<int> v = {1, 2, 3};
std::cout << v[10]; // UB
```

Usa `.at()` cuando quieras comprobar los límites:

```cpp
v.at(10); // throws
```

### Variables sin inicializar

```cpp
int x;
std::cout << x; // invalid: do not read uninitialized automatic objects
```

En la terminología anterior a C++26, esto suele describirse como leer un valor indeterminado; C++26 precisa la terminología sobre valores indeterminados y erróneos. La regla práctica no cambia: inicializa antes de leer.

### Desbordamiento de enteros con signo

```cpp
int x = INT_MAX;
++x; // UB
```

### Carreras de datos

Una carrera de datos es comportamiento indefinido: dos evaluaciones en conflicto acceden a la misma memoria de forma concurrente, al menos una la modifica y no existe entre ellas una relación happens-before.

## Invalidación de iteradores

```cpp
std::vector<int> v = {1, 2, 3};
auto it = v.begin();
v.push_back(4); // may invalidate it
std::cout << *it; // maybe UB
```

## Strict aliasing y conversiones

Las conversiones inseguras pueden romper las suposiciones en las que se apoya el compilador.

Evita reinterpretaciones ingeniosas de punteros salvo que sepas exactamente qué estás haciendo.

## Por qué el comportamiento indefinido es peligroso

Los compiladores optimizan suponiendo que el comportamiento indefinido no ocurre. Por eso puede producir resultados sorprendentes en compilaciones optimizadas.

## Herramientas para detectarlo

Usa sanitizadores:

```bash
-fsanitize=address,undefined -fno-omit-frame-pointer -g
```

Sanitizador de hilos:

```bash
-fsanitize=thread
```

Usa también:

- avisos: `-Wall -Wextra -Wpedantic`,
- análisis estático: `clang-tidy`,
- depuradores: `gdb`, `lldb`,
- Valgrind cuando resulte útil.

## Hábitos de seguridad

- Prefiere RAII.
- Prefiere los contenedores estándar.
- Evita punteros crudos propietarios.
- Inicializa las variables.
- Usa referencias solo cuando las duraciones de vida estén claras.
- Evita índices sin comprobar si los datos son externos.
- Usa sanitizadores durante el desarrollo.

## Autoevaluación rápida

Deberías poder responder:

- ¿Qué significa comportamiento indefinido?
- ¿Por qué puede aparecer solo en compilaciones optimizadas?
- ¿Qué es una referencia colgante?
- ¿Por qué puede `vector::push_back` invalidar referencias?
- ¿Qué sanitizadores deberías activar primero?
