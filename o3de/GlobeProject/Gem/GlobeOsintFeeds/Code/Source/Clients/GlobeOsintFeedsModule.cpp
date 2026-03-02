#include <GlobeOsintFeeds/GlobeOsintFeedsTypeIds.h>
#include "../GlobeOsintFeedsModuleInterface.h"

namespace GlobeOsintFeeds
{
    class GlobeOsintFeedsModule : public GlobeOsintFeedsModuleInterface
    {
    public:
        AZ_RTTI(GlobeOsintFeedsModule, GlobeOsintFeedsModuleTypeId, GlobeOsintFeedsModuleInterface);
        AZ_CLASS_ALLOCATOR(GlobeOsintFeedsModule, AZ::SystemAllocator);
    };
} // namespace GlobeOsintFeeds

#if defined(O3DE_GEM_NAME)
AZ_DECLARE_MODULE_CLASS(AZ_JOIN(Gem_, O3DE_GEM_NAME), GlobeOsintFeeds::GlobeOsintFeedsModule)
#else
AZ_DECLARE_MODULE_CLASS(Gem_GlobeOsintFeeds, GlobeOsintFeeds::GlobeOsintFeedsModule)
#endif
