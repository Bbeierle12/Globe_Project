#include "GlobeOsintFeedsSystemComponent.h"
#include <GlobeOsintFeeds/GlobeOsintFeedsTypeIds.h>
#include <GlobeLayers/GlobeLayersBus.h>

#include <AzCore/Serialization/SerializeContext.h>
#include <AzCore/JSON/document.h>
#include <AzCore/JSON/error/en.h>

namespace GlobeOsintFeeds
{
    AZ_COMPONENT_IMPL(GlobeOsintFeedsSystemComponent,
        "GlobeOsintFeedsSystemComponent", GlobeOsintFeedsSystemComponentTypeId);

    void GlobeOsintFeedsSystemComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<GlobeOsintFeedsSystemComponent, AZ::Component>()
                ->Version(0);
        }
    }

    void GlobeOsintFeedsSystemComponent::GetProvidedServices(
        AZ::ComponentDescriptor::DependencyArrayType& provided)
    {
        provided.push_back(AZ_CRC_CE("GlobeOsintFeedsService"));
    }

    void GlobeOsintFeedsSystemComponent::GetIncompatibleServices(
        AZ::ComponentDescriptor::DependencyArrayType& incompatible)
    {
        incompatible.push_back(AZ_CRC_CE("GlobeOsintFeedsService"));
    }

    void GlobeOsintFeedsSystemComponent::GetRequiredServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& required)
    {
        // Depends on GlobeLayers for layer registration
        required.push_back(AZ_CRC_CE("GlobeLayersService"));
    }

    void GlobeOsintFeedsSystemComponent::GetDependentServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& dependent)
    {
    }

    GlobeOsintFeedsSystemComponent::GlobeOsintFeedsSystemComponent()
    {
        if (GlobeOsintFeedInterface::Get() == nullptr)
        {
            GlobeOsintFeedInterface::Register(this);
        }
    }

    GlobeOsintFeedsSystemComponent::~GlobeOsintFeedsSystemComponent()
    {
        if (GlobeOsintFeedInterface::Get() == this)
        {
            GlobeOsintFeedInterface::Unregister(this);
        }
    }

    void GlobeOsintFeedsSystemComponent::Init()
    {
    }

    void GlobeOsintFeedsSystemComponent::Activate()
    {
        GlobeOsintFeedRequestBus::Handler::BusConnect();
        AZ::TickBus::Handler::BusConnect();

        // Register our layers with the GlobeLayers service
        GlobeLayers::GlobeLayerRequestBus::Broadcast(
            &GlobeLayers::GlobeLayerRequests::RegisterLayer, AZStd::string("Earthquakes"));

        AZ_Printf("GlobeOsintFeeds", "OSINT Feeds system component activated\n");

        // Trigger initial fetch
        m_pendingRefresh = true;
    }

    void GlobeOsintFeedsSystemComponent::Deactivate()
    {
        AZ::TickBus::Handler::BusDisconnect();
        GlobeOsintFeedRequestBus::Handler::BusDisconnect();

        // Unregister layers
        GlobeLayers::GlobeLayerRequestBus::Broadcast(
            &GlobeLayers::GlobeLayerRequests::UnregisterLayer, AZStd::string("Earthquakes"));

        m_earthquakes.clear();
    }

    void GlobeOsintFeedsSystemComponent::OnTick(
        float deltaTime,
        [[maybe_unused]] AZ::ScriptTimePoint time)
    {
        m_timeSinceRefreshMs += deltaTime * 1000.0f;

        if (m_pendingRefresh || m_timeSinceRefreshMs >= m_config.refreshIntervalMs)
        {
            m_timeSinceRefreshMs = 0.0f;
            m_pendingRefresh = false;

            // In production, use AzFramework::HttpRequestor for async HTTP.
            // For now, log a placeholder. The HTTP integration will be wired up
            // once AzFramework::HttpRequestor is available in the build.
            AZ_Printf("GlobeOsintFeeds", "Would fetch earthquake data from: %s\n",
                m_config.feedUrl.c_str());
        }
    }

    // ---- GlobeOsintFeedRequestBus implementation ----

    AZStd::vector<EarthquakeEvent> GlobeOsintFeedsSystemComponent::GetEarthquakes() const
    {
        return m_earthquakes;
    }

    void GlobeOsintFeedsSystemComponent::RefreshEarthquakes()
    {
        m_pendingRefresh = true;
    }

    AZStd::string GlobeOsintFeedsSystemComponent::GetFeedUrl() const
    {
        return m_config.feedUrl;
    }

    void GlobeOsintFeedsSystemComponent::ParseGeoJson(const AZStd::string& json)
    {
        rapidjson::Document doc;
        doc.Parse(json.c_str());

        if (doc.HasParseError() || !doc.IsObject())
        {
            AZ_Warning("GlobeOsintFeeds", false, "Failed to parse earthquake GeoJSON");
            return;
        }

        m_earthquakes.clear();

        if (!doc.HasMember("features") || !doc["features"].IsArray())
        {
            return;
        }

        const auto& features = doc["features"].GetArray();
        m_earthquakes.reserve(features.Size());

        for (const auto& feature : features)
        {
            if (!feature.IsObject() || !feature.HasMember("properties") || !feature.HasMember("geometry"))
            {
                continue;
            }

            const auto& props = feature["properties"];
            const auto& geom = feature["geometry"];

            EarthquakeEvent event;

            if (feature.HasMember("id") && feature["id"].IsString())
            {
                event.id = feature["id"].GetString();
            }

            if (props.HasMember("title") && props["title"].IsString())
            {
                event.title = props["title"].GetString();
            }

            if (props.HasMember("mag") && props["mag"].IsNumber())
            {
                event.magnitude = props["mag"].GetDouble();
            }

            if (props.HasMember("time") && props["time"].IsUint64())
            {
                event.timestamp = props["time"].GetUint64();
            }

            if (geom.HasMember("coordinates") && geom["coordinates"].IsArray())
            {
                const auto& coords = geom["coordinates"].GetArray();
                if (coords.Size() >= 2)
                {
                    event.lon = coords[0].GetDouble();
                    event.lat = coords[1].GetDouble();
                    if (coords.Size() >= 3)
                    {
                        event.depth = coords[2].GetDouble();
                    }
                }
            }

            m_earthquakes.push_back(AZStd::move(event));
        }

        AZ_Printf("GlobeOsintFeeds", "Parsed %zu earthquake events\n", m_earthquakes.size());
    }

} // namespace GlobeOsintFeeds
