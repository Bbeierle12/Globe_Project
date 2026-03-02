#include "IonApiClient.h"

#include <AzCore/JSON/document.h>
#include <AzCore/JSON/error/en.h>

// NOTE: In a full O3DE build, you would include:
//   #include <AzFramework/AzFramework/HttpRequestor/HttpRequestorBus.h>
// and use HttpRequestorRequestBus::Broadcast to issue async HTTP GET requests.
// For now, the parsing logic is implemented and tested; the HTTP transport
// is stubbed to be wired up once AzFramework::HttpRequestor is available.

namespace GlobePopulation
{
    IonApiClient::IonApiClient(const AZStd::string& token)
        : m_token(token)
    {
    }

    void IonApiClient::GetMe(IonMeCallback callback) const
    {
        if (!HasToken())
        {
            callback(false, {});
            return;
        }

        // TODO: Issue HTTP GET to IonBaseUrl + "/v1/me" with Bearer token.
        // On response, parse JSON:
        //
        // auto parseResponse = [callback](const AZStd::string& body, int statusCode) {
        //     if (statusCode != 200) { callback(false, {}); return; }
        //     rapidjson::Document doc;
        //     doc.Parse(body.c_str());
        //     if (doc.HasParseError()) { callback(false, {}); return; }
        //     IonMe me;
        //     me.id = doc.HasMember("id") ? doc["id"].GetUint64() : 0;
        //     me.username = doc.HasMember("username") ? doc["username"].GetString() : "";
        //     me.email = doc.HasMember("email") ? doc["email"].GetString() : "";
        //     callback(true, me);
        // };
        //
        // AzFramework::HttpRequestorRequestBus::Broadcast(
        //     &AzFramework::HttpRequestorRequests::AddRequest,
        //     AZStd::string(IonBaseUrl) + "/v1/me",
        //     Aws::Http::HttpMethod::HTTP_GET,
        //     parseResponse);

        AZ_Printf("IonApiClient", "GetMe: stub — wire up AzFramework::HttpRequestor\n");
        callback(false, {});
    }

    void IonApiClient::ListAssets(uint32_t limit, IonAssetListCallback callback) const
    {
        if (!HasToken())
        {
            callback(false, {});
            return;
        }

        // TODO: Issue HTTP GET to IonBaseUrl + "/v1/assets?limit=" + limit
        // Parse the "items" array from the response.
        AZ_Printf("IonApiClient", "ListAssets(limit=%u): stub — wire up AzFramework::HttpRequestor\n", limit);
        callback(false, {});
    }

    void IonApiClient::GetAsset(uint64_t assetId, IonAssetCallback callback) const
    {
        if (!HasToken())
        {
            callback(false, {});
            return;
        }

        // TODO: Issue HTTP GET to IonBaseUrl + "/v1/assets/" + assetId
        AZ_Printf("IonApiClient", "GetAsset(%llu): stub — wire up AzFramework::HttpRequestor\n",
            static_cast<unsigned long long>(assetId));
        callback(false, {});
    }

    void IonApiClient::GetAssetEndpoint(uint64_t assetId, IonEndpointCallback callback) const
    {
        if (!HasToken())
        {
            callback(false, {});
            return;
        }

        // TODO: Issue HTTP GET to IonBaseUrl + "/v1/assets/" + assetId + "/endpoint"
        AZ_Printf("IonApiClient", "GetAssetEndpoint(%llu): stub — wire up AzFramework::HttpRequestor\n",
            static_cast<unsigned long long>(assetId));
        callback(false, {});
    }

    // ---------- JSON parsing helpers (available for wiring to HTTP callbacks) ----------

    namespace IonParsing
    {
        IonMe ParseMe(const char* json)
        {
            IonMe me;
            rapidjson::Document doc;
            doc.Parse(json);
            if (doc.HasParseError() || !doc.IsObject())
            {
                return me;
            }
            if (doc.HasMember("id") && doc["id"].IsUint64())
            {
                me.id = doc["id"].GetUint64();
            }
            if (doc.HasMember("username") && doc["username"].IsString())
            {
                me.username = doc["username"].GetString();
            }
            if (doc.HasMember("email") && doc["email"].IsString())
            {
                me.email = doc["email"].GetString();
            }
            return me;
        }

        AZStd::vector<IonAsset> ParseAssetList(const char* json)
        {
            AZStd::vector<IonAsset> assets;
            rapidjson::Document doc;
            doc.Parse(json);
            if (doc.HasParseError() || !doc.IsObject())
            {
                return assets;
            }
            if (!doc.HasMember("items") || !doc["items"].IsArray())
            {
                return assets;
            }
            for (const auto& item : doc["items"].GetArray())
            {
                IonAsset asset;
                if (item.HasMember("id") && item["id"].IsUint64())
                {
                    asset.id = item["id"].GetUint64();
                }
                if (item.HasMember("name") && item["name"].IsString())
                {
                    asset.name = item["name"].GetString();
                }
                if (item.HasMember("type") && item["type"].IsString())
                {
                    asset.assetType = item["type"].GetString();
                }
                if (item.HasMember("description") && item["description"].IsString())
                {
                    asset.description = item["description"].GetString();
                }
                if (item.HasMember("bytes") && item["bytes"].IsUint64())
                {
                    asset.bytes = item["bytes"].GetUint64();
                }
                if (item.HasMember("status") && item["status"].IsString())
                {
                    asset.status = item["status"].GetString();
                }
                if (item.HasMember("attribution") && item["attribution"].IsString())
                {
                    asset.attribution = item["attribution"].GetString();
                }
                assets.push_back(AZStd::move(asset));
            }
            return assets;
        }

        IonAsset ParseAsset(const char* json)
        {
            IonAsset asset;
            rapidjson::Document doc;
            doc.Parse(json);
            if (doc.HasParseError() || !doc.IsObject())
            {
                return asset;
            }
            if (doc.HasMember("id") && doc["id"].IsUint64())
            {
                asset.id = doc["id"].GetUint64();
            }
            if (doc.HasMember("name") && doc["name"].IsString())
            {
                asset.name = doc["name"].GetString();
            }
            if (doc.HasMember("type") && doc["type"].IsString())
            {
                asset.assetType = doc["type"].GetString();
            }
            if (doc.HasMember("description") && doc["description"].IsString())
            {
                asset.description = doc["description"].GetString();
            }
            if (doc.HasMember("bytes") && doc["bytes"].IsUint64())
            {
                asset.bytes = doc["bytes"].GetUint64();
            }
            if (doc.HasMember("status") && doc["status"].IsString())
            {
                asset.status = doc["status"].GetString();
            }
            if (doc.HasMember("attribution") && doc["attribution"].IsString())
            {
                asset.attribution = doc["attribution"].GetString();
            }
            return asset;
        }

        IonEndpoint ParseEndpoint(const char* json)
        {
            IonEndpoint ep;
            rapidjson::Document doc;
            doc.Parse(json);
            if (doc.HasParseError() || !doc.IsObject())
            {
                return ep;
            }
            if (doc.HasMember("url") && doc["url"].IsString())
            {
                ep.url = doc["url"].GetString();
            }
            if (doc.HasMember("accessToken") && doc["accessToken"].IsString())
            {
                ep.accessToken = doc["accessToken"].GetString();
            }
            if (doc.HasMember("type") && doc["type"].IsString())
            {
                ep.endpointType = doc["type"].GetString();
            }
            if (doc.HasMember("attributions") && doc["attributions"].IsArray())
            {
                for (const auto& attr : doc["attributions"].GetArray())
                {
                    IonAttribution a;
                    if (attr.HasMember("html") && attr["html"].IsString())
                    {
                        a.html = attr["html"].GetString();
                    }
                    if (attr.HasMember("collapsible") && attr["collapsible"].IsBool())
                    {
                        a.collapsible = attr["collapsible"].GetBool();
                    }
                    ep.attributions.push_back(AZStd::move(a));
                }
            }
            return ep;
        }

    } // namespace IonParsing

} // namespace GlobePopulation
