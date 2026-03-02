#pragma once

#include <AzCore/Component/Component.h>
#include <GlobeUI/GlobeUIBus.h>
#include <ImGuiBus.h>

namespace GlobeUI
{
    /// System component that renders all Globe UI panels via ImGui.
    ///
    /// Panels:
    /// - Country search (GlobePopulationRequestBus::SearchCountries)
    /// - Country/subdivision detail
    /// - Layer toggles (GlobeLayerRequestBus)
    /// - Ion status (future)
    class GlobeUISystemComponent
        : public AZ::Component
        , protected GlobeUIRequestBus::Handler
        , public ImGui::ImGuiUpdateListenerBus::Handler
    {
    public:
        AZ_COMPONENT_DECL(GlobeUISystemComponent);

        static void Reflect(AZ::ReflectContext* context);
        static void GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided);
        static void GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible);
        static void GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required);
        static void GetDependentServices(AZ::ComponentDescriptor::DependencyArrayType& dependent);

        GlobeUISystemComponent();
        ~GlobeUISystemComponent() override;

    protected:
        // AZ::Component
        void Init() override;
        void Activate() override;
        void Deactivate() override;

        // GlobeUIRequestBus
        void SetUIVisible(bool visible) override;
        bool IsUIVisible() const override;

        // ImGui::ImGuiUpdateListenerBus
        void OnImGuiUpdate() override;

    private:
        void DrawSearchPanel();
        void DrawDetailPanel();
        void DrawLayerPanel();
        void DrawIonStatusPanel();

        bool m_uiVisible = true;

        // Search state
        char m_searchBuffer[256] = {};
        int m_selectedCountryIndex = -1;
        int m_selectedSubIndex = -1;
    };
} // namespace GlobeUI
