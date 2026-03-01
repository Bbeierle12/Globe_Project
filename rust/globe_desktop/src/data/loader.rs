use std::path::Path;
use crate::data::types::Country;

/// Load countries from a JSON file.
pub fn load_countries_from_file(path: &Path) -> Result<Vec<Country>, LoadError> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| LoadError::Io(e.to_string()))?;
    load_countries_from_str(&content)
}

/// Parse countries from a JSON string.
pub fn load_countries_from_str(json: &str) -> Result<Vec<Country>, LoadError> {
    serde_json::from_str(json).map_err(|e| LoadError::Parse(e.to_string()))
}

#[derive(Debug, Clone, PartialEq)]
pub enum LoadError {
    Io(String),
    Parse(String),
}

impl std::fmt::Display for LoadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LoadError::Io(msg) => write!(f, "IO error: {msg}"),
            LoadError::Parse(msg) => write!(f, "Parse error: {msg}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data::types::LatLon;

    #[test]
    fn test_load_countries_from_str_valid() {
        let json = r#"[
            {
                "name": "Testland",
                "population": 1000000,
                "position": { "lat": 40.0, "lon": -74.0 },
                "iso": "TST",
                "aliases": ["TL"],
                "subdivision_label": "State",
                "subdivisions": []
            }
        ]"#;

        let countries = load_countries_from_str(json).unwrap();
        assert_eq!(countries.len(), 1);
        assert_eq!(countries[0].name, "Testland");
        assert_eq!(countries[0].population, 1_000_000);
        assert_eq!(countries[0].position, LatLon { lat: 40.0, lon: -74.0 });
        assert_eq!(countries[0].iso, "TST");
    }

    #[test]
    fn test_load_countries_from_str_with_subdivisions() {
        let json = r#"[
            {
                "name": "Testland",
                "population": 1000000,
                "position": { "lat": 40.0, "lon": -74.0 },
                "iso": "TST",
                "aliases": [],
                "subdivision_label": "State",
                "subdivisions": [
                    {
                        "name": "North",
                        "population": 600000,
                        "position": { "lat": 41.0, "lon": -74.0 },
                        "density": 150.0,
                        "region": "Northern",
                        "capital": "Northville",
                        "area_km2": 4000.0,
                        "change_pct": 2.5,
                        "median_age": 35.0,
                        "code": "NT",
                        "parent_iso": "TST"
                    }
                ]
            }
        ]"#;

        let countries = load_countries_from_str(json).unwrap();
        assert_eq!(countries[0].subdivisions.len(), 1);
        assert_eq!(countries[0].subdivisions[0].name, "North");
        assert_eq!(countries[0].subdivisions[0].density, Some(150.0));
    }

    #[test]
    fn test_load_countries_from_str_invalid_json() {
        let result = load_countries_from_str("not json");
        assert!(result.is_err());
        match result.unwrap_err() {
            LoadError::Parse(msg) => assert!(!msg.is_empty()),
            _ => panic!("expected Parse error"),
        }
    }

    #[test]
    fn test_load_countries_from_str_empty_array() {
        let countries = load_countries_from_str("[]").unwrap();
        assert!(countries.is_empty());
    }

    #[test]
    fn test_load_error_display() {
        let io_err = LoadError::Io("file not found".into());
        assert_eq!(io_err.to_string(), "IO error: file not found");

        let parse_err = LoadError::Parse("invalid json".into());
        assert_eq!(parse_err.to_string(), "Parse error: invalid json");
    }

    #[test]
    fn test_load_from_nonexistent_file() {
        let result = load_countries_from_file(Path::new("/nonexistent/file.json"));
        assert!(matches!(result, Err(LoadError::Io(_))));
    }
}
