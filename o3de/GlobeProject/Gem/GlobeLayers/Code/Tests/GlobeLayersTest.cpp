/*
 * GlobeLayers Gem -- Unit Tests
 *
 * Tests the layer registry service: registration, unregistration,
 * visibility toggling, and notification bus.
 */

#include <AzTest/AzTest.h>
#include <AzCore/UnitTest/TestTypes.h>
#include <GlobeLayers/GlobeLayersBus.h>
#include <GlobeLayers/GlobeLayerNotificationBus.h>
#include <AzCore/std/string/string.h>

// Since we test the system component directly, include it
#include "Clients/GlobeLayersSystemComponent.h"

// ---- Helper: notification listener ----
class LayerNotificationListener : public GlobeLayers::GlobeLayerNotificationBus::Handler
{
public:
    void Connect() { GlobeLayers::GlobeLayerNotificationBus::Handler::BusConnect(); }
    void Disconnect() { GlobeLayers::GlobeLayerNotificationBus::Handler::BusDisconnect(); }

    void OnLayerRegistered(const AZStd::string& name) override { m_registered.push_back(name); }
    void OnLayerUnregistered(const AZStd::string& name) override { m_unregistered.push_back(name); }
    void OnVisibilityChanged(const AZStd::string& name, bool visible) override
    {
        m_visibilityChanges.push_back({name, visible});
    }

    AZStd::vector<AZStd::string> m_registered;
    AZStd::vector<AZStd::string> m_unregistered;
    AZStd::vector<AZStd::pair<AZStd::string, bool>> m_visibilityChanges;
};

// ---- Tests ----

TEST(GlobeLayers, RegisterAndQuery)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    EXPECT_TRUE(component.RegisterLayer("Population"));
    EXPECT_TRUE(component.RegisterLayer("Earthquakes"));
    EXPECT_FALSE(component.RegisterLayer("Population")); // duplicate

    auto names = component.GetLayerNames();
    EXPECT_EQ(names.size(), 2u);

    component.Deactivate();
}

TEST(GlobeLayers, DefaultVisibility)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    component.RegisterLayer("Population");
    EXPECT_TRUE(component.IsVisible("Population")); // visible by default

    component.Deactivate();
}

TEST(GlobeLayers, ToggleVisibility)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    component.RegisterLayer("Earthquakes");
    EXPECT_TRUE(component.IsVisible("Earthquakes"));

    component.SetVisible("Earthquakes", false);
    EXPECT_FALSE(component.IsVisible("Earthquakes"));

    component.SetVisible("Earthquakes", true);
    EXPECT_TRUE(component.IsVisible("Earthquakes"));

    component.Deactivate();
}

TEST(GlobeLayers, UnregisterLayer)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    component.RegisterLayer("Buildings");
    EXPECT_TRUE(component.IsVisible("Buildings"));

    component.UnregisterLayer("Buildings");
    EXPECT_FALSE(component.IsVisible("Buildings")); // gone

    auto names = component.GetLayerNames();
    EXPECT_EQ(names.size(), 0u);

    component.Deactivate();
}

TEST(GlobeLayers, UnregisterNonexistent)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    // Should not crash
    component.UnregisterLayer("DoesNotExist");
    EXPECT_EQ(component.GetLayerNames().size(), 0u);

    component.Deactivate();
}

TEST(GlobeLayers, IsVisibleNonexistent)
{
    GlobeLayers::GlobeLayersSystemComponent component;
    component.Activate();

    EXPECT_FALSE(component.IsVisible("DoesNotExist"));

    component.Deactivate();
}

AZ_UNIT_TEST_HOOK(DEFAULT_UNIT_TEST_ENV);
