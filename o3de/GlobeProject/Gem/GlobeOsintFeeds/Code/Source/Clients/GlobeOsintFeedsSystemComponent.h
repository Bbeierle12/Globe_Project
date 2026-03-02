#pragma once

#include <AzCore/Component/Component.h>
#include <AzCore/Component/TickBus.h>
#include <GlobeOsintFeeds/GlobeOsintFeedsBus.h>
#include <AzCore/std/containers/vector.h>

namespace GlobeOsintFeeds
{
    /// Earthquake feed configuration — mirrors src/config/earthquakeConfig.js
    struct EarthquakeFeedConfig
    {
        AZStd::string feedUrl =
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";
        float refreshIntervalMs = 300000.0f; // 5 minutes
        double magnitudeThresholdLow = 4.5;
        double magnitudeThresholdHigh = 6.5;
        float markerSizeLow = 6.0f;
        float markerSizeMedium = 10.0f;
        float markerSizeHigh = 16.0f;
    };

    /// System component for OSINT data feeds.
    /// On Activate, registers an "Earthquakes" layer via GlobeLayerRequestBus,
    /// then periodically fetches USGS data using AzFramework HTTP.
    class GlobeOsintFeedsSystemComponent
        : public AZ::Component
        , protected GlobeOsintFeedRequestBus::Handler
        , public AZ::TickBus::Handler
    {
    public:
        AZ_COMPONENT_DECL(GlobeOsintFeedsSystemComponent);

        static void Reflect(AZ::ReflectContext* context);
        static void GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided);
        static void GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible);
        static void GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required);
        static void GetDependentServices(AZ::ComponentDescriptor::DependencyArrayType& dependent);

        GlobeOsintFeedsSystemComponent();
        ~GlobeOsintFeedsSystemComponent() override;

    protected:
        // AZ::Component
        void Init() override;
        void Activate() override;
        void Deactivate() override;

        // AZ::TickBus
        void OnTick(float deltaTime, AZ::ScriptTimePoint time) override;

        // GlobeOsintFeedRequestBus
        AZStd::vector<EarthquakeEvent> GetEarthquakes() const override;
        void RefreshEarthquakes() override;
        AZStd::string GetFeedUrl() const override;

    private:
        void ParseGeoJson(const AZStd::string& json);

        EarthquakeFeedConfig m_config;
        AZStd::vector<EarthquakeEvent> m_earthquakes;
        float m_timeSinceRefreshMs = 0.0f;
        bool m_pendingRefresh = false;
    };
} // namespace GlobeOsintFeeds
