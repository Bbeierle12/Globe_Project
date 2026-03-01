use serde::{Deserialize, Serialize};

/// A geographic coordinate (latitude, longitude).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LatLon {
    pub lat: f64,
    pub lon: f64,
}

/// A country subdivision (state, province, region, etc.).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Subdivision {
    pub name: String,
    pub population: u64,
    pub position: LatLon,
    pub density: Option<f64>,
    pub region: Option<String>,
    pub capital: Option<String>,
    pub area_km2: Option<f64>,
    pub change_pct: Option<f64>,
    pub median_age: Option<f64>,
    pub code: Option<String>,
    pub parent_iso: String,
}

/// A country with optional subdivisions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Country {
    pub name: String,
    pub population: u64,
    pub position: LatLon,
    pub iso: String,
    pub aliases: Vec<String>,
    pub subdivision_label: Option<String>,
    pub subdivisions: Vec<Subdivision>,
}

/// A city entry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct City {
    pub name: String,
    pub population: u64,
    pub position: LatLon,
    pub country_iso: String,
}

/// Represents any selectable entity on the globe.
#[derive(Debug, Clone, PartialEq)]
pub enum GlobeEntity {
    Country(Country),
    Subdivision(Subdivision),
    City(City),
}

impl GlobeEntity {
    pub fn name(&self) -> &str {
        match self {
            GlobeEntity::Country(c) => &c.name,
            GlobeEntity::Subdivision(s) => &s.name,
            GlobeEntity::City(c) => &c.name,
        }
    }

    pub fn population(&self) -> u64 {
        match self {
            GlobeEntity::Country(c) => c.population,
            GlobeEntity::Subdivision(s) => s.population,
            GlobeEntity::City(c) => c.population,
        }
    }

    pub fn position(&self) -> LatLon {
        match self {
            GlobeEntity::Country(c) => c.position,
            GlobeEntity::Subdivision(s) => s.position,
            GlobeEntity::City(c) => c.position,
        }
    }
}

impl Country {
    /// Total population across all subdivisions (if available).
    pub fn subdivisions_total(&self) -> u64 {
        self.subdivisions.iter().map(|s| s.population).sum()
    }

    /// Whether this country has subdivision data.
    pub fn has_subdivisions(&self) -> bool {
        !self.subdivisions.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_country() -> Country {
        Country {
            name: "Testland".into(),
            population: 1_000_000,
            position: LatLon { lat: 40.0, lon: -74.0 },
            iso: "TST".into(),
            aliases: vec!["TL".into()],
            subdivision_label: Some("State".into()),
            subdivisions: vec![
                Subdivision {
                    name: "North Testland".into(),
                    population: 600_000,
                    position: LatLon { lat: 41.0, lon: -74.0 },
                    density: Some(150.0),
                    region: Some("North".into()),
                    capital: Some("Northville".into()),
                    area_km2: Some(4000.0),
                    change_pct: Some(2.5),
                    median_age: Some(35.0),
                    code: Some("NT".into()),
                    parent_iso: "TST".into(),
                },
                Subdivision {
                    name: "South Testland".into(),
                    population: 400_000,
                    position: LatLon { lat: 39.0, lon: -74.0 },
                    density: Some(100.0),
                    region: Some("South".into()),
                    capital: Some("Southville".into()),
                    area_km2: Some(4000.0),
                    change_pct: Some(1.8),
                    median_age: Some(38.0),
                    code: Some("ST".into()),
                    parent_iso: "TST".into(),
                },
            ],
        }
    }

    #[test]
    fn test_country_subdivisions_total() {
        let c = sample_country();
        assert_eq!(c.subdivisions_total(), 1_000_000);
    }

    #[test]
    fn test_country_has_subdivisions() {
        let c = sample_country();
        assert!(c.has_subdivisions());

        let empty = Country {
            name: "Empty".into(),
            population: 100,
            position: LatLon { lat: 0.0, lon: 0.0 },
            iso: "EMP".into(),
            aliases: vec![],
            subdivision_label: None,
            subdivisions: vec![],
        };
        assert!(!empty.has_subdivisions());
    }

    #[test]
    fn test_globe_entity_accessors() {
        let c = sample_country();
        let entity = GlobeEntity::Country(c.clone());
        assert_eq!(entity.name(), "Testland");
        assert_eq!(entity.population(), 1_000_000);
        assert_eq!(entity.position(), LatLon { lat: 40.0, lon: -74.0 });
    }

    #[test]
    fn test_latlon_equality() {
        let a = LatLon { lat: 40.7128, lon: -74.0060 };
        let b = LatLon { lat: 40.7128, lon: -74.0060 };
        assert_eq!(a, b);
    }

    #[test]
    fn test_country_serialization_roundtrip() {
        let c = sample_country();
        let json = serde_json::to_string(&c).unwrap();
        let deserialized: Country = serde_json::from_str(&json).unwrap();
        assert_eq!(c, deserialized);
    }
}
