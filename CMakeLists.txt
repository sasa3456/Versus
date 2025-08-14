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

# Global output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${PROJECT_BINARY_DIR}/bin/${CMAKE_BUILD_TYPE}/Engine)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${PROJECT_BINARY_DIR}/bin/${CMAKE_BUILD_TYPE}/Engine)
set(CMAKE_RUNTAzE_OUTPUT_DIRECTORY ${PROJECT_BINARY_DIR}/bin/${CMAKE_BUILD_TYPE})

# Add subdirectories
add_subdirectory(Sources/Kernel)
add_subdirectory(Sources/Editor)

# Tests
option(WITH_TESTS "Build tests" OFF)
if(WITH_TESTS)
    enable_testing()
    add_subdirectory(Tests)
endif()
