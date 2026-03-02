use serde::Deserialize;

/// Internal country representation (Rust-owned, serde-capable).
/// Some fields are only read during JSON deserialization (serde).
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct Country {
    pub name: String,
    pub population: u64,
    pub lat: f64,
    pub lon: f64,
    pub iso: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    pub subdivision_label: Option<String>,
    #[serde(default)]
    pub subdivisions: Vec<Subdivision>,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct Subdivision {
    pub name: String,
    pub population: u64,
    pub lat: f64,
    pub lon: f64,
    pub density: Option<f64>,
    pub region: Option<String>,
    pub capital: Option<String>,
    pub area_km2: Option<f64>,
    pub change_pct: Option<f64>,
    pub median_age: Option<f64>,
    pub code: Option<String>,
    pub parent_iso: String,
}

/// C-safe country summary passed across FFI.
#[repr(C)]
pub struct GlobeCountry {
    pub name: *const std::ffi::c_char,
    pub population: u64,
    pub lat: f64,
    pub lon: f64,
    pub iso: *const std::ffi::c_char,
    pub subdivision_count: u32,
    pub index: u32,
}

/// C-safe subdivision summary passed across FFI.
#[repr(C)]
pub struct GlobeSubdivision {
    pub name: *const std::ffi::c_char,
    pub population: u64,
    pub lat: f64,
    pub lon: f64,
    pub density: f64,
    pub region: *const std::ffi::c_char,
    pub capital: *const std::ffi::c_char,
    pub area_km2: f64,
    pub change_pct: f64,
    pub median_age: f64,
    pub country_index: u32,
    pub sub_index: u32,
}

/// C-safe search result entry.
#[repr(C)]
#[derive(Clone, Copy)]
pub struct GlobeSearchResult {
    pub index: u32,
    pub name: *const std::ffi::c_char,
    pub population: u64,
}

/// RGB color for population visualization.
#[repr(C)]
pub struct GlobeColorRgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

