#include "GlobeLayersSystemComponent.h"
#include <GlobeLayers/GlobeLayersTypeIds.h>
#include <GlobeLayers/GlobeLayerNotificationBus.h>

#include <AzCore/Serialization/SerializeContext.h>

namespace GlobeLayers
{
    AZ_COMPONENT_IMPL(GlobeLayersSystemComponent,
        "GlobeLayersSystemComponent", GlobeLayersSystemComponentTypeId);

    void GlobeLayersSystemComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<GlobeLayersSystemComponent, AZ::Component>()
                ->Version(0);
        }
    }

    void GlobeLayersSystemComponent::GetProvidedServices(
        AZ::ComponentDescriptor::DependencyArrayType& provided)
    {
        provided.push_back(AZ_CRC_CE("GlobeLayersService"));
    }

    void GlobeLayersSystemComponent::GetIncompatibleServices(
        AZ::ComponentDescriptor::DependencyArrayType& incompatible)
    {
        incompatible.push_back(AZ_CRC_CE("GlobeLayersService"));
    }

    void GlobeLayersSystemComponent::GetRequiredServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& required)
    {
    }

    void GlobeLayersSystemComponent::GetDependentServices(
        [[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& dependent)
    {
    }

    GlobeLayersSystemComponent::GlobeLayersSystemComponent()
    {
        if (GlobeLayerInterface::Get() == nullptr)
        {
            GlobeLayerInterface::Register(this);
        }
    }

    GlobeLayersSystemComponent::~GlobeLayersSystemComponent()
    {
        if (GlobeLayerInterface::Get() == this)
        {
            GlobeLayerInterface::Unregister(this);
        }
    }

    void GlobeLayersSystemComponent::Init()
    {
    }

    void GlobeLayersSystemComponent::Activate()
    {
        GlobeLayerRequestBus::Handler::BusConnect();
        AZ_Printf("GlobeLayers", "GlobeLayers system component activated\n");
    }

    void GlobeLayersSystemComponent::Deactivate()
    {
        GlobeLayerRequestBus::Handler::BusDisconnect();
        m_layers.clear();
    }

    // ---- GlobeLayerRequestBus implementation ----

    bool GlobeLayersSystemComponent::RegisterLayer(const AZStd::string& layerName)
    {
        auto result = m_layers.emplace(layerName, true); // visible by default
        if (result.second)
        {
            AZ_Printf("GlobeLayers", "Layer registered: %s\n", layerName.c_str());
            GlobeLayerNotificationBus::Broadcast(
                &GlobeLayerNotifications::OnLayerRegistered, layerName);
        }
        return result.second;
    }

    void GlobeLayersSystemComponent::UnregisterLayer(const AZStd::string& layerName)
    {
        if (m_layers.erase(layerName) > 0)
        {
            AZ_Printf("GlobeLayers", "Layer unregistered: %s\n", layerName.c_str());
            GlobeLayerNotificationBus::Broadcast(
                &GlobeLayerNotifications::OnLayerUnregistered, layerName);
        }
    }

    void GlobeLayersSystemComponent::SetVisible(const AZStd::string& layerName, bool visible)
    {
        auto it = m_layers.find(layerName);
        if (it != m_layers.end() && it->second != visible)
        {
            it->second = visible;
            GlobeLayerNotificationBus::Broadcast(
                &GlobeLayerNotifications::OnVisibilityChanged, layerName, visible);
        }
    }

    bool GlobeLayersSystemComponent::IsVisible(const AZStd::string& layerName) const
    {
        auto it = m_layers.find(layerName);
        return it != m_layers.end() && it->second;
    }

    AZStd::vector<AZStd::string> GlobeLayersSystemComponent::GetLayerNames() const
    {
        AZStd::vector<AZStd::string> names;
        names.reserve(m_layers.size());
        for (const auto& pair : m_layers)
        {
            names.push_back(pair.first);
        }
        return names;
    }

} // namespace GlobeLayers
