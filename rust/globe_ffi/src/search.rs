use crate::types::Country;

/// Check if a country matches a search query (case-insensitive).
/// Searches: name, ISO code, aliases, subdivision names, capitals, regions.
pub fn country_matches(country: &Country, query: &str) -> bool {
    if query.is_empty() {
        return true;
    }
    let q = query.to_lowercase();

    if country.name.to_lowercase().contains(&q) {
        return true;
    }
    if country.iso.to_lowercase().contains(&q) {
        return true;
    }
    if country.aliases.iter().any(|a| a.to_lowercase().contains(&q)) {
        return true;
    }
    if country.subdivisions.iter().any(|s| {
        s.name.to_lowercase().contains(&q)
            || s.capital.as_ref().is_some_and(|c| c.to_lowercase().contains(&q))
            || s.region.as_ref().is_some_and(|r| r.to_lowercase().contains(&q))
    }) {
        return true;
    }
    false
}

/// Filter countries by a search query, returning matching indices sorted by population.
pub fn filter_countries(countries: &[Country], query: &str) -> Vec<usize> {
    let mut results: Vec<usize> = countries
        .iter()
        .enumerate()
        .filter(|(_, c)| country_matches(c, query))
        .map(|(i, _)| i)
        .collect();

    results.sort_by(|a, b| countries[*b].population.cmp(&countries[*a].population));
    results
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Subdivision;

    fn sample_countries() -> Vec<Country> {
        vec![
            Country {
                name: "India".into(),
                population: 1_476_625_576,
                lat: 20.59,
                lon: 78.96,
                iso: "IND".into(),
                aliases: vec!["Bharat".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![Subdivision {
                    name: "Uttar Pradesh".into(),
                    population: 199_812_341,
                    lat: 26.85,
                    lon: 80.91,
                    density: Some(2126.3),
                    region: Some("IN North".into()),
                    capital: Some("Lucknow".into()),
                    area_km2: Some(93_933.0),
                    change_pct: Some(6.2),
                    median_age: Some(22.7),
                    code: Some("09".into()),
                    parent_iso: "IND".into(),
                }],
            },
            Country {
                name: "United States".into(),
                population: 341_784_857,
                lat: 37.09,
                lon: -95.71,
                iso: "USA".into(),
                aliases: vec!["America".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![Subdivision {
                    name: "California".into(),
                    population: 39_538_223,
                    lat: 36.78,
                    lon: -119.42,
                    density: Some(97.9),
                    region: Some("West".into()),
                    capital: Some("Sacramento".into()),
                    area_km2: Some(403_882.0),
                    change_pct: Some(2.3),
                    median_age: Some(37.0),
                    code: Some("06".into()),
                    parent_iso: "USA".into(),
                }],
            },
            Country {
                name: "Brazil".into(),
                population: 216_422_446,
                lat: -14.24,
                lon: -51.93,
                iso: "BRA".into(),
                aliases: vec!["Brasil".into()],
                subdivision_label: Some("State".into()),
                subdivisions: vec![],
            },
        ]
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
    }

    #[test]
    fn test_country_matches_subdivision_name() {
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
    fn test_country_matches_empty_query() {
        let countries = sample_countries();
        assert!(country_matches(&countries[0], ""));
    }

    #[test]
    fn test_filter_returns_sorted_by_population() {
        let countries = sample_countries();
        let results = filter_countries(&countries, "");
        // India (1.4B) > USA (341M) > Brazil (216M)
        assert_eq!(results, vec![0, 1, 2]);
    }

    #[test]
    fn test_filter_narrows_results() {
        let countries = sample_countries();
        let results = filter_countries(&countries, "bra");
        // Only Brazil matches "bra" in its name
        assert_eq!(results, vec![2]);
    }

    #[test]
    fn test_filter_via_alias() {
        let countries = sample_countries();
        let results = filter_countries(&countries, "Bharat");
        assert_eq!(results, vec![0]);
    }
}
