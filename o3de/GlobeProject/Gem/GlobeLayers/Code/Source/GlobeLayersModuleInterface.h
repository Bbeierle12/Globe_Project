#pragma once

#include <AzCore/Memory/Memory_fwd.h>
#include <AzCore/Module/Module.h>
#include <AzCore/RTTI/RTTIMacros.h>
#include <AzCore/RTTI/TypeInfoSimple.h>

namespace GlobeLayers
{
    class GlobeLayersModuleInterface : public AZ::Module
    {
    public:
        AZ_TYPE_INFO_WITH_NAME_DECL(GlobeLayersModuleInterface)
        AZ_RTTI_NO_TYPE_INFO_DECL()
        AZ_CLASS_ALLOCATOR_DECL

        GlobeLayersModuleInterface();

        AZ::ComponentTypeList GetRequiredSystemComponents() const override;
    };
} // namespace GlobeLayers
