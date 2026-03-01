#include "GlobePopulationModuleInterface.h"
#include "Clients/GlobePopulationSystemComponent.h"
#include <GlobePopulation/GlobePopulationTypeIds.h>

#include <AzCore/Memory/Memory.h>

namespace GlobePopulation
{
    AZ_TYPE_INFO_WITH_NAME_IMPL(GlobePopulationModuleInterface,
        "GlobePopulationModuleInterface", GlobePopulationModuleTypeId);
    AZ_RTTI_NO_TYPE_INFO_IMPL(GlobePopulationModuleInterface, AZ::Module);
    AZ_CLASS_ALLOCATOR_IMPL(GlobePopulationModuleInterface, AZ::SystemAllocator);

    GlobePopulationModuleInterface::GlobePopulationModuleInterface()
    {
        m_descriptors.insert(m_descriptors.end(), {
            GlobePopulationSystemComponent::CreateDescriptor(),
        });
    }

    AZ::ComponentTypeList GlobePopulationModuleInterface::GetRequiredSystemComponents() const
    {
        return AZ::ComponentTypeList{
            azrtti_typeid<GlobePopulationSystemComponent>(),
        };
    }
} // namespace GlobePopulation
