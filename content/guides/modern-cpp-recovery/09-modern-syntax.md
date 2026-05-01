---
title: "09 — Modern Syntax: auto, Lambdas, enum class, constexpr"
description: "Use `auto` when the type is obvious or verbose."
weight: 9
type: "guide"
build:
  list: local
  render: always
---

# 09 — Modern Syntax: auto, Lambdas, enum class, constexpr

## `auto`

Use `auto` when the type is obvious or verbose.

```cpp
auto count = users.size();
auto it = map.find("key");
```

Do not use it when it hides important meaning.

```cpp
auto x = get_value(); // unclear if get_value is unclear
```

## Range-Based For

```cpp
for (const auto& user : users) {
    std::cout << user.name << '\n';
}
```

Use:

- `auto` for copies,
- `auto&` for mutation,
- `const auto&` for read-only access without copying.

## Lambdas

Lambdas are inline function objects.

```cpp
auto is_even = [](int x) {
    return x % 2 == 0;
};
```

With capture:

```cpp
int threshold = 10;
auto bigger = [threshold](int x) {
    return x > threshold;
};
```

Capture by reference carefully:

```cpp
auto f = [&threshold](int x) {
    return x > threshold;
};
```

Make sure referenced objects outlive the lambda.

## `nullptr`

Use `nullptr`, not `NULL` or `0`.

```cpp
User* user = nullptr;
```

## `enum class`

Prefer scoped enums.

```cpp
enum class Status {
    Ok,
    Error,
    Unknown
};

Status s = Status::Ok;
```

This avoids name pollution and implicit integer conversion.

## Uniform Initialization

```cpp
User user{"Ada", 42};
std::vector<int> values{1, 2, 3};
```

Be aware that initializer-list overloads can sometimes surprise you.

## `constexpr`

`constexpr` means something can be evaluated at compile time when possible.

```cpp
constexpr int square(int x) {
    return x * x;
}

constexpr int nine = square(3);
```

## Structured Bindings

```cpp
auto [it, inserted] = map.insert({"key", 42});
```

Useful for pairs, tuples, structs.

## If/Switch Init Statements

```cpp
if (auto it = users.find(id); it != users.end()) {
    // use it
}
```

## Quick Self-Test

You should be able to explain:

- When should you use `auto`?
- What does a lambda capture do?
- Why prefer `nullptr`?
- Why is `enum class` safer than old enums?
- What does `constexpr` give you?
