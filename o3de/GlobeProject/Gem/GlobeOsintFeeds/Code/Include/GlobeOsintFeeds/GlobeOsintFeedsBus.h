#pragma once

#include <GlobeOsintFeeds/GlobeOsintFeedsTypeIds.h>
#include <AzCore/EBus/EBus.h>
#include <AzCore/Interface/Interface.h>
#include <AzCore/std/string/string.h>
#include <AzCore/std/containers/vector.h>

namespace GlobeOsintFeeds
{
    /// Earthquake event data.
    struct EarthquakeEvent
    {
        AZStd::string id;
        AZStd::string title;
        double magnitude = 0.0;
        double lat = 0.0;
        double lon = 0.0;
        double depth = 0.0;
        uint64_t timestamp = 0; // Unix ms
    };

    /// Interface for the GlobeOsintFeeds system component.
    class GlobeOsintFeedRequests
    {
    public:
        AZ_RTTI(GlobeOsintFeedRequests, "{F1A2B3C4-D5E6-7890-ABCD-EF1234570010}");
        virtual ~GlobeOsintFeedRequests() = default;

        /// Get all currently loaded earthquake events.
        virtual AZStd::vector<EarthquakeEvent> GetEarthquakes() const = 0;

        /// Force an immediate refresh of earthquake data.
        virtual void RefreshEarthquakes() = 0;

        /// Get the feed URL.
        virtual AZStd::string GetFeedUrl() const = 0;
    };

    class GlobeOsintFeedBusTraits : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Single;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;
    };

    using GlobeOsintFeedRequestBus = AZ::EBus<GlobeOsintFeedRequests, GlobeOsintFeedBusTraits>;
    using GlobeOsintFeedInterface = AZ::Interface<GlobeOsintFeedRequests>;

} // namespace GlobeOsintFeeds
