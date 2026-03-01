use crate::data::types::{Country, Subdivision, GlobeEntity};
use crate::utils::format::{format_population, format_density, format_change};

/// A structured view of details for the selected entity.
#[derive(Debug, Clone, PartialEq)]
pub struct DetailView {
    pub name: String,
    pub population: String,
    pub density: Option<String>,
    pub region: Option<String>,
    pub capital: Option<String>,
    pub area: Option<String>,
    pub change: Option<String>,
    pub median_age: Option<String>,
    pub entity_type: String,
    pub subdivision_count: Option<usize>,
}

/// Build a detail view from a country.
pub fn country_detail(country: &Country) -> DetailView {
    DetailView {
        name: country.name.clone(),
        population: format_population(country.population),
        density: None,
        region: None,
        capital: None,
        area: None,
        change: None,
        median_age: None,
        entity_type: "Country".into(),
        subdivision_count: if country.has_subdivisions() {
            Some(country.subdivisions.len())
        } else {
            None
        },
    }
}

/// Build a detail view from a subdivision.
pub fn subdivision_detail(sub: &Subdivision) -> DetailView {
    DetailView {
        name: sub.name.clone(),
        population: format_population(sub.population),
        density: sub.density.map(format_density),
        region: sub.region.clone(),
        capital: sub.capital.clone(),
        area: sub.area_km2.map(|a| format!("{:.0} km²", a)),
        change: sub.change_pct.map(format_change),
        median_age: sub.median_age.map(|a| format!("{:.1}", a)),
        entity_type: "Subdivision".into(),
        subdivision_count: None,
    }
}

/// Build a detail view from any GlobeEntity.
pub fn entity_detail(entity: &GlobeEntity) -> DetailView {
    match entity {
        GlobeEntity::Country(c) => country_detail(c),
        GlobeEntity::Subdivision(s) => subdivision_detail(s),
        GlobeEntity::City(city) => DetailView {
            name: city.name.clone(),
            population: format_population(city.population),
            density: None,
            region: None,
            capital: None,
            area: None,
            change: None,
            median_age: None,
            entity_type: "City".into(),
            subdivision_count: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::types::LatLon;

    fn sample_country() -> Country {
        Country {
            name: "India".into(),
            population: 1_476_625_576,
            position: LatLon { lat: 20.59, lon: 78.96 },
            iso: "IND".into(),
            aliases: vec![],
            subdivision_label: Some("State".into()),
            subdivisions: vec![sample_subdivision()],
        }
    }

    fn sample_subdivision() -> Subdivision {
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
        }
    }

    #[test]
    fn test_country_detail() {
        let detail = country_detail(&sample_country());
        assert_eq!(detail.name, "India");
        assert_eq!(detail.population, "1.48B");
        assert_eq!(detail.entity_type, "Country");
        assert_eq!(detail.subdivision_count, Some(1));
        assert!(detail.density.is_none());
    }

    #[test]
    fn test_country_detail_no_subdivisions() {
        let c = Country {
            name: "Tuvalu".into(),
            population: 11_312,
            position: LatLon { lat: -7.11, lon: 177.64 },
            iso: "TUV".into(),
            aliases: vec![],
            subdivision_label: None,
            subdivisions: vec![],
        };
        let detail = country_detail(&c);
        assert_eq!(detail.population, "11.3K");
        assert!(detail.subdivision_count.is_none());
    }

    #[test]
    fn test_subdivision_detail() {
        let detail = subdivision_detail(&sample_subdivision());
        assert_eq!(detail.name, "Uttar Pradesh");
        assert_eq!(detail.population, "199.8M");
        assert_eq!(detail.density, Some("2126.3/km²".into()));
        assert_eq!(detail.region, Some("IN North".into()));
        assert_eq!(detail.capital, Some("Lucknow".into()));
        assert_eq!(detail.area, Some("93933 km²".into()));
        assert_eq!(detail.change, Some("+6.2%".into()));
        assert_eq!(detail.median_age, Some("22.7".into()));
        assert_eq!(detail.entity_type, "Subdivision");
    }

    #[test]
    fn test_entity_detail_dispatch() {
        let entity = GlobeEntity::Country(sample_country());
        let detail = entity_detail(&entity);
        assert_eq!(detail.entity_type, "Country");

        let entity2 = GlobeEntity::Subdivision(sample_subdivision());
        let detail2 = entity_detail(&entity2);
        assert_eq!(detail2.entity_type, "Subdivision");
    }
}
