#include <GlobePopulation/GlobePopulationTypeIds.h>
#include "../GlobePopulationModuleInterface.h"

namespace GlobePopulation
{
    class GlobePopulationModule : public GlobePopulationModuleInterface
    {
    public:
        AZ_RTTI(GlobePopulationModule, GlobePopulationModuleTypeId, GlobePopulationModuleInterface);
        AZ_CLASS_ALLOCATOR(GlobePopulationModule, AZ::SystemAllocator);
    };
} // namespace GlobePopulation

#if defined(O3DE_GEM_NAME)
AZ_DECLARE_MODULE_CLASS(AZ_JOIN(Gem_, O3DE_GEM_NAME), GlobePopulation::GlobePopulationModule)
#else
AZ_DECLARE_MODULE_CLASS(Gem_GlobePopulation, GlobePopulation::GlobePopulationModule)
#endif
