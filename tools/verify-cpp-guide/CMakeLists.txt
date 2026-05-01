cmake_minimum_required(VERSION 3.20)
project(verify_cpp_guide LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(verify_cpp_guide verify.cpp)
target_compile_options(verify_cpp_guide PRIVATE -Wall -Wextra -Wpedantic -Werror)

add_executable(negative_examples negative.cpp)
target_compile_options(negative_examples PRIVATE -Wall -Wextra -Wpedantic)

add_executable(expected_cpp23 expected_cpp23.cpp)
target_compile_features(expected_cpp23 PRIVATE cxx_std_23)
target_compile_options(expected_cpp23 PRIVATE -Wall -Wextra -Wpedantic -Werror)

