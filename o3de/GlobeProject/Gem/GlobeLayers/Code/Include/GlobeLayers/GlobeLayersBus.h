#pragma once

#include <GlobeLayers/GlobeLayersTypeIds.h>
#include <AzCore/EBus/EBus.h>
#include <AzCore/Interface/Interface.h>
#include <AzCore/std/string/string.h>
#include <AzCore/std/containers/vector.h>

namespace GlobeLayers
{
    /// Interface for the GlobeLayers system component.
    /// Data Gems register their layers here; UI queries and toggles through this bus.
    class GlobeLayerRequests
    {
    public:
        AZ_RTTI(GlobeLayerRequests, "{E1F2A3B4-C5D6-7890-ABCD-EF1234560010}");
        virtual ~GlobeLayerRequests() = default;

        /// Register a named layer. Returns true if newly registered.
        virtual bool RegisterLayer(const AZStd::string& layerName) = 0;

        /// Unregister a named layer.
        virtual void UnregisterLayer(const AZStd::string& layerName) = 0;

        /// Set layer visibility.
        virtual void SetVisible(const AZStd::string& layerName, bool visible) = 0;

        /// Query layer visibility.
        virtual bool IsVisible(const AZStd::string& layerName) const = 0;

        /// Get the list of all registered layer names.
        virtual AZStd::vector<AZStd::string> GetLayerNames() const = 0;
    };

    class GlobeLayerBusTraits : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Single;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;
    };

    using GlobeLayerRequestBus = AZ::EBus<GlobeLayerRequests, GlobeLayerBusTraits>;
    using GlobeLayerInterface = AZ::Interface<GlobeLayerRequests>;

} // namespace GlobeLayers
