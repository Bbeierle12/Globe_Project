#pragma once

#include <AzCore/Memory/Memory_fwd.h>
#include <AzCore/Module/Module.h>
#include <AzCore/RTTI/RTTIMacros.h>
#include <AzCore/RTTI/TypeInfoSimple.h>

namespace GlobeOsintFeeds
{
    class GlobeOsintFeedsModuleInterface : public AZ::Module
    {
    public:
        AZ_TYPE_INFO_WITH_NAME_DECL(GlobeOsintFeedsModuleInterface)
        AZ_RTTI_NO_TYPE_INFO_DECL()
        AZ_CLASS_ALLOCATOR_DECL

        GlobeOsintFeedsModuleInterface();

        AZ::ComponentTypeList GetRequiredSystemComponents() const override;
    };
} // namespace GlobeOsintFeeds
