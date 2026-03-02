#pragma once

#include <AzCore/std/string/string.h>
#include <AzCore/Settings/SettingsRegistry.h>

namespace GlobePopulation
{
    namespace TokenLoader
    {
        /// Load the Cesium Ion token.
        /// Priority: Settings Registry → CESIUM_ION_TOKEN env var → empty string.
        inline AZStd::string LoadCesiumIonToken()
        {
            // 1. Try Settings Registry
            AZ::SettingsRegistryInterface* registry = AZ::SettingsRegistry::Get();
            if (registry)
            {
                AZStd::string token;
                if (registry->Get(token, "/O3DE/GlobeProject/CesiumIonToken") && !token.empty())
                {
                    return token;
                }
            }

            // 2. Fallback to environment variable
            const char* envToken = std::getenv("CESIUM_ION_TOKEN");
            if (envToken && envToken[0] != '\0')
            {
                return AZStd::string(envToken);
            }

            // Also check VITE_CESIUM_ION_TOKEN for compatibility with the web build
            envToken = std::getenv("VITE_CESIUM_ION_TOKEN");
            if (envToken && envToken[0] != '\0')
            {
                return AZStd::string(envToken);
            }

            return {};
        }

        /// Load the Google Maps API key.
        /// Priority: Settings Registry → GOOGLE_MAPS_API_KEY env var → empty string.
        inline AZStd::string LoadGoogleMapsApiKey()
        {
            // 1. Try Settings Registry
            AZ::SettingsRegistryInterface* registry = AZ::SettingsRegistry::Get();
            if (registry)
            {
                AZStd::string key;
                if (registry->Get(key, "/O3DE/GlobeProject/GoogleMapsApiKey") && !key.empty())
                {
                    return key;
                }
            }

            // 2. Fallback to environment variable
            const char* envKey = std::getenv("GOOGLE_MAPS_API_KEY");
            if (envKey && envKey[0] != '\0')
            {
                return AZStd::string(envKey);
            }

            return {};
        }

        /// Log token status — warns if missing, never logs the actual token value.
        inline void LogTokenStatus()
        {
            AZStd::string ionToken = LoadCesiumIonToken();
            AZStd::string mapsKey = LoadGoogleMapsApiKey();

            if (ionToken.empty())
            {
                AZ_Warning("GlobeProject", false,
                    "No Cesium Ion token found. Set it in user/Registry/GlobeProject.setreg "
                    "or the CESIUM_ION_TOKEN environment variable.");
            }
            else
            {
                AZ_Printf("GlobeProject", "Cesium Ion token loaded (%zu chars)\n",
                    ionToken.size());
            }

            if (mapsKey.empty())
            {
                AZ_Warning("GlobeProject", false,
                    "No Google Maps API key found. Set it in user/Registry/GlobeProject.setreg "
                    "or the GOOGLE_MAPS_API_KEY environment variable.");
            }
            else
            {
                AZ_Printf("GlobeProject", "Google Maps API key loaded (%zu chars)\n",
                    mapsKey.size());
            }
        }

    } // namespace TokenLoader
} // namespace GlobePopulation
