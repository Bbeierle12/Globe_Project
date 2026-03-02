#include <AzTest/AzTest.h>
#include "Utils/IonApiClient.h"

// Pull in the parsing helpers declared in the .cpp — forward-declare them here.
namespace GlobePopulation::IonParsing
{
    IonMe ParseMe(const char* json);
    AZStd::vector<IonAsset> ParseAssetList(const char* json);
    IonAsset ParseAsset(const char* json);
    IonEndpoint ParseEndpoint(const char* json);
}

using namespace GlobePopulation;

// ---- IonApiClient construction ----

TEST(IonApiClient, HasTokenReturnsFalseWhenEmpty)
{
    IonApiClient client(AZStd::string{});
    EXPECT_FALSE(client.HasToken());
}

TEST(IonApiClient, HasTokenReturnsTrueWhenSet)
{
    IonApiClient client(AZStd::string("test-token-123"));
    EXPECT_TRUE(client.HasToken());
}

TEST(IonApiClient, GetMeWithoutTokenCallsBackFalse)
{
    IonApiClient client(AZStd::string{});
    bool called = false;
    client.GetMe([&](bool success, const IonMe&) {
        called = true;
        EXPECT_FALSE(success);
    });
    EXPECT_TRUE(called);
}

TEST(IonApiClient, ListAssetsWithoutTokenCallsBackFalse)
{
    IonApiClient client(AZStd::string{});
    bool called = false;
    client.ListAssets(10, [&](bool success, const AZStd::vector<IonAsset>&) {
        called = true;
        EXPECT_FALSE(success);
    });
    EXPECT_TRUE(called);
}

TEST(IonApiClient, GetAssetWithoutTokenCallsBackFalse)
{
    IonApiClient client(AZStd::string{});
    bool called = false;
    client.GetAsset(1, [&](bool success, const IonAsset&) {
        called = true;
        EXPECT_FALSE(success);
    });
    EXPECT_TRUE(called);
}

TEST(IonApiClient, GetAssetEndpointWithoutTokenCallsBackFalse)
{
    IonApiClient client(AZStd::string{});
    bool called = false;
    client.GetAssetEndpoint(1, [&](bool success, const IonEndpoint&) {
        called = true;
        EXPECT_FALSE(success);
    });
    EXPECT_TRUE(called);
}

// ---- JSON parsing: ParseMe ----

TEST(IonParsing, ParseMeValid)
{
    const char* json = R"({"id":42,"username":"globe_user","email":"user@example.com"})";
    auto me = IonParsing::ParseMe(json);
    EXPECT_EQ(me.id, 42u);
    EXPECT_STREQ(me.username.c_str(), "globe_user");
    EXPECT_STREQ(me.email.c_str(), "user@example.com");
}

TEST(IonParsing, ParseMePartialFields)
{
    const char* json = R"({"id":7})";
    auto me = IonParsing::ParseMe(json);
    EXPECT_EQ(me.id, 7u);
    EXPECT_TRUE(me.username.empty());
    EXPECT_TRUE(me.email.empty());
}

TEST(IonParsing, ParseMeInvalidJson)
{
    auto me = IonParsing::ParseMe("{bad json");
    EXPECT_EQ(me.id, 0u);
}

// ---- JSON parsing: ParseAssetList ----

TEST(IonParsing, ParseAssetListWithItems)
{
    const char* json = R"({
        "items": [
            {"id":1,"name":"Terrain","type":"TERRAIN","description":"World terrain","bytes":1024,"status":"COMPLETE","attribution":"Cesium"},
            {"id":2,"name":"Buildings","type":"3DTILES","bytes":2048,"status":"COMPLETE"}
        ]
    })";
    auto assets = IonParsing::ParseAssetList(json);
    EXPECT_EQ(assets.size(), 2u);
    EXPECT_STREQ(assets[0].name.c_str(), "Terrain");
    EXPECT_EQ(assets[0].bytes, 1024u);
    EXPECT_STREQ(assets[0].attribution.c_str(), "Cesium");
    EXPECT_STREQ(assets[1].assetType.c_str(), "3DTILES");
    EXPECT_TRUE(assets[1].attribution.empty());
}

TEST(IonParsing, ParseAssetListEmpty)
{
    const char* json = R"({"items":[]})";
    auto assets = IonParsing::ParseAssetList(json);
    EXPECT_TRUE(assets.empty());
}

TEST(IonParsing, ParseAssetListNoItemsKey)
{
    const char* json = R"({"something":"else"})";
    auto assets = IonParsing::ParseAssetList(json);
    EXPECT_TRUE(assets.empty());
}

// ---- JSON parsing: ParseAsset ----

TEST(IonParsing, ParseAssetValid)
{
    const char* json = R"({"id":99,"name":"My Asset","type":"IMAGERY","description":"Satellite imagery","bytes":4096,"status":"COMPLETE","attribution":"NASA"})";
    auto asset = IonParsing::ParseAsset(json);
    EXPECT_EQ(asset.id, 99u);
    EXPECT_STREQ(asset.name.c_str(), "My Asset");
    EXPECT_STREQ(asset.assetType.c_str(), "IMAGERY");
    EXPECT_STREQ(asset.description.c_str(), "Satellite imagery");
    EXPECT_EQ(asset.bytes, 4096u);
    EXPECT_STREQ(asset.attribution.c_str(), "NASA");
}

// ---- JSON parsing: ParseEndpoint ----

TEST(IonParsing, ParseEndpointValid)
{
    const char* json = R"({
        "url":"https://assets.cesium.com/12345",
        "accessToken":"tok_abc",
        "type":"3DTILES",
        "attributions":[
            {"html":"&copy; Cesium","collapsible":false},
            {"html":"&copy; OSM","collapsible":true}
        ]
    })";
    auto ep = IonParsing::ParseEndpoint(json);
    EXPECT_STREQ(ep.url.c_str(), "https://assets.cesium.com/12345");
    EXPECT_STREQ(ep.accessToken.c_str(), "tok_abc");
    EXPECT_STREQ(ep.endpointType.c_str(), "3DTILES");
    EXPECT_EQ(ep.attributions.size(), 2u);
    EXPECT_FALSE(ep.attributions[0].collapsible);
    EXPECT_TRUE(ep.attributions[1].collapsible);
    EXPECT_STREQ(ep.attributions[1].html.c_str(), "&copy; OSM");
}

TEST(IonParsing, ParseEndpointNoAttributions)
{
    const char* json = R"({"url":"https://example.com","accessToken":"t","type":"TERRAIN"})";
    auto ep = IonParsing::ParseEndpoint(json);
    EXPECT_STREQ(ep.url.c_str(), "https://example.com");
    EXPECT_TRUE(ep.attributions.empty());
}

TEST(IonParsing, ParseEndpointInvalidJson)
{
    auto ep = IonParsing::ParseEndpoint("not json");
    EXPECT_TRUE(ep.url.empty());
    EXPECT_TRUE(ep.attributions.empty());
}
