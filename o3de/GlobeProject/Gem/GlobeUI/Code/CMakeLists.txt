# GlobeUI Gem - CMake build configuration
#
# ImGui-based UI panels. Depends on GlobePopulation & GlobeLayers Gems.

# ---- Gem source files ----
set(GLOBE_UI_API_FILES
    Include/GlobeUI/GlobeUIBus.h
    Include/GlobeUI/GlobeUITypeIds.h
)

set(GLOBE_UI_SOURCE_FILES
    Source/GlobeUIModuleInterface.h
    Source/GlobeUIModuleInterface.cpp
    Source/Clients/GlobeUIModule.cpp
    Source/Clients/GlobeUISystemComponent.h
    Source/Clients/GlobeUISystemComponent.cpp
)

set(GLOBE_UI_TEST_FILES
    Tests/GlobeUITest.cpp
)

# ---- Runtime Gem target ----
ly_add_target(
    NAME GlobeUI.Static STATIC
    NAMESPACE Gem
    FILES_CMAKE
        globeui_files.cmake
    INCLUDE_DIRECTORIES
        PUBLIC
            Include
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PUBLIC
            AZ::AzCore
            AZ::AzFramework
            Gem::GlobePopulation.Static
            Gem::GlobeLayers.Static
            Gem::ImGui.Static
)

ly_add_target(
    NAME GlobeUI ${PAL_TRAIT_MONOLITHIC_DRIVEN_MODULE_TYPE}
    NAMESPACE Gem
    FILES_CMAKE
        globeui_shared_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PRIVATE
            Gem::GlobeUI.Static
)

# ---- Tests ----
if(PAL_TRAIT_BUILD_TESTS_SUPPORTED)
    ly_add_target(
        NAME GlobeUI.Tests ${PAL_TRAIT_TEST_TARGET_TYPE}
        NAMESPACE Gem
        FILES_CMAKE
            globeui_tests_files.cmake
        INCLUDE_DIRECTORIES
            PRIVATE
                Source
                Tests
        BUILD_DEPENDENCIES
            PRIVATE
                AZ::AzTest
                Gem::GlobeUI.Static
    )
    ly_add_googletest(
        NAME Gem::GlobeUI.Tests
    )
endif()
