#include "PopulationMarkerComponent.h"
#include <GlobePopulation/GlobePopulationTypeIds.h>

#include <AzCore/Serialization/SerializeContext.h>
#include <AzCore/Serialization/EditContext.h>
#include <AzCore/Component/TransformBus.h>

namespace GlobePopulation
{
    AZ_COMPONENT_IMPL(PopulationMarkerComponent,
        "PopulationMarkerComponent", PopulationMarkerComponentTypeId);

    PopulationMarkerComponent::PopulationMarkerComponent(
        const AZStd::string& name,
        uint64_t population,
        double lat,
        double lon,
        const AZStd::string& iso)
        : m_name(name)
        , m_population(population)
        , m_latitude(lat)
        , m_longitude(lon)
        , m_iso(iso)
    {
    }

    void PopulationMarkerComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<PopulationMarkerComponent, AZ::Component>()
                ->Version(1)
                ->Field("Name", &PopulationMarkerComponent::m_name)
                ->Field("Population", &PopulationMarkerComponent::m_population)
                ->Field("Latitude", &PopulationMarkerComponent::m_latitude)
                ->Field("Longitude", &PopulationMarkerComponent::m_longitude)
                ->Field("ISO", &PopulationMarkerComponent::m_iso);

            if (auto editContext = serializeContext->GetEditContext())
            {
                editContext->Class<PopulationMarkerComponent>(
                    "Population Marker", "Marks a country or subdivision on the globe")
                    ->ClassElement(AZ::Edit::ClassElements::EditorData, "")
                        ->Attribute(AZ::Edit::Attributes::Category, "Globe")
                    ->DataElement(AZ::Edit::UIHandlers::Default, &PopulationMarkerComponent::m_name, "Name", "")
                    ->DataElement(AZ::Edit::UIHandlers::Default, &PopulationMarkerComponent::m_population, "Population", "")
                    ->DataElement(AZ::Edit::UIHandlers::Default, &PopulationMarkerComponent::m_latitude, "Latitude", "")
                    ->DataElement(AZ::Edit::UIHandlers::Default, &PopulationMarkerComponent::m_longitude, "Longitude", "")
                    ->DataElement(AZ::Edit::UIHandlers::Default, &PopulationMarkerComponent::m_iso, "ISO Code", "");
            }
        }
    }

    void PopulationMarkerComponent::Init()
    {
    }

    void PopulationMarkerComponent::Activate()
    {
        // Position will be set by the Cesium georeference system.
        // Cesium for O3DE converts lat/lon to O3DE world coordinates.
    }

    void PopulationMarkerComponent::Deactivate()
    {
    }

} // namespace GlobePopulation
