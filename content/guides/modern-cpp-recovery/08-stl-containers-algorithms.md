---
title: "08 — STL Containers and Algorithms"
description: "The standard library is the default toolbox. Modern C++ code should use containers and algorithms instead of manual memory and hand-written loops everywher"
weight: 8
type: "guide"
build:
  list: local
  render: always
---

# 08 — STL Containers and Algorithms

## Core Idea

The standard library is the default toolbox. Modern C++ code should use containers and algorithms instead of manual memory and hand-written loops everywhere.

## Default Container: `std::vector`

Use `std::vector` unless you have a specific reason not to.

```cpp
std::vector<int> values = {1, 2, 3};
values.push_back(4);
```

Why it is good:

- contiguous memory,
- cache-friendly,
- fast iteration,
- simple ownership.

## Other Common Containers

```cpp
std::array<int, 3> fixed = {1, 2, 3};
std::deque<int> dq;
std::map<std::string, int> ordered;
std::unordered_map<std::string, int> hashed;
std::set<int> unique_sorted;
std::unordered_set<int> unique_hashed;
std::queue<int> q;
std::stack<int> st;
std::priority_queue<int> pq;
```

## Choosing Containers

- `vector`: default sequence.
- `array`: fixed-size stack array.
- `deque`: fast push front/back.
- `map`: sorted keys, tree-based.
- `unordered_map`: hash table, often faster lookup.
- `set`: sorted unique values.
- `unordered_set`: unique hashed values.

## Iterators

Iterators are generalized pointers into containers.

```cpp
auto it = values.begin();
std::cout << *it << '\n';
```

## Iterator Invalidation

Some operations make existing iterators/references invalid.

Example: `vector::push_back` may reallocate and invalidate references.

```cpp
std::vector<int> v = {1, 2, 3};
int& ref = v[0];
v.push_back(4); // ref may now be invalid
```

## Algorithms

Prefer standard algorithms for common operations.

```cpp
std::sort(values.begin(), values.end());

auto it = std::find(values.begin(), values.end(), 42);

auto count = std::count(values.begin(), values.end(), 7);
```

## Lambdas with Algorithms

```cpp
std::sort(users.begin(), users.end(), [](const User& a, const User& b) {
    return a.score < b.score;
});
```

## Remove-Erase Idiom

```cpp
values.erase(
    std::remove_if(values.begin(), values.end(), [](int x) { return x < 0; }),
    values.end()
);
```

## Common Mistakes

- Using `list` because you think insertion is always faster.
- Forgetting iterator invalidation.
- Writing manual loops for everything.
- Using `map` when `unordered_map` is enough.
- Storing owning raw pointers in containers.

## Quick Self-Test

You should be able to answer:

- Why is `vector` usually the default?
- When would you use `unordered_map` over `map`?
- What is iterator invalidation?
- How do you sort with a custom comparison?
- What is the remove-erase idiom?
