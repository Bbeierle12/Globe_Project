# GlobePopulation Gem - CMake build configuration
#
# This Gem bridges the Rust FFI data layer into O3DE system components.
# It provides population markers, search, and detail views for the globe.

# ---- Rust FFI static library ----
# Path to the Rust FFI crate (built separately via cargo build --release)
set(GLOBE_FFI_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../rust/globe_ffi")
set(GLOBE_FFI_INCLUDE "${GLOBE_FFI_DIR}/include")

if(WIN32)
    set(GLOBE_FFI_LIB "${GLOBE_FFI_DIR}/target/release/globe_ffi.lib")
else()
    set(GLOBE_FFI_LIB "${GLOBE_FFI_DIR}/target/release/libglobe_ffi.a")
endif()

# Custom command to build the Rust FFI library
add_custom_command(
    OUTPUT ${GLOBE_FFI_LIB}
    COMMAND cargo build --release --manifest-path "${GLOBE_FFI_DIR}/Cargo.toml"
    COMMENT "Building Rust FFI library (globe_ffi)"
    VERBATIM
)
add_custom_target(globe_ffi_build DEPENDS ${GLOBE_FFI_LIB})

# Import the static library
add_library(globe_ffi STATIC IMPORTED GLOBAL)
set_target_properties(globe_ffi PROPERTIES
    IMPORTED_LOCATION ${GLOBE_FFI_LIB}
    INTERFACE_INCLUDE_DIRECTORIES ${GLOBE_FFI_INCLUDE}
)
add_dependencies(globe_ffi globe_ffi_build)

# On Linux, Rust static libs need pthread and dl
if(UNIX AND NOT APPLE)
    set_property(TARGET globe_ffi APPEND PROPERTY
        INTERFACE_LINK_LIBRARIES pthread dl m)
endif()

# ---- Gem source files ----
set(GLOBE_POPULATION_API_FILES
    Include/GlobePopulation/GlobePopulationBus.h
    Include/GlobePopulation/GlobePopulationTypeIds.h
)

set(GLOBE_POPULATION_SOURCE_FILES
    Source/GlobePopulationModuleInterface.h
    Source/GlobePopulationModuleInterface.cpp
    Source/Clients/GlobePopulationModule.cpp
    Source/Clients/GlobePopulationSystemComponent.h
    Source/Clients/GlobePopulationSystemComponent.cpp
    Source/Clients/PopulationMarkerComponent.h
    Source/Clients/PopulationMarkerComponent.cpp
)

set(GLOBE_POPULATION_TEST_FILES
    Tests/GlobePopulationTest.cpp
)

# ---- Runtime Gem target ----
ly_add_target(
    NAME GlobePopulation.Static STATIC
    NAMESPACE Gem
    FILES_CMAKE
        globepopulation_files.cmake
    INCLUDE_DIRECTORIES
        PUBLIC
            Include
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PUBLIC
            AZ::AzCore
            AZ::AzFramework
            globe_ffi
)

ly_add_target(
    NAME GlobePopulation ${PAL_TRAIT_MONOLITHIC_DRIVEN_MODULE_TYPE}
    NAMESPACE Gem
    FILES_CMAKE
        globepopulation_shared_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
    BUILD_DEPENDENCIES
        PRIVATE
            Gem::GlobePopulation.Static
)

# ---- Tests ----
if(PAL_TRAIT_BUILD_TESTS_SUPPORTED)
    ly_add_target(
        NAME GlobePopulation.Tests ${PAL_TRAIT_TEST_TARGET_TYPE}
        NAMESPACE Gem
        FILES_CMAKE
            globepopulation_tests_files.cmake
        INCLUDE_DIRECTORIES
            PRIVATE
                Source
                Tests
        BUILD_DEPENDENCIES
            PRIVATE
                AZ::AzTest
                Gem::GlobePopulation.Static
    )
    ly_add_googletest(
        NAME Gem::GlobePopulation.Tests
        LABELS REQUIRES_tiledrenderer
    )
endif()
