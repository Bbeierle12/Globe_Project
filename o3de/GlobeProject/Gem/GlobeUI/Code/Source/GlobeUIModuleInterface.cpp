#include "GlobeUIModuleInterface.h"
#include "Clients/GlobeUISystemComponent.h"
#include <GlobeUI/GlobeUITypeIds.h>

#include <AzCore/Memory/Memory.h>

namespace GlobeUI
{
    AZ_TYPE_INFO_WITH_NAME_IMPL(GlobeUIModuleInterface,
        "GlobeUIModuleInterface", GlobeUIModuleTypeId);
    AZ_RTTI_NO_TYPE_INFO_IMPL(GlobeUIModuleInterface, AZ::Module);
    AZ_CLASS_ALLOCATOR_IMPL(GlobeUIModuleInterface, AZ::SystemAllocator);

    GlobeUIModuleInterface::GlobeUIModuleInterface()
    {
        m_descriptors.insert(m_descriptors.end(), {
            GlobeUISystemComponent::CreateDescriptor(),
        });
    }

    AZ::ComponentTypeList GlobeUIModuleInterface::GetRequiredSystemComponents() const
    {
        return AZ::ComponentTypeList{
            azrtti_typeid<GlobeUISystemComponent>(),
        };
    }
} // namespace GlobeUI
