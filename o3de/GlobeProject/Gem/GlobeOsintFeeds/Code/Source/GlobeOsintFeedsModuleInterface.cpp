#include "GlobeOsintFeedsModuleInterface.h"
#include "Clients/GlobeOsintFeedsSystemComponent.h"
#include <GlobeOsintFeeds/GlobeOsintFeedsTypeIds.h>

#include <AzCore/Memory/Memory.h>

namespace GlobeOsintFeeds
{
    AZ_TYPE_INFO_WITH_NAME_IMPL(GlobeOsintFeedsModuleInterface,
        "GlobeOsintFeedsModuleInterface", GlobeOsintFeedsModuleTypeId);
    AZ_RTTI_NO_TYPE_INFO_IMPL(GlobeOsintFeedsModuleInterface, AZ::Module);
    AZ_CLASS_ALLOCATOR_IMPL(GlobeOsintFeedsModuleInterface, AZ::SystemAllocator);

    GlobeOsintFeedsModuleInterface::GlobeOsintFeedsModuleInterface()
    {
        m_descriptors.insert(m_descriptors.end(), {
            GlobeOsintFeedsSystemComponent::CreateDescriptor(),
        });
    }

    AZ::ComponentTypeList GlobeOsintFeedsModuleInterface::GetRequiredSystemComponents() const
    {
        return AZ::ComponentTypeList{
            azrtti_typeid<GlobeOsintFeedsSystemComponent>(),
        };
    }
} // namespace GlobeOsintFeeds
