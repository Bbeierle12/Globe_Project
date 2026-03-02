# GlobeOsintFeeds Gem - CMake build configuration
#
# External data feed integration. Depends on GlobeLayers Gem.

# ---- Gem source files ----
set(GLOBE_OSINT_FEEDS_API_FILES
    Include/GlobeOsintFeeds/GlobeOsintFeedsBus.h
    Include/GlobeOsintFeeds/GlobeOsintFeedsTypeIds.h
)

set(GLOBE_OSINT_FEEDS_SOURCE_FILES
    Source/GlobeOsintFeedsModuleInterface.h
    Source/GlobeOsintFeedsModuleInterface.cpp
    Source/Clients/GlobeOsintFeedsModule.cpp
    Source/Clients/GlobeOsintFeedsSystemComponent.h
    Source/Clients/GlobeOsintFeedsSystemComponent.cpp
)

set(GLOBE_OSINT_FEEDS_TEST_FILES
    Tests/GlobeOsintFeedsTest.cpp
)

# ---- Runtime Gem target ----
ly_add_target(
    NAME GlobeOsintFeeds.Static STATIC
    NAMESPACE Gem
    FILES_CMAKE
        globeosintfeeds_files.cmake
    INCLUDE_DIRECTORIES
        PUBLIC
            Include
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PUBLIC
            AZ::AzCore
            AZ::AzFramework
            Gem::GlobeLayers.Static
)

ly_add_target(
    NAME GlobeOsintFeeds ${PAL_TRAIT_MONOLITHIC_DRIVEN_MODULE_TYPE}
    NAMESPACE Gem
    FILES_CMAKE
        globeosintfeeds_shared_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PRIVATE
            Gem::GlobeOsintFeeds.Static
)

# ---- Tests ----
if(PAL_TRAIT_BUILD_TESTS_SUPPORTED)
    ly_add_target(
        NAME GlobeOsintFeeds.Tests ${PAL_TRAIT_TEST_TARGET_TYPE}
        NAMESPACE Gem
        FILES_CMAKE
            globeosintfeeds_tests_files.cmake
        INCLUDE_DIRECTORIES
            PRIVATE
                Source
                Tests
        BUILD_DEPENDENCIES
            PRIVATE
                AZ::AzTest
                Gem::GlobeOsintFeeds.Static
    )
    ly_add_googletest(
        NAME Gem::GlobeOsintFeeds.Tests
    )
endif()
