# EngineFinder.cmake - Locates the O3DE engine installation
# Set O3DE_ENGINE_DIR to your engine path, or let it auto-detect

if(NOT O3DE_ENGINE_DIR)
    # Try environment variable
    if(DEFINED ENV{O3DE_ENGINE_DIR})
        set(O3DE_ENGINE_DIR $ENV{O3DE_ENGINE_DIR})
    else()
        # Default search paths
        if(WIN32)
            set(_search_paths
                "C:/O3DE"
                "$ENV{USERPROFILE}/O3DE/Engine"
            )
        else()
            set(_search_paths
                "$ENV{HOME}/O3DE/Engine"
                "$ENV{HOME}/o3de"
                "/opt/o3de"
            )
        endif()

        foreach(_path ${_search_paths})
            if(EXISTS "${_path}/CMakeLists.txt")
                set(O3DE_ENGINE_DIR "${_path}")
                break()
            endif()
        endforeach()
    endif()
endif()

if(O3DE_ENGINE_DIR)
    list(APPEND CMAKE_MODULE_PATH "${O3DE_ENGINE_DIR}/cmake")
    message(STATUS "O3DE Engine found at: ${O3DE_ENGINE_DIR}")
else()
    message(STATUS "O3DE Engine not found. Set O3DE_ENGINE_DIR or install O3DE.")
    message(STATUS "This project scaffolding can be built once O3DE is available.")
endif()
