---
title: "07 — Const, referencias y paso de parámetros"
description: "Las firmas de las funciones deben comunicar propiedad, mutación y opcionalidad."
weight: 7
type: "guide"
build:
  list: local
  render: always
translationHash: "abbd414f73e3c1d005e83760aa9b1fe1"
---

# 07 — Const, referencias y paso de parámetros

## Idea central

Las firmas de las funciones deben comunicar propiedad, mutación y opcionalidad.

## `const`

`const` significa que el objeto no debe modificarse a través de este nombre.

```cpp
void print(const std::string& s) {
    std::cout << s << '\n';
}
```

Usa `const` con frecuencia para el acceso de solo lectura.

## Referencias

Usa una referencia cuando un objeto deba existir.

```cpp
void update(User& user) {
    user.score += 1;
}
```

Usa `const&` al leer sin copiar un objeto potencialmente costoso.

```cpp
void print_user(const User& user);
```

## Punteros

Usa un puntero cuando el parámetro sea opcional o pueda ser nulo.

```cpp
void maybe_print(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

## Paso por valor

Pasa por valor los tipos pequeños y baratos.

```cpp
void set_age(int age);
```

Pasa también por valor cuando quieras hacer una copia o mover el valor a un miembro.

```cpp
class User {
    std::string name_;
public:
    explicit User(std::string name)
        : name_(std::move(name)) {}
};
```

Esto admite tanto llamadas con copia como con movimiento.

## Propiedad en los parámetros

```cpp
void read(const User& user);                 // read only, no ownership
void modify(User& user);                     // mutate, no ownership
void maybe_read(const User* user);           // nullable, no ownership
void take(std::unique_ptr<User> user);       // takes ownership
void share(std::shared_ptr<User> user);      // shares ownership
```

## Tipos de retorno

```cpp
User make_user();                    // returns value
std::optional<User> find_user(int);  // may not exist
User& get_user();                    // caller does not own
std::unique_ptr<User> create_user(); // transfers ownership
```

## Errores habituales

### Pasarlo todo por referencia no constante

Mal:

```cpp
void process(User& user); // does this modify user?
```

Si no modifica, usa:

```cpp
void process(const User& user);
```

### Usar punteros cuando son mejores las referencias

Si null no es válido, prefiere una referencia.

```cpp
void process(const User& user); // better than const User* if user required
```

### Devolver referencias a variables locales

Nunca hagas esto:

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s;
}
```

## Autoevaluación rápida

Deberías poder responder:

- ¿Posee esta función el objeto?
- ¿Puede ser nulo el argumento?
- ¿Puede la función modificar el objeto?
- ¿Debe copiarse, referenciarse, moverse o poseerse este parámetro?
