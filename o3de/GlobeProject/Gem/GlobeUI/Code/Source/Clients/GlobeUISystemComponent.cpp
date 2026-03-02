#include "GlobeUISystemComponent.h"
#include <GlobeUI/GlobeUITypeIds.h>

#include <AzCore/Serialization/SerializeContext.h>
#include <GlobePopulation/GlobePopulationBus.h>
#include <GlobeLayers/GlobeLayersBus.h>

#include <imgui/imgui.h>

namespace GlobeUI
{
    AZ_COMPONENT_IMPL(GlobeUISystemComponent,
        "GlobeUISystemComponent", GlobeUISystemComponentTypeId);

    void GlobeUISystemComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<GlobeUISystemComponent, AZ::Component>()
                ->Version(0);
        }
    }

    void GlobeUISystemComponent::GetProvidedServices(
        AZ::ComponentDescriptor::DependencyArrayType& provided)
    {
        provided.push_back(AZ_CRC_CE("GlobeUIService"));
    }

    void GlobeUISystemComponent::GetIncompatibleServices(
        AZ::ComponentDescriptor::DependencyArrayType& incompatible)
    {
        incompatible.push_back(AZ_CRC_CE("GlobeUIService"));
    }

    void GlobeUISystemComponent::GetRequiredServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& required)
    {
        required.push_back(AZ_CRC_CE("GlobePopulationService"));
        required.push_back(AZ_CRC_CE("GlobeLayersService"));
        required.push_back(AZ_CRC_CE("ImGuiService"));
    }

    void GlobeUISystemComponent::GetDependentServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& dependent)
    {
    }

    GlobeUISystemComponent::GlobeUISystemComponent()
    {
        if (GlobeUIInterface::Get() == nullptr)
        {
            GlobeUIInterface::Register(this);
        }
    }

    GlobeUISystemComponent::~GlobeUISystemComponent()
    {
        if (GlobeUIInterface::Get() == this)
        {
            GlobeUIInterface::Unregister(this);
        }
    }

    void GlobeUISystemComponent::Init()
    {
    }

    void GlobeUISystemComponent::Activate()
    {
        GlobeUIRequestBus::Handler::BusConnect();
        ImGui::ImGuiUpdateListenerBus::Handler::BusConnect();
        AZ_Printf("GlobeUI", "Globe UI system component activated\n");
    }

    void GlobeUISystemComponent::Deactivate()
    {
        ImGui::ImGuiUpdateListenerBus::Handler::BusDisconnect();
        GlobeUIRequestBus::Handler::BusDisconnect();
    }

    // ---- GlobeUIRequestBus ----

    void GlobeUISystemComponent::SetUIVisible(bool visible)
    {
        m_uiVisible = visible;
    }

    bool GlobeUISystemComponent::IsUIVisible() const
    {
        return m_uiVisible;
    }

    // ---- ImGui rendering ----

    void GlobeUISystemComponent::OnImGuiUpdate()
    {
        if (!m_uiVisible)
        {
            return;
        }

        DrawSearchPanel();
        DrawDetailPanel();
        DrawLayerPanel();
        DrawIonStatusPanel();
    }

    void GlobeUISystemComponent::DrawSearchPanel()
    {
        if (ImGui::Begin("Country Search"))
        {
            ImGui::InputText("Search", m_searchBuffer, sizeof(m_searchBuffer));

            AZStd::vector<GlobePopulation::CountryInfo> results;
            GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                results,
                &GlobePopulation::GlobePopulationRequests::SearchCountries,
                AZStd::string(m_searchBuffer));

            if (ImGui::BeginChild("Results", ImVec2(0, 300), true))
            {
                for (size_t i = 0; i < results.size(); ++i)
                {
                    const auto& info = results[i];
                    AZStd::string popStr;
                    GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                        popStr,
                        &GlobePopulation::GlobePopulationRequests::FormatPopulation,
                        info.population);

                    char label[256];
                    azsnprintf(label, sizeof(label), "%s (%s) - %s",
                        info.name.c_str(), info.iso.c_str(), popStr.c_str());

                    if (ImGui::Selectable(label, m_selectedCountryIndex == static_cast<int>(i)))
                    {
                        m_selectedCountryIndex = static_cast<int>(i);
                        m_selectedSubIndex = -1;
                    }
                }
            }
            ImGui::EndChild();

            uint32_t count = 0;
            GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                count, &GlobePopulation::GlobePopulationRequests::GetCountryCount);
            ImGui::Text("Total countries: %u", count);
        }
        ImGui::End();
    }

    void GlobeUISystemComponent::DrawDetailPanel()
    {
        if (m_selectedCountryIndex < 0)
        {
            return;
        }

        if (ImGui::Begin("Country Detail"))
        {
            AZStd::vector<GlobePopulation::CountryInfo> results;
            GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                results,
                &GlobePopulation::GlobePopulationRequests::SearchCountries,
                AZStd::string(m_searchBuffer));

            if (m_selectedCountryIndex < static_cast<int>(results.size()))
            {
                const auto& country = results[m_selectedCountryIndex];

                AZStd::string popStr;
                GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                    popStr,
                    &GlobePopulation::GlobePopulationRequests::FormatPopulation,
                    country.population);

                ImGui::Text("Name: %s", country.name.c_str());
                ImGui::Text("ISO:  %s", country.iso.c_str());
                ImGui::Text("Population: %s", popStr.c_str());
                ImGui::Text("Location: %.2f, %.2f", country.lat, country.lon);
                ImGui::Text("Subdivisions: %u", country.subdivisionCount);

                ImGui::Separator();

                // Show subdivisions
                for (uint32_t s = 0; s < country.subdivisionCount; ++s)
                {
                    GlobePopulation::SubdivisionInfo sub;
                    GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                        sub,
                        &GlobePopulation::GlobePopulationRequests::GetSubdivision,
                        static_cast<uint32_t>(m_selectedCountryIndex), s);

                    AZStd::string densStr;
                    GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                        densStr,
                        &GlobePopulation::GlobePopulationRequests::FormatDensity,
                        sub.density);

                    AZStd::string changeStr;
                    GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                        changeStr,
                        &GlobePopulation::GlobePopulationRequests::FormatChange,
                        sub.change_pct);

                    if (ImGui::TreeNode(sub.name.c_str()))
                    {
                        AZStd::string subPopStr;
                        GlobePopulation::GlobePopulationRequestBus::BroadcastResult(
                            subPopStr,
                            &GlobePopulation::GlobePopulationRequests::FormatPopulation,
                            sub.population);

                        ImGui::Text("Population: %s", subPopStr.c_str());
                        ImGui::Text("Density: %s", densStr.c_str());
                        ImGui::Text("Capital: %s", sub.capital.c_str());
                        ImGui::Text("Region: %s", sub.region.c_str());
                        ImGui::Text("Area: %.0f km²", sub.area_km2);
                        ImGui::Text("Change: %s", changeStr.c_str());
                        ImGui::Text("Median Age: %.1f", sub.median_age);
                        ImGui::TreePop();
                    }
                }
            }
        }
        ImGui::End();
    }

    void GlobeUISystemComponent::DrawLayerPanel()
    {
        if (ImGui::Begin("Layer Toggles"))
        {
            AZStd::vector<AZStd::string> layers;
            GlobeLayers::GlobeLayerRequestBus::BroadcastResult(
                layers,
                &GlobeLayers::GlobeLayerRequests::GetLayerNames);

            for (const auto& name : layers)
            {
                bool visible = false;
                GlobeLayers::GlobeLayerRequestBus::BroadcastResult(
                    visible,
                    &GlobeLayers::GlobeLayerRequests::IsVisible,
                    name);

                if (ImGui::Checkbox(name.c_str(), &visible))
                {
                    GlobeLayers::GlobeLayerRequestBus::Broadcast(
                        &GlobeLayers::GlobeLayerRequests::SetVisible,
                        name, visible);
                }
            }

            if (layers.empty())
            {
                ImGui::TextDisabled("No layers registered");
            }
        }
        ImGui::End();
    }

    void GlobeUISystemComponent::DrawIonStatusPanel()
    {
        if (ImGui::Begin("Ion Status"))
        {
            ImGui::TextDisabled("Ion status panel — future implementation");
            ImGui::Text("Connect to Cesium Ion to view assets and terrain.");
        }
        ImGui::End();
    }

} // namespace GlobeUI
