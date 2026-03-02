#include "GlobeLayersModuleInterface.h"
#include "Clients/GlobeLayersSystemComponent.h"
#include <GlobeLayers/GlobeLayersTypeIds.h>

#include <AzCore/Memory/Memory.h>

namespace GlobeLayers
{
    AZ_TYPE_INFO_WITH_NAME_IMPL(GlobeLayersModuleInterface,
        "GlobeLayersModuleInterface", GlobeLayersModuleTypeId);
    AZ_RTTI_NO_TYPE_INFO_IMPL(GlobeLayersModuleInterface, AZ::Module);
    AZ_CLASS_ALLOCATOR_IMPL(GlobeLayersModuleInterface, AZ::SystemAllocator);

    GlobeLayersModuleInterface::GlobeLayersModuleInterface()
    {
        m_descriptors.insert(m_descriptors.end(), {
            GlobeLayersSystemComponent::CreateDescriptor(),
        });
    }

    AZ::ComponentTypeList GlobeLayersModuleInterface::GetRequiredSystemComponents() const
    {
        return AZ::ComponentTypeList{
            azrtti_typeid<GlobeLayersSystemComponent>(),
        };
    }
} // namespace GlobeLayers
