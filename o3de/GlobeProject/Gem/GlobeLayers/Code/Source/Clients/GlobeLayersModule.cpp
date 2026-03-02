#include <GlobeLayers/GlobeLayersTypeIds.h>
#include "../GlobeLayersModuleInterface.h"

namespace GlobeLayers
{
    class GlobeLayersModule : public GlobeLayersModuleInterface
    {
    public:
        AZ_RTTI(GlobeLayersModule, GlobeLayersModuleTypeId, GlobeLayersModuleInterface);
        AZ_CLASS_ALLOCATOR(GlobeLayersModule, AZ::SystemAllocator);
    };
} // namespace GlobeLayers

#if defined(O3DE_GEM_NAME)
AZ_DECLARE_MODULE_CLASS(AZ_JOIN(Gem_, O3DE_GEM_NAME), GlobeLayers::GlobeLayersModule)
#else
AZ_DECLARE_MODULE_CLASS(Gem_GlobeLayers, GlobeLayers::GlobeLayersModule)
#endif
