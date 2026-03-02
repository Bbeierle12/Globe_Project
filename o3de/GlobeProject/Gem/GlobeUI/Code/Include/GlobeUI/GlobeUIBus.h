#pragma once

#include <GlobeUI/GlobeUITypeIds.h>
#include <AzCore/EBus/EBus.h>
#include <AzCore/Interface/Interface.h>

namespace GlobeUI
{
    /// Interface for controlling the Globe UI panels.
    class GlobeUIRequests
    {
    public:
        AZ_RTTI(GlobeUIRequests, "{A1B2C3D4-E5F6-7890-ABCD-EF1234580010}");
        virtual ~GlobeUIRequests() = default;

        /// Toggle the main UI visibility.
        virtual void SetUIVisible(bool visible) = 0;
        virtual bool IsUIVisible() const = 0;
    };

    class GlobeUIBusTraits : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Single;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;
    };

    using GlobeUIRequestBus = AZ::EBus<GlobeUIRequests, GlobeUIBusTraits>;
    using GlobeUIInterface = AZ::Interface<GlobeUIRequests>;

} // namespace GlobeUI
