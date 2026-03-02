#pragma once

#include <GlobePopulation/GlobePopulationTypeIds.h>
#include <AzCore/EBus/EBus.h>
#include <AzCore/Interface/Interface.h>
#include <AzCore/Math/Vector3.h>
#include <AzCore/std/string/string.h>
#include <AzCore/std/containers/vector.h>

namespace GlobePopulation
{
    /// Summary of a country returned by search.
    struct CountryInfo
    {
        AZStd::string name;
        AZStd::string iso;
        uint64_t population = 0;
        double lat = 0.0;
        double lon = 0.0;
        uint32_t subdivisionCount = 0;
    };

    /// Subdivision detail for a specific country subdivision.
    struct SubdivisionInfo
    {
        AZStd::string name;
        uint64_t population{};
        double lat{}, lon{};
        double density{};
        AZStd::string region;
        AZStd::string capital;
        double area_km2{};
        double change_pct{};
        double median_age{};
    };

    /// Interface for the GlobePopulation system component.
    /// Accessed via EBus or AZ::Interface.
    class GlobePopulationRequests
    {
    public:
        AZ_RTTI(GlobePopulationRequests, "{D4E5F6A7-B8C9-0123-DEF0-234567890123}");
        virtual ~GlobePopulationRequests() = default;

        /// Get total number of loaded countries.
        virtual uint32_t GetCountryCount() const = 0;

        /// Search countries by query string, returns matching results.
        virtual AZStd::vector<CountryInfo> SearchCountries(const AZStd::string& query) const = 0;

        /// Get a formatted population string (e.g. "1.48B").
        virtual AZStd::string FormatPopulation(uint64_t population) const = 0;

        /// Get marker pixel size for a given population.
        virtual float GetMarkerSize(uint64_t population, uint64_t maxPopulation) const = 0;

        /// Get population color as RGB (0-255) for a normalized value (0.0-1.0).
        virtual void GetPopulationColor(double normalized, uint8_t& r, uint8_t& g, uint8_t& b) const = 0;

        /// Get subdivision detail for a given country and subdivision index.
        virtual SubdivisionInfo GetSubdivision(uint32_t countryIndex, uint32_t subIndex) const = 0;

        /// Format a density value (e.g. "2126/km²").
        virtual AZStd::string FormatDensity(double density) const = 0;

        /// Format a percent change (e.g. "+6.2%").
        virtual AZStd::string FormatChange(double pct) const = 0;
    };

    class GlobePopulationBusTraits : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Single;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;
    };

    using GlobePopulationRequestBus = AZ::EBus<GlobePopulationRequests, GlobePopulationBusTraits>;
    using GlobePopulationInterface = AZ::Interface<GlobePopulationRequests>;

} // namespace GlobePopulation
