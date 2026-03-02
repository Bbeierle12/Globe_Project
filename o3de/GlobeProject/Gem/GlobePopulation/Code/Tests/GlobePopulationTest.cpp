/*
 * GlobePopulation Gem -- Unit Tests
 *
 * Tests the Rust FFI bridge and the O3DE system component interface.
 * These tests call the Rust FFI functions directly to verify the data layer
 * works correctly when linked into a C++ binary.
 */

#include <AzTest/AzTest.h>

// Auto-generated Rust FFI header (structs + function declarations)
#include "globe_ffi.h"

// Test JSON data (same structure as countries.json)
static const char* TEST_JSON = R"([
    {
        "name": "Testland",
        "population": 50000000,
        "lat": 40.0,
        "lon": -74.0,
        "iso": "TST",
        "aliases": ["TL", "Test Republic"],
        "subdivision_label": "State",
        "subdivisions": [
            {
                "name": "North Province",
                "population": 30000000,
                "lat": 41.0,
                "lon": -74.0,
                "density": 750.0,
                "region": "Northern",
                "capital": "Northville",
                "area_km2": 40000.0,
                "change_pct": 2.5,
                "median_age": 35.0,
                "code": "NP",
                "parent_iso": "TST"
            },
            {
                "name": "South Province",
                "population": 20000000,
                "lat": 39.0,
                "lon": -74.0,
                "density": 500.0,
                "region": "Southern",
                "capital": "Southburg",
                "area_km2": 40000.0,
                "change_pct": 1.8,
                "median_age": 38.0,
                "code": "SP",
                "parent_iso": "TST"
            }
        ]
    },
    {
        "name": "Otherland",
        "population": 10000000,
        "lat": -30.0,
        "lon": 25.0,
        "iso": "OTH",
        "aliases": [],
        "subdivision_label": "Region",
        "subdivisions": []
    }
])";

// ---- Lifecycle tests ----

TEST(GlobeFFI, InitAndShutdown)
{
    int32_t count = globe_init(TEST_JSON);
    EXPECT_EQ(count, 2);
    EXPECT_EQ(globe_country_count(), 2u);

    globe_shutdown();
    EXPECT_EQ(globe_country_count(), 0u);
}

TEST(GlobeFFI, InitNullReturnsError)
{
    EXPECT_EQ(globe_init(nullptr), -1);
}

TEST(GlobeFFI, InitInvalidJsonReturnsError)
{
    EXPECT_EQ(globe_init("not valid json"), -1);
}

TEST(GlobeFFI, ShutdownIdempotent)
{
    globe_shutdown();
    globe_shutdown(); // should not crash
    EXPECT_EQ(globe_country_count(), 0u);
}

// ---- Country access tests ----

TEST(GlobeFFI, GetCountry)
{
    globe_init(TEST_JSON);

    GlobeCountry country = {};
    EXPECT_TRUE(globe_get_country(0, &country));
    EXPECT_STREQ(country.name, "Testland");
    EXPECT_EQ(country.population, 50000000u);
    EXPECT_STREQ(country.iso, "TST");
    EXPECT_EQ(country.subdivision_count, 2u);
    EXPECT_EQ(country.index, 0u);
    EXPECT_NEAR(country.lat, 40.0, 0.01);
    EXPECT_NEAR(country.lon, -74.0, 0.01);

    globe_shutdown();
}

TEST(GlobeFFI, GetCountryOutOfBounds)
{
    globe_init(TEST_JSON);

    GlobeCountry country = {};
    EXPECT_FALSE(globe_get_country(99, &country));

    globe_shutdown();
}

TEST(GlobeFFI, GetSubdivision)
{
    globe_init(TEST_JSON);

    GlobeSubdivision sub = {};
    EXPECT_TRUE(globe_get_subdivision(0, 0, &sub));
    EXPECT_STREQ(sub.name, "North Province");
    EXPECT_EQ(sub.population, 30000000u);
    EXPECT_NEAR(sub.density, 750.0, 0.01);
    EXPECT_STREQ(sub.capital, "Northville");
    EXPECT_STREQ(sub.region, "Northern");

    globe_shutdown();
}

TEST(GlobeFFI, GetSubdivisionOutOfBounds)
{
    globe_init(TEST_JSON);

    GlobeSubdivision sub = {};
    EXPECT_FALSE(globe_get_subdivision(0, 99, &sub));
    EXPECT_FALSE(globe_get_subdivision(99, 0, &sub));

    globe_shutdown();
}

// ---- Search tests ----

TEST(GlobeFFI, SearchByName)
{
    globe_init(TEST_JSON);

    GlobeSearchResult results[10] = {};
    uint32_t count = globe_search("test", results, 10);
    EXPECT_EQ(count, 1u);
    EXPECT_STREQ(results[0].name, "Testland");
    EXPECT_EQ(results[0].population, 50000000u);

    globe_shutdown();
}

TEST(GlobeFFI, SearchEmptyReturnsAll)
{
    globe_init(TEST_JSON);

    GlobeSearchResult results[10] = {};
    uint32_t count = globe_search("", results, 10);
    EXPECT_EQ(count, 2u);
    // Should be sorted by population (descending)
    EXPECT_GE(results[0].population, results[1].population);

    globe_shutdown();
}

TEST(GlobeFFI, SearchNoResults)
{
    globe_init(TEST_JSON);

    GlobeSearchResult results[10] = {};
    uint32_t count = globe_search("zzzznonexistent", results, 10);
    EXPECT_EQ(count, 0u);

    globe_shutdown();
}

TEST(GlobeFFI, SearchNull)
{
    EXPECT_EQ(globe_search(nullptr, nullptr, 0), 0u);
}

// ---- Format tests ----

TEST(GlobeFFI, FormatPopulationBillions)
{
    char* str = globe_format_population(1476625576);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "1.48B");
    globe_free_string(str);
}

TEST(GlobeFFI, FormatPopulationMillions)
{
    char* str = globe_format_population(341784857);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "341.8M");
    globe_free_string(str);
}

TEST(GlobeFFI, FormatPopulationThousands)
{
    char* str = globe_format_population(55869);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "55.9K");
    globe_free_string(str);
}

TEST(GlobeFFI, FormatPopulationSmall)
{
    char* str = globe_format_population(500);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "500");
    globe_free_string(str);
}

TEST(GlobeFFI, FormatDensity)
{
    char* str = globe_format_density(2126.3);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "2126/km\xc2\xb2"); // UTF-8 for km²
    globe_free_string(str);
}

TEST(GlobeFFI, FormatChange)
{
    char* str = globe_format_change(6.2);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "+6.2%");
    globe_free_string(str);

    str = globe_format_change(-1.5);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "-1.5%");
    globe_free_string(str);
}

TEST(GlobeFFI, FreeNullString)
{
    globe_free_string(nullptr); // should not crash
}

// ---- Marker & color tests ----

TEST(GlobeFFI, MarkerSize)
{
    float size = globe_marker_size(1000000, 1000000000, 6.0f, 5.0f);
    EXPECT_GT(size, 6.0f);
    EXPECT_LT(size, 11.0f);
}

TEST(GlobeFFI, MarkerSizeZeroMax)
{
    EXPECT_FLOAT_EQ(globe_marker_size(100, 0, 6.0f, 5.0f), 6.0f);
}

TEST(GlobeFFI, PopulationColorEndpoints)
{
    GlobeColorRgb low = globe_population_color(0.0);
    EXPECT_EQ(low.r, 0);
    EXPECT_GT(low.b, 100); // blue-ish

    GlobeColorRgb high = globe_population_color(1.0);
    EXPECT_EQ(high.r, 255);
    EXPECT_EQ(high.b, 0); // red
}

TEST(GlobeFFI, PopulationColorClamp)
{
    GlobeColorRgb below = globe_population_color(-0.5);
    GlobeColorRgb zero = globe_population_color(0.0);
    EXPECT_EQ(below.r, zero.r);
    EXPECT_EQ(below.g, zero.g);
    EXPECT_EQ(below.b, zero.b);

    GlobeColorRgb above = globe_population_color(1.5);
    GlobeColorRgb one = globe_population_color(1.0);
    EXPECT_EQ(above.r, one.r);
    EXPECT_EQ(above.g, one.g);
    EXPECT_EQ(above.b, one.b);
}

// ---- Strings reset tests ----

TEST(GlobeFFI, StringsResetSafe)
{
    // Reset before init should not crash
    globe_strings_reset();
}

TEST(GlobeFFI, StringsResetPreservesData)
{
    globe_init(TEST_JSON);

    // Access some data to populate the string cache
    GlobeCountry country = {};
    EXPECT_TRUE(globe_get_country(0, &country));

    // Reset strings — data should still be accessible
    globe_strings_reset();

    // Verify data is still intact (re-query after reset)
    GlobeCountry country2 = {};
    EXPECT_TRUE(globe_get_country(0, &country2));
    EXPECT_STREQ(country2.name, "Testland");
    EXPECT_EQ(country2.population, 50000000u);

    globe_shutdown();
}

// ---- Subdivision detail tests (via FFI) ----

TEST(GlobeFFI, SubdivisionAllFields)
{
    globe_init(TEST_JSON);

    GlobeSubdivision sub = {};
    EXPECT_TRUE(globe_get_subdivision(0, 1, &sub));
    EXPECT_STREQ(sub.name, "South Province");
    EXPECT_EQ(sub.population, 20000000u);
    EXPECT_NEAR(sub.density, 500.0, 0.01);
    EXPECT_STREQ(sub.capital, "Southburg");
    EXPECT_STREQ(sub.region, "Southern");
    EXPECT_NEAR(sub.area_km2, 40000.0, 0.01);
    EXPECT_NEAR(sub.change_pct, 1.8, 0.01);
    EXPECT_NEAR(sub.median_age, 38.0, 0.01);
    EXPECT_EQ(sub.country_index, 0u);
    EXPECT_EQ(sub.sub_index, 1u);

    globe_shutdown();
}

TEST(GlobeFFI, SubdivisionNoSubdivisionsCountry)
{
    globe_init(TEST_JSON);

    // Otherland (index 1) has no subdivisions
    GlobeSubdivision sub = {};
    EXPECT_FALSE(globe_get_subdivision(1, 0, &sub));

    globe_shutdown();
}

// ---- Format density & change via FFI ----

TEST(GlobeFFI, FormatDensityViaFFI)
{
    char* str = globe_format_density(500.0);
    ASSERT_NE(str, nullptr);
    // Should contain /km
    EXPECT_NE(strstr(str, "/km"), nullptr);
    globe_free_string(str);
}

TEST(GlobeFFI, FormatChangePositive)
{
    char* str = globe_format_change(3.7);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "+3.7%");
    globe_free_string(str);
}

TEST(GlobeFFI, FormatChangeNegative)
{
    char* str = globe_format_change(-2.1);
    ASSERT_NE(str, nullptr);
    EXPECT_STREQ(str, "-2.1%");
    globe_free_string(str);
}

AZ_UNIT_TEST_HOOK(DEFAULT_UNIT_TEST_ENV);
