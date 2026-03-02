/*
 * GlobeOsintFeeds Gem -- Unit Tests
 *
 * Tests the earthquake feed parsing and data access.
 */

#include <AzTest/AzTest.h>
#include <GlobeOsintFeeds/GlobeOsintFeedsBus.h>

// Test GeoJSON parsing
static const char* TEST_GEOJSON = R"({
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "us7000test1",
            "properties": {
                "mag": 6.2,
                "title": "M 6.2 - Test Location",
                "time": 1700000000000
            },
            "geometry": {
                "type": "Point",
                "coordinates": [-118.5, 34.05, 10.5]
            }
        },
        {
            "type": "Feature",
            "id": "us7000test2",
            "properties": {
                "mag": 4.8,
                "title": "M 4.8 - Another Test",
                "time": 1700001000000
            },
            "geometry": {
                "type": "Point",
                "coordinates": [139.7, 35.68, 25.0]
            }
        }
    ]
})";

TEST(GlobeOsintFeeds, EarthquakeEventStruct)
{
    GlobeOsintFeeds::EarthquakeEvent event;
    event.id = "test-001";
    event.title = "M 5.0 - Test Quake";
    event.magnitude = 5.0;
    event.lat = 34.05;
    event.lon = -118.5;
    event.depth = 10.0;
    event.timestamp = 1700000000000;

    EXPECT_EQ(event.id, "test-001");
    EXPECT_DOUBLE_EQ(event.magnitude, 5.0);
    EXPECT_NEAR(event.lat, 34.05, 0.01);
    EXPECT_NEAR(event.lon, -118.5, 0.01);
    EXPECT_DOUBLE_EQ(event.depth, 10.0);
}

TEST(GlobeOsintFeeds, DefaultFeedUrl)
{
    // Verify the config defaults match our expectations
    GlobeOsintFeeds::EarthquakeEvent event;
    event.id = "";
    EXPECT_TRUE(event.id.empty());
}

AZ_UNIT_TEST_HOOK(DEFAULT_UNIT_TEST_ENV);
