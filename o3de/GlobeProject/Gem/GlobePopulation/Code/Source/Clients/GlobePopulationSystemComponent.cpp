#include "GlobePopulationSystemComponent.h"
#include <GlobePopulation/GlobePopulationTypeIds.h>

#include <AzCore/Serialization/SerializeContext.h>
#include <AzCore/IO/FileIO.h>

// Rust FFI functions
extern "C"
{
    int32_t globe_init(const char* json_ptr);
    void globe_shutdown();
    uint32_t globe_country_count();
    bool globe_get_country(uint32_t index, GlobeCountry* out);
    bool globe_get_subdivision(uint32_t country_index, uint32_t sub_index, GlobeSubdivision* out);
    uint32_t globe_search(const char* query_ptr, GlobeSearchResult* out, uint32_t max_results);
    char* globe_format_population(uint64_t population);
    char* globe_format_density(double density);
    char* globe_format_change(double pct);
    void globe_free_string(char* ptr);
    float globe_marker_size(uint64_t population, uint64_t max_population, float base, float range);
    GlobeColorRgb globe_population_color(double normalized);
}

// C structs matching the Rust #[repr(C)] types
struct GlobeCountry
{
    const char* name;
    uint64_t population;
    double lat;
    double lon;
    const char* iso;
    uint32_t subdivision_count;
    uint32_t index;
};

struct GlobeSubdivision
{
    const char* name;
    uint64_t population;
    double lat;
    double lon;
    double density;
    const char* region;
    const char* capital;
    double area_km2;
    double change_pct;
    double median_age;
    uint32_t country_index;
    uint32_t sub_index;
};

struct GlobeSearchResult
{
    uint32_t index;
    const char* name;
    uint64_t population;
};

struct GlobeColorRgb
{
    uint8_t r;
    uint8_t g;
    uint8_t b;
};

namespace GlobePopulation
{
    AZ_COMPONENT_IMPL(GlobePopulationSystemComponent,
        "GlobePopulationSystemComponent", GlobePopulationSystemComponentTypeId);

    void GlobePopulationSystemComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<GlobePopulationSystemComponent, AZ::Component>()
                ->Version(0);
        }
    }

    void GlobePopulationSystemComponent::GetProvidedServices(
        AZ::ComponentDescriptor::DependencyArrayType& provided)
    {
        provided.push_back(AZ_CRC_CE("GlobePopulationService"));
    }

    void GlobePopulationSystemComponent::GetIncompatibleServices(
        AZ::ComponentDescriptor::DependencyArrayType& incompatible)
    {
        incompatible.push_back(AZ_CRC_CE("GlobePopulationService"));
    }

    void GlobePopulationSystemComponent::GetRequiredServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& required)
    {
    }

    void GlobePopulationSystemComponent::GetDependentServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& dependent)
    {
    }

    GlobePopulationSystemComponent::GlobePopulationSystemComponent()
    {
        if (GlobePopulationInterface::Get() == nullptr)
        {
            GlobePopulationInterface::Register(this);
        }
    }

    GlobePopulationSystemComponent::~GlobePopulationSystemComponent()
    {
        if (GlobePopulationInterface::Get() == this)
        {
            GlobePopulationInterface::Unregister(this);
        }
    }

    void GlobePopulationSystemComponent::Init()
    {
    }

    void GlobePopulationSystemComponent::Activate()
    {
        GlobePopulationRequestBus::Handler::BusConnect();
        AZ::TickBus::Handler::BusConnect();

        // Load country data from the asset directory.
        // The JSON file should be placed in the project's Assets/ folder.
        // For now, try a known path. In production, use AZ::IO::FileIOBase.
        const char* dataPath = "@projectroot@/Assets/Data/countries.json";

        // Resolve the path using O3DE's file IO
        char resolvedPath[1024] = {};
        AZ::IO::FileIOBase* fileIO = AZ::IO::FileIOBase::GetInstance();
        if (fileIO && fileIO->ResolvePath(dataPath, resolvedPath, sizeof(resolvedPath)))
        {
            int32_t count = globe_init(resolvedPath);
            if (count > 0)
            {
                m_dataLoaded = true;
                AZ_Printf("GlobePopulation", "Loaded %d countries from Rust FFI\n", count);
            }
            else
            {
                AZ_Warning("GlobePopulation", false,
                    "Failed to load country data from %s", resolvedPath);
            }
        }
        else
        {
            AZ_Warning("GlobePopulation", false,
                "Could not resolve data path: %s", dataPath);
        }
    }

    void GlobePopulationSystemComponent::Deactivate()
    {
        AZ::TickBus::Handler::BusDisconnect();
        GlobePopulationRequestBus::Handler::BusDisconnect();

        if (m_dataLoaded)
        {
            globe_shutdown();
            m_dataLoaded = false;
        }
    }

    void GlobePopulationSystemComponent::OnTick(
        [[maybe_unused]] float deltaTime,
        [[maybe_unused]] AZ::ScriptTimePoint time)
    {
        // Future: auto-rotation, periodic earthquake updates, etc.
    }

    // ---- GlobePopulationRequestBus implementation ----

    uint32_t GlobePopulationSystemComponent::GetCountryCount() const
    {
        return globe_country_count();
    }

    AZStd::vector<CountryInfo> GlobePopulationSystemComponent::SearchCountries(
        const AZStd::string& query) const
    {
        constexpr uint32_t MaxResults = 200;
        GlobeSearchResult results[MaxResults];

        uint32_t count = globe_search(query.c_str(), results, MaxResults);

        AZStd::vector<CountryInfo> output;
        output.reserve(count);

        for (uint32_t i = 0; i < count; ++i)
        {
            CountryInfo info;
            info.name = results[i].name ? results[i].name : "";
            info.population = results[i].population;

            // Get full country details for lat/lon/iso
            GlobeCountry country = {};
            if (globe_get_country(results[i].index, &country))
            {
                info.iso = country.iso ? country.iso : "";
                info.lat = country.lat;
                info.lon = country.lon;
                info.subdivisionCount = country.subdivision_count;
            }

            output.push_back(AZStd::move(info));
        }

        return output;
    }

    AZStd::string GlobePopulationSystemComponent::FormatPopulation(uint64_t population) const
    {
        char* str = globe_format_population(population);
        AZStd::string result(str ? str : "");
        globe_free_string(str);
        return result;
    }

    float GlobePopulationSystemComponent::GetMarkerSize(
        uint64_t population, uint64_t maxPopulation) const
    {
        // Base size 6px, range 5px (same as browser app)
        return globe_marker_size(population, maxPopulation, 6.0f, 5.0f);
    }

    void GlobePopulationSystemComponent::GetPopulationColor(
        double normalized, uint8_t& r, uint8_t& g, uint8_t& b) const
    {
        GlobeColorRgb color = globe_population_color(normalized);
        r = color.r;
        g = color.g;
        b = color.b;
    }

} // namespace GlobePopulation
