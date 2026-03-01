# Globe Project - O3DE Desktop Application
# Refactored from browser UI (React + Cesium.js) to native desktop (O3DE + Cesium for O3DE)

if(NOT PROJECT_NAME)
    cmake_minimum_required(VERSION 3.24)

    include(cmake/EngineFinder.cmake)
    find_package(o3de REQUIRED)
    project(GlobeProject LANGUAGES C CXX VERSION 0.1.0)
    o3de_initialize()
endif()
