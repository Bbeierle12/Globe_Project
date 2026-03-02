# GlobeLayers Gem - CMake build configuration
#
# Pure C++ layer registry service. No Rust FFI dependency.

# ---- Gem source files ----
set(GLOBE_LAYERS_API_FILES
    Include/GlobeLayers/GlobeLayersBus.h
    Include/GlobeLayers/GlobeLayerNotificationBus.h
    Include/GlobeLayers/GlobeLayersTypeIds.h
)

set(GLOBE_LAYERS_SOURCE_FILES
    Source/GlobeLayersModuleInterface.h
    Source/GlobeLayersModuleInterface.cpp
    Source/Clients/GlobeLayersModule.cpp
    Source/Clients/GlobeLayersSystemComponent.h
    Source/Clients/GlobeLayersSystemComponent.cpp
)

set(GLOBE_LAYERS_TEST_FILES
    Tests/GlobeLayersTest.cpp
)

# ---- Runtime Gem target ----
ly_add_target(
    NAME GlobeLayers.Static STATIC
    NAMESPACE Gem
    FILES_CMAKE
        globelayers_files.cmake
    INCLUDE_DIRECTORIES
        PUBLIC
            Include
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PUBLIC
            AZ::AzCore
            AZ::AzFramework
)

ly_add_target(
    NAME GlobeLayers ${PAL_TRAIT_MONOLITHIC_DRIVEN_MODULE_TYPE}
    NAMESPACE Gem
    FILES_CMAKE
        globelayers_shared_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PRIVATE
            Gem::GlobeLayers.Static
)

# ---- Tests ----
if(PAL_TRAIT_BUILD_TESTS_SUPPORTED)
    ly_add_target(
        NAME GlobeLayers.Tests ${PAL_TRAIT_TEST_TARGET_TYPE}
        NAMESPACE Gem
        FILES_CMAKE
            globelayers_tests_files.cmake
        INCLUDE_DIRECTORIES
            PRIVATE
                Source
                Tests
        BUILD_DEPENDENCIES
            PRIVATE
                AZ::AzTest
                Gem::GlobeLayers.Static
    )
    ly_add_googletest(
        NAME Gem::GlobeLayers.Tests
    )
endif()
