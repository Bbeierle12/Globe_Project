#pragma once

#include <AzCore/Component/Component.h>
#include <AzCore/Math/Vector3.h>
#include <AzCore/std/string/string.h>

namespace GlobePopulation
{
    /// Component attached to entities representing population markers on the globe.
    /// Each marker has a position (lat/lon converted to 3D), population, and display properties.
    class PopulationMarkerComponent : public AZ::Component
    {
    public:
        AZ_COMPONENT_DECL(PopulationMarkerComponent);

        static void Reflect(AZ::ReflectContext* context);

        PopulationMarkerComponent() = default;
        PopulationMarkerComponent(
            const AZStd::string& name,
            uint64_t population,
            double lat,
            double lon,
            const AZStd::string& iso);

        const AZStd::string& GetName() const { return m_name; }
        uint64_t GetPopulation() const { return m_population; }
        double GetLatitude() const { return m_latitude; }
        double GetLongitude() const { return m_longitude; }
        const AZStd::string& GetIso() const { return m_iso; }

    protected:
        void Init() override;
        void Activate() override;
        void Deactivate() override;

    private:
        AZStd::string m_name;
        uint64_t m_population = 0;
        double m_latitude = 0.0;
        double m_longitude = 0.0;
        AZStd::string m_iso;
    };
} // namespace GlobePopulation
