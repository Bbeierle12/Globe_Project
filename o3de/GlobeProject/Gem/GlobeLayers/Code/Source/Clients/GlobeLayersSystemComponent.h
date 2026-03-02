#pragma once

#include <AzCore/Component/Component.h>
#include <GlobeLayers/GlobeLayersBus.h>
#include <AzCore/std/containers/unordered_map.h>

namespace GlobeLayers
{
    /// System component that manages the layer registry.
    class GlobeLayersSystemComponent
        : public AZ::Component
        , protected GlobeLayerRequestBus::Handler
    {
    public:
        AZ_COMPONENT_DECL(GlobeLayersSystemComponent);

        static void Reflect(AZ::ReflectContext* context);
        static void GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided);
        static void GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible);
        static void GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required);
        static void GetDependentServices(AZ::ComponentDescriptor::DependencyArrayType& dependent);

        GlobeLayersSystemComponent();
        ~GlobeLayersSystemComponent() override;

    protected:
        // AZ::Component
        void Init() override;
        void Activate() override;
        void Deactivate() override;

        // GlobeLayerRequestBus
        bool RegisterLayer(const AZStd::string& layerName) override;
        void UnregisterLayer(const AZStd::string& layerName) override;
        void SetVisible(const AZStd::string& layerName, bool visible) override;
        bool IsVisible(const AZStd::string& layerName) const override;
        AZStd::vector<AZStd::string> GetLayerNames() const override;

    private:
        /// Map of layer name → visibility state.
        AZStd::unordered_map<AZStd::string, bool> m_layers;
    };
} // namespace GlobeLayers
