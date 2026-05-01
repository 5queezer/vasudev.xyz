# Modern C++ Recovery Guide Verification

This directory contains compiler-backed checks for the examples in `content/guides/modern-cpp-recovery`.

## Verified Environment

At the time of verification:

```text
g++ 15.2.1
clang++ 21.1.8
cmake 3.31.11
```

## What Is Verified

- `verify.cpp` compiles and runs the positive examples from the guide under C++20.
- `expected_cpp23.cpp` verifies the `std::expected` example under C++23.
- `negative.cpp` contains intentionally bad examples from the undefined-behavior sections, so they can be checked with compiler warnings and sanitizers.

The guide also contains shell, CMake, and debugger command snippets. Those are command examples rather than C++ translation units; the CMake snippets are exercised by this verification project itself.

## Run Positive Checks

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build -j
./build/verify_cpp_guide
./build/expected_cpp23
```

Expected result:

```text
Modern C++ guide verification passed
```

## Run Negative / UB Checks

GCC's sanitizer runtime may not be installed on every machine. On this machine, Clang's sanitizer runtime is available, so use:

```bash
clang++ -std=c++20 -Wall -Wextra -Wpedantic \
  -fsanitize=address,undefined -fno-omit-frame-pointer -g \
  negative.cpp -o build/negative_sanitized_clang
```

Then run individual cases:

```bash
./build/negative_sanitized_clang at-throws
./build/negative_sanitized_clang use-after-free
./build/negative_sanitized_clang oob-vector
./build/negative_sanitized_clang signed-overflow
./build/negative_sanitized_clang dangling-ref
./build/negative_sanitized_clang dangling-ptr
```

Expected observations:

- `at-throws` exits successfully after catching `std::out_of_range`.
- `use-after-free` is reported by AddressSanitizer.
- `oob-vector` aborts under sanitizer instrumentation.
- `signed-overflow` is reported by UndefinedBehaviorSanitizer.
- `dangling-ref` is reported as stack-use-after-return.
- `dangling-ptr` is reported as stack-use-after-return.

## Notes

These checks verify that the examples compile and that the intentionally bad examples fail in the expected direction. They do not turn the guide into a formal proof of the C++ standard. For language-lawyer details, use the references in the guide's `20-grounding-and-references.md` page.
