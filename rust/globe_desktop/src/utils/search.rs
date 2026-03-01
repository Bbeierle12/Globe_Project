use crate::data::types::{Country, Subdivision, City};

/// Check if an entry name matches a search query (case-insensitive substring).
pub fn matches_query(name: &str, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let lower_name = name.to_lowercase();
    let lower_query = query.to_lowercase();
    lower_name.contains(&lower_query)
}

/// Check if a country matches a search query.
///
/// Searches: name, aliases, iso code, subdivision names, capitals.
pub fn country_matches(country: &Country, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let q = query.to_lowercase();

    // Name match
    if country.name.to_lowercase().contains(&q) {
        return true;
    }

    // ISO code match
    if country.iso.to_lowercase().contains(&q) {
        return true;
    }

    // Alias match
    if country.aliases.iter().any(|a| a.to_lowercase().contains(&q)) {
        return true;
    }

    // Subdivision name or capital match
    if country.subdivisions.iter().any(|s| {
        s.name.to_lowercase().contains(&q)
            || s.capital.as_ref().is_some_and(|c| c.to_lowercase().contains(&q))
            || s.region.as_ref().is_some_and(|r| r.to_lowercase().contains(&q))
    }) {
        return true;
    }

    false
}

/// Check if a subdivision matches a search query.
pub fn subdivision_matches(sub: &Subdivision, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let q = query.to_lowercase();

    sub.name.to_lowercase().contains(&q)
        || sub.capital.as_ref().is_some_and(|c| c.to_lowercase().contains(&q))
        || sub.region.as_ref().is_some_and(|r| r.to_lowercase().contains(&q))
}

/// Check if a city matches a search query.
pub fn city_matches(city: &City, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    city.name.to_lowercase().contains(&query.to_lowercase())
}

/// Filter countries by a search query, returning matching indices.
pub fn filter_countries(countries: &[Country], query: &str) -> Vec<usize> {
    countries
        .iter()
        .enumerate()
        .filter(|(_, c)| country_matches(c, query))
        .map(|(i, _)| i)
        .collect()
}

/// Sort country indices by population (descending).
pub fn sort_by_population(countries: &[Country], indices: &mut [usize]) {
    indices.sort_by(|a, b| {
        countries[*b]
            .population
            .cmp(&countries[*a].population)
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::types::LatLon;

    fn sample_countries() -> Vec<Country> {
        vec![
            Country {
                name: "India".into(),
                population: 1_476_625_576,
                position: LatLon { lat: 20.59, lon: 78.96 },
                iso: "IND".into(),
                aliases: vec!["Bharat".into(), "Republic of India".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![
                    Subdivision {
                        name: "Uttar Pradesh".into(),
                        population: 199_812_341,
                        position: LatLon { lat: 26.85, lon: 80.91 },
                        density: Some(2126.3),
                        region: Some("IN North".into()),
                        capital: Some("Lucknow".into()),
                        area_km2: Some(93_933.0),
                        change_pct: Some(6.2),
                        median_age: Some(22.7),
                        code: Some("09".into()),
                        parent_iso: "IND".into(),
                    },
                ],
            },
            Country {
                name: "United States".into(),
                population: 341_784_857,
                position: LatLon { lat: 37.09, lon: -95.71 },
                iso: "USA".into(),
                aliases: vec!["US".into(), "America".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![
                    Subdivision {
                        name: "California".into(),
                        population: 39_538_223,
                        position: LatLon { lat: 36.78, lon: -119.42 },
                        density: Some(97.9),
                        region: Some("West".into()),
                        capital: Some("Sacramento".into()),
                        area_km2: Some(403_882.0),
                        change_pct: Some(2.3),
                        median_age: Some(37.0),
                        code: Some("06".into()),
                        parent_iso: "USA".into(),
                    },
                ],
            },
            Country {
                name: "Brazil".into(),
                population: 216_422_446,
                position: LatLon { lat: -14.24, lon: -51.93 },
                iso: "BRA".into(),
                aliases: vec!["Brasil".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![],
            },
        ]
    }

    #[test]
    fn test_matches_query_basic() {
        assert!(matches_query("United States", "united"));
        assert!(matches_query("United States", "states"));
        assert!(matches_query("United States", "UNITED"));
        assert!(!matches_query("United States", "canada"));
    }

    #[test]
    fn test_matches_query_empty() {
        assert!(matches_query("anything", ""));
        assert!(matches_query("", ""));
    }

    #[test]
    fn test_country_matches_name() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "india"));
        assert!(country_matches(&countries[1], "united"));
        assert!(!country_matches(&countries[0], "brazil"));
    }

    #[test]
    fn test_country_matches_iso() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "IND"));
        assert!(country_matches(&countries[1], "usa"));
    }

    #[test]
    fn test_country_matches_alias() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "Bharat"));
        assert!(country_matches(&countries[1], "America"));
        assert!(country_matches(&countries[2], "Brasil"));
    }

    #[test]
    fn test_country_matches_subdivision() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "Uttar"));
        assert!(country_matches(&countries[1], "California"));
    }

    #[test]
    fn test_country_matches_capital() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "Lucknow"));
        assert!(country_matches(&countries[1], "Sacramento"));
    }

    #[test]
    fn test_country_matches_region() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], "North"));
        assert!(country_matches(&countries[1], "West"));
    }

    #[test]
    fn test_subdivision_matches() {
        let countries = sample_countries();
        let up = &countries[0].subdivisions[0];
        assert!(subdivision_matches(up, "Uttar"));
        assert!(subdivision_matches(up, "Lucknow"));
        assert!(subdivision_matches(up, "North"));
        assert!(!subdivision_matches(up, "California"));
    }

    #[test]
    fn test_city_matches() {
        let city = City {
            name: "New York".into(),
            population: 8_336_817,
            position: LatLon { lat: 40.71, lon: -74.01 },
            country_iso: "USA".into(),
        };
        assert!(city_matches(&city, "new"));
        assert!(city_matches(&city, "york"));
        assert!(!city_matches(&city, "london"));
    }

    #[test]
    fn test_filter_countries() {
        let countries = sample_countries();
        let results = filter_countries(&countries, "ind");
        // "India" matches, "United" contains "ind" nope - wait "ind" in "India" yes
        // "United" does not contain "ind"
        assert!(results.contains(&0)); // India
        assert!(!results.contains(&2)); // Brazil
    }

    #[test]
    fn test_filter_countries_empty_query() {
        let countries = sample_countries();
        let results = filter_countries(&countries, "");
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_sort_by_population() {
        let countries = sample_countries();
        let mut indices = vec![0, 1, 2];
        sort_by_population(&countries, &mut indices);
        // India (1.4B) > USA (341M) > Brazil (216M)
        assert_eq!(indices, vec![0, 1, 2]);

        // Try reversed input
        let mut indices2 = vec![2, 1, 0];
        sort_by_population(&countries, &mut indices2);
        assert_eq!(indices2, vec![0, 1, 2]);
    }
}
