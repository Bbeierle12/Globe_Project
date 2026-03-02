#pragma once

#include <AzCore/EBus/EBus.h>
#include <AzCore/std/string/string.h>

namespace GlobeLayers
{
    /// Notification bus for layer state changes.
    /// UI and other systems listen here to react to layer changes.
    class GlobeLayerNotifications : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Multiple;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;

        /// Called when a new layer is registered.
        virtual void OnLayerRegistered([[maybe_unused]] const AZStd::string& layerName) {}

        /// Called when a layer is unregistered.
        virtual void OnLayerUnregistered([[maybe_unused]] const AZStd::string& layerName) {}

        /// Called when layer visibility changes.
        virtual void OnVisibilityChanged(
            [[maybe_unused]] const AZStd::string& layerName,
            [[maybe_unused]] bool visible) {}
    };

    using GlobeLayerNotificationBus = AZ::EBus<GlobeLayerNotifications>;

} // namespace GlobeLayers
