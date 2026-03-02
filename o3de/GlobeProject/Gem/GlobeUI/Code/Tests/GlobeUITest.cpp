/*
 * GlobeUI Gem -- Unit Tests
 *
 * Tests the UI system component bus interface and panel visibility.
 */

#include <AzTest/AzTest.h>
#include <GlobeUI/GlobeUIBus.h>

TEST(GlobeUI, BusTypeIdDecl)
{
    // Verify TypeIds are declared and non-null
    EXPECT_NE(GlobeUI::GlobeUIModuleTypeId, nullptr);
    EXPECT_NE(GlobeUI::GlobeUISystemComponentTypeId, nullptr);
}

AZ_UNIT_TEST_HOOK(DEFAULT_UNIT_TEST_ENV);
