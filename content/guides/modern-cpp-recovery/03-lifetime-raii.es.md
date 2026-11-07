---
title: "03 — Duración de objetos, pila, montón y RAII"
description: "C++ es un lenguaje de duraciones. Para escribir buen C++ debes saber cuándo se crean y destruyen los objetos y quién posee los recursos."
weight: 3
type: "guide"
build:
  list: local
  render: always
translationHash: "5cb7dc9782234e7d52ff854179a31bcb"
---

# 03 — Duración de objetos, pila, montón y RAII

## Idea central

C++ es un lenguaje de duraciones. Para escribir buen C++ debes saber cuándo se crean y destruyen los objetos y quién posee los recursos.

## Duración en la pila

Los objetos creados dentro de un ámbito se destruyen automáticamente cuando termina ese ámbito.

```cpp
void f() {
    std::string name = "Ada";
} // name is destroyed here
```

Esto es limpieza determinista.

## Duración en el montón

Los objetos del montón viven hasta que se liberan explícitamente o su propietario los libera.

Estilo antiguo:

```cpp
User* user = new User("Ada");
delete user;
```

Estilo moderno:

```cpp
auto user = std::make_unique<User>("Ada");
```

El `unique_ptr` elimina el objeto automáticamente.

## RAII

RAII significa Resource Acquisition Is Initialization.

Un recurso se adquiere en un constructor y se libera en un destructor.

Los recursos incluyen:

- memoria,
- archivos,
- sockets,
- bloqueos,
- conexiones de bases de datos,
- identificadores de GPU,
- identificadores del sistema operativo.

Ejemplo:

```cpp
void write_file() {
    std::ofstream file("out.txt");
    file << "hello\n";
} // file closes automatically here
```

## Por qué importa RAII

RAII se encarga de la limpieza incluso cuando ocurren excepciones o retornos anticipados.

```cpp
void work() {
    std::lock_guard<std::mutex> lock(m);
    // mutex is unlocked automatically when lock leaves scope
}
```

## Destructores

Un destructor se ejecuta cuando muere un objeto.

```cpp
class FileHandle {
public:
    FileHandle() { /* acquire */ }
    ~FileHandle() { /* release */ }
};
```

El código moderno suele evitar destructores personalizados mediante tipos de la biblioteca estándar que ya gestionan recursos.

## Errores habituales de duración

### Referencia colgante

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s; // dangling reference
}
```

### Uso después de liberar

```cpp
User* p = new User{};
delete p;
p->name(); // invalid
```

### Devolver un puntero a una variable local

```cpp
int* bad() {
    int x = 42;
    return &x; // invalid after return
}
```

## Regla práctica

Si un recurso necesita limpieza, colócalo dentro de un objeto cuyo destructor la realice.

## Autoevaluación rápida

Deberías poder explicar:

- ¿Cuándo se destruye un objeto de la pila?
- ¿Por qué RAII es más seguro que la limpieza manual?
- ¿Por qué no es válido devolver una referencia a una variable local?
- ¿Por qué deberían ser poco frecuentes `new` y `delete` en C++ moderno?
