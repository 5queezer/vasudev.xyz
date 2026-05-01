---
title: "04 — Ownership, Raw Pointers, and Smart Pointers"
description: "Modern C++ code should make ownership obvious."
weight: 4
type: "guide"
build:
  list: local
  render: always
---

# 04 — Ownership, Raw Pointers, and Smart Pointers

## Core Idea

Modern C++ code should make ownership obvious.

Ownership means responsibility for destroying an object or releasing a resource.

## Raw Pointers

Raw pointers are fine as non-owning references.

```cpp
void print_user(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

But raw owning pointers are dangerous.

Avoid:

```cpp
User* user = new User{}; // who deletes this?
```

## References

Use references when the object must exist and cannot be null.

```cpp
void print_user(const User& user) {
    std::cout << user.name << '\n';
}
```

## `std::unique_ptr`

Use `unique_ptr` for exclusive ownership.

```cpp
auto user = std::make_unique<User>("Ada");
```

Characteristics:

- one owner,
- movable,
- not copyable,
- deletes automatically.

Pass ownership:

```cpp
void take_user(std::unique_ptr<User> user);

auto user = std::make_unique<User>();
take_user(std::move(user));
```

## `std::shared_ptr`

Use `shared_ptr` only when ownership is genuinely shared.

```cpp
auto user = std::make_shared<User>();
```

Characteristics:

- reference counted,
- copyable,
- deletes when last owner dies,
- has runtime overhead,
- can create cycles.

## `std::weak_ptr`

Use `weak_ptr` to observe a `shared_ptr` object without owning it.

```cpp
std::weak_ptr<User> weak = shared;

if (auto user = weak.lock()) {
    // safe to use user
}
```

## Choosing the Right Type

```cpp
void read(const User& u);                 // must exist, no ownership
void maybe_read(const User* u);           // optional, no ownership
void take(std::unique_ptr<User> u);       // takes ownership
void share(std::shared_ptr<User> u);      // shares ownership
```

## Common Mistakes

### Overusing `shared_ptr`

Do not use `shared_ptr` just because it feels safe. Shared ownership makes lifetimes harder to reason about.

### Calling `delete` Manually

If you use smart pointers correctly, you almost never call `delete` directly.

### Returning Raw Owning Pointers

Avoid:

```cpp
User* make_user();
```

Prefer:

```cpp
std::unique_ptr<User> make_user();
```

## Quick Self-Test

You should be able to answer:

- Who owns this object?
- Can this pointer be null?
- Should this function take ownership?
- Why is `unique_ptr` usually better than `shared_ptr`?
- What problem does `weak_ptr` solve?
