#pragma once

#include <AzCore/Component/Component.h>
#include <AzCore/Component/TickBus.h>
#include <GlobePopulation/GlobePopulationBus.h>

// Forward-declare the Rust FFI C types
extern "C"
{
    struct GlobeCountry;
    struct GlobeSubdivision;
    struct GlobeSearchResult;
    struct GlobeColorRgb;
}

namespace GlobePopulation
{
    /// System component that manages the population data layer.
    /// Bridges the Rust FFI (globe_ffi) into O3DE's EBus system.
    class GlobePopulationSystemComponent
        : public AZ::Component
        , protected GlobePopulationRequestBus::Handler
        , public AZ::TickBus::Handler
    {
    public:
        AZ_COMPONENT_DECL(GlobePopulationSystemComponent);

        static void Reflect(AZ::ReflectContext* context);
        static void GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided);
        static void GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible);
        static void GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required);
        static void GetDependentServices(AZ::ComponentDescriptor::DependencyArrayType& dependent);

        GlobePopulationSystemComponent();
        ~GlobePopulationSystemComponent() override;

    protected:
        // AZ::Component
        void Init() override;
        void Activate() override;
        void Deactivate() override;

        // AZ::TickBus
        void OnTick(float deltaTime, AZ::ScriptTimePoint time) override;

        // GlobePopulationRequestBus
        uint32_t GetCountryCount() const override;
        AZStd::vector<CountryInfo> SearchCountries(const AZStd::string& query) const override;
        AZStd::string FormatPopulation(uint64_t population) const override;
        float GetMarkerSize(uint64_t population, uint64_t maxPopulation) const override;
        void GetPopulationColor(double normalized, uint8_t& r, uint8_t& g, uint8_t& b) const override;

    private:
        bool m_dataLoaded = false;
    };
} // namespace GlobePopulation
