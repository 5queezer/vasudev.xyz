---
title: "03 — Object Lifetime, Stack, Heap, and RAII"
description: "C++ is a lifetime language. To write good C++, you must know when objects are created, when they are destroyed, and who owns resources."
weight: 3
type: "guide"
build:
  list: local
  render: always
---

# 03 — Object Lifetime, Stack, Heap, and RAII

## Core Idea

C++ is a lifetime language. To write good C++, you must know when objects are created, when they are destroyed, and who owns resources.

## Stack Lifetime

Objects created in a scope are destroyed automatically when the scope ends.

```cpp
void f() {
    std::string name = "Ada";
} // name is destroyed here
```

This is deterministic cleanup.

## Heap Lifetime

Heap objects live until explicitly released or until their owner releases them.

Old style:

```cpp
User* user = new User("Ada");
delete user;
```

Modern style:

```cpp
auto user = std::make_unique<User>("Ada");
```

The `unique_ptr` deletes the object automatically.

## RAII

RAII means Resource Acquisition Is Initialization.

A resource is acquired in a constructor and released in a destructor.

Resources include:

- memory,
- files,
- sockets,
- locks,
- database connections,
- GPU handles,
- OS handles.

Example:

```cpp
void write_file() {
    std::ofstream file("out.txt");
    file << "hello\n";
} // file closes automatically here
```

## Why RAII Matters

RAII handles cleanup even when exceptions or early returns happen.

```cpp
void work() {
    std::lock_guard<std::mutex> lock(m);
    // mutex is unlocked automatically when lock leaves scope
}
```

## Destructors

A destructor runs when an object dies.

```cpp
class FileHandle {
public:
    FileHandle() { /* acquire */ }
    ~FileHandle() { /* release */ }
};
```

Modern code usually avoids custom destructors by using standard library types that already manage resources.

## Common Lifetime Bugs

### Dangling Reference

```cpp
const std::string& bad() {
    std::string s = "dead";
    return s; // dangling reference
}
```

### Use After Free

```cpp
User* p = new User{};
delete p;
p->name(); // invalid
```

### Returning Pointer to Local

```cpp
int* bad() {
    int x = 42;
    return &x; // invalid after return
}
```

## Rule of Thumb

If a resource needs cleanup, put it inside an object whose destructor performs the cleanup.

## Quick Self-Test

You should be able to explain:

- When does a stack object get destroyed?
- Why is RAII safer than manual cleanup?
- Why is returning a reference to a local variable invalid?
- Why should `new` and `delete` be rare in modern C++?
