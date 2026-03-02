#include <GlobeUI/GlobeUITypeIds.h>
#include "../GlobeUIModuleInterface.h"

namespace GlobeUI
{
    class GlobeUIModule : public GlobeUIModuleInterface
    {
    public:
        AZ_RTTI(GlobeUIModule, GlobeUIModuleTypeId, GlobeUIModuleInterface);
        AZ_CLASS_ALLOCATOR(GlobeUIModule, AZ::SystemAllocator);
    };
} // namespace GlobeUI

#if defined(O3DE_GEM_NAME)
AZ_DECLARE_MODULE_CLASS(AZ_JOIN(Gem_, O3DE_GEM_NAME), GlobeUI::GlobeUIModule)
#else
AZ_DECLARE_MODULE_CLASS(Gem_GlobeUI, GlobeUI::GlobeUIModule)
#endif
