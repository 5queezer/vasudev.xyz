---
title: "07 — Const, References, and Parameter Passing"
description: "Function signatures should communicate ownership, mutation, and optionality."
weight: 7
type: "guide"
build:
  list: local
  render: always
---

# 07 — Const, References, and Parameter Passing

## Core Idea

Function signatures should communicate ownership, mutation, and optionality.

## `const`

`const` means the object should not be modified through this name.

```cpp
void print(const std::string& s) {
    std::cout << s << '\n';
}
```

Use `const` aggressively for read-only access.

## References

Use a reference when an object must exist.

```cpp
void update(User& user) {
    user.score += 1;
}
```

Use `const&` when reading a potentially expensive object without copying.

```cpp
void print_user(const User& user);
```

## Pointers

Use a pointer when the parameter is optional or nullable.

```cpp
void maybe_print(const User* user) {
    if (user) {
        std::cout << user->name << '\n';
    }
}
```

## Pass by Value

Pass small cheap types by value.

```cpp
void set_age(int age);
```

Also pass by value when you want to make a copy or move into a member.

```cpp
class User {
    std::string name_;
public:
    explicit User(std::string name)
        : name_(std::move(name)) {}
};
```

This allows both copy and move callers.

## Ownership in Parameters

```cpp
void read(const User& user);                 // read only, no ownership
void modify(User& user);                     // mutate, no ownership
void maybe_read(const User* user);           // nullable, no ownership
void take(std::unique_ptr<User> user);       // takes ownership
void share(std::shared_ptr<User> user);      // shares ownership
```

## Return Types

```cpp
User make_user();                    // returns value
std::optional<User> find_user(int);  // may not exist
User& get_user();                    // caller does not own
std::unique_ptr<User> create_user(); // transfers ownership
```

## Common Mistakes

### Passing Everything by Non-Const Reference

Bad:

```cpp
void process(User& user); // does this modify user?
```

If not modifying, use:

```cpp
void process(const User& user);
```

### Using Pointers When References Are Better

If null is not valid, prefer reference.

```cpp
void process(const User& user); // better than const User* if user required
```

### Returning References to Locals

Never do this:

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s;
}
```

## Quick Self-Test

You should be able to answer:

- Does this function own the object?
- Can the argument be null?
- Can the function modify the object?
- Should this parameter be copied, referenced, moved, or owned?
