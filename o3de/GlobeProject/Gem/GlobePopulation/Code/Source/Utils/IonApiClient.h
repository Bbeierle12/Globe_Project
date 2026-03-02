#pragma once

#include <AzCore/std/string/string.h>
#include <AzCore/std/containers/vector.h>
#include <AzCore/std/function/function.h>

namespace GlobePopulation
{
    // ---------- Ion API response types ----------

    /// Response from GET /v1/me
    struct IonMe
    {
        uint64_t id = 0;
        AZStd::string username;
        AZStd::string email;
    };

    /// One entry from GET /v1/assets
    struct IonAsset
    {
        uint64_t id = 0;
        AZStd::string name;
        AZStd::string assetType;
        AZStd::string description;
        uint64_t bytes = 0;
        AZStd::string status;
        AZStd::string attribution;
    };

    /// Attribution entry from asset endpoint
    struct IonAttribution
    {
        AZStd::string html;
        bool collapsible = false;
    };

    /// Response from GET /v1/assets/{id}/endpoint
    struct IonEndpoint
    {
        AZStd::string url;
        AZStd::string accessToken;
        AZStd::string endpointType;
        AZStd::vector<IonAttribution> attributions;
    };

    /// Connection status for UI display.
    enum class IonStatus
    {
        Loading,
        Connected,
        Error,
        NoToken
    };

    // ---------- Callback types ----------

    using IonMeCallback = AZStd::function<void(bool success, const IonMe& me)>;
    using IonAssetListCallback = AZStd::function<void(bool success, const AZStd::vector<IonAsset>& assets)>;
    using IonAssetCallback = AZStd::function<void(bool success, const IonAsset& asset)>;
    using IonEndpointCallback = AZStd::function<void(bool success, const IonEndpoint& endpoint)>;

    // ---------- Ion API Client ----------

    /// Thin wrapper around the Cesium Ion REST API using O3DE's HTTP facilities.
    ///
    /// Base URL:  https://api.cesium.com
    /// Auth:      Authorization: Bearer <token>
    ///
    /// All methods are async — results arrive via callback on the main thread.
    class IonApiClient
    {
    public:
        static constexpr const char* IonBaseUrl = "https://api.cesium.com";

        explicit IonApiClient(const AZStd::string& token);

        /// GET /v1/me — validate connection and get user info.
        void GetMe(IonMeCallback callback) const;

        /// GET /v1/assets?limit={limit} — list user's Ion assets.
        void ListAssets(uint32_t limit, IonAssetListCallback callback) const;

        /// GET /v1/assets/{id} — get a specific asset.
        void GetAsset(uint64_t assetId, IonAssetCallback callback) const;

        /// GET /v1/assets/{id}/endpoint — get the endpoint URL for streaming.
        void GetAssetEndpoint(uint64_t assetId, IonEndpointCallback callback) const;

        /// Check if a token is set.
        bool HasToken() const { return !m_token.empty(); }

    private:
        AZStd::string m_token;
    };

} // namespace GlobePopulation
