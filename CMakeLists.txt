cmake_minimum_required(VERSION 4.0.2)
project(Versus LANGUAGES CXX)

# Default build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug CACHE STRING "Build type" FORCE)
endif()

# C++20 standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Исправлено: опечатка и путь без конфигурации
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${PROJECT_BINARY_DIR}/bin)

# Add subdirectories
add_subdirectory(Sources)

# Tests
option(WITH_TESTS "Build tests" OFF)
if(WITH_TESTS)
    enable_testing()
    add_subdirectory(Tests)
endif()