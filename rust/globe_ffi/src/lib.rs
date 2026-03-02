mod format;
mod search;
mod types;

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::Mutex;

use types::{GlobeColorRgb, GlobeCountry, GlobeSearchResult, GlobeSubdivision};

// ---------- Global state ----------

static DATA: Mutex<Option<GlobeData>> = Mutex::new(None);

struct GlobeData {
    countries: Vec<types::Country>,
    /// CStrings kept alive so FFI pointers remain valid.
    _strings: Vec<CString>,
}

// ---------- Lifecycle ----------

/// Initialize the globe data layer from a JSON string.
/// Returns the number of countries loaded, or -1 on error.
#[unsafe(no_mangle)]
pub extern "C" fn globe_init(json_ptr: *const c_char) -> i32 {
    if json_ptr.is_null() {
        return -1;
    }
    let json = unsafe { CStr::from_ptr(json_ptr) };
    let json_str = match json.to_str() {
        Ok(s) => s,
        Err(_) => return -1,
    };

    let countries: Vec<types::Country> = match serde_json::from_str(json_str) {
        Ok(c) => c,
        Err(_) => return -1,
    };

    let count = countries.len() as i32;

    let mut data = DATA.lock().unwrap();
    *data = Some(GlobeData {
        countries,
        _strings: Vec::new(),
    });

    count
}

/// Free all globe data.
#[unsafe(no_mangle)]
pub extern "C" fn globe_shutdown() {
    let mut data = DATA.lock().unwrap();
    *data = None;
}

/// Return the number of loaded countries.
#[unsafe(no_mangle)]
pub extern "C" fn globe_country_count() -> u32 {
    let data = DATA.lock().unwrap();
    data.as_ref().map_or(0, |d| d.countries.len() as u32)
}

// ---------- Country accessors ----------

/// Get a country by index. Returns false if out of bounds.
/// The out pointer is filled with a GlobeCountry whose string pointers
/// are valid until the next globe_init or globe_shutdown call.
#[unsafe(no_mangle)]
pub extern "C" fn globe_get_country(index: u32, out: *mut GlobeCountry) -> bool {
    if out.is_null() {
        return false;
    }
    let mut data = DATA.lock().unwrap();
    let data = match data.as_mut() {
        Some(d) => d,
        None => return false,
    };
    let idx = index as usize;
    if idx >= data.countries.len() {
        return false;
    }

    let c = &data.countries[idx];
    let name = CString::new(c.name.as_str()).unwrap_or_default();
    let iso = CString::new(c.iso.as_str()).unwrap_or_default();

    let result = GlobeCountry {
        name: name.as_ptr(),
        population: c.population,
        lat: c.lat,
        lon: c.lon,
        iso: iso.as_ptr(),
        subdivision_count: c.subdivisions.len() as u32,
        index,
    };

    data._strings.push(name);
    data._strings.push(iso);

    unsafe { *out = result };
    // Re-point to the stored CStrings (the ones we just pushed)
    let strings = &data._strings;
    let name_ptr = strings[strings.len() - 2].as_ptr();
    let iso_ptr = strings[strings.len() - 1].as_ptr();
    unsafe {
        (*out).name = name_ptr;
        (*out).iso = iso_ptr;
    }
    true
}

/// Get a subdivision by country index and subdivision index.
#[unsafe(no_mangle)]
pub extern "C" fn globe_get_subdivision(
    country_index: u32,
    sub_index: u32,
    out: *mut GlobeSubdivision,
) -> bool {
    if out.is_null() {
        return false;
    }
    let mut data = DATA.lock().unwrap();
    let data = match data.as_mut() {
        Some(d) => d,
        None => return false,
    };
    let ci = country_index as usize;
    let si = sub_index as usize;
    if ci >= data.countries.len() || si >= data.countries[ci].subdivisions.len() {
        return false;
    }

    let s = &data.countries[ci].subdivisions[si];
    let name = CString::new(s.name.as_str()).unwrap_or_default();
    let region = CString::new(s.region.as_deref().unwrap_or("")).unwrap_or_default();
    let capital = CString::new(s.capital.as_deref().unwrap_or("")).unwrap_or_default();

    let name_ptr;
    let region_ptr;
    let capital_ptr;

    data._strings.push(name);
    name_ptr = data._strings.last().unwrap().as_ptr();
    data._strings.push(region);
    region_ptr = data._strings.last().unwrap().as_ptr();
    data._strings.push(capital);
    capital_ptr = data._strings.last().unwrap().as_ptr();

    unsafe {
        *out = GlobeSubdivision {
            name: name_ptr,
            population: s.population,
            lat: s.lat,
            lon: s.lon,
            density: s.density.unwrap_or(0.0),
            region: region_ptr,
            capital: capital_ptr,
            area_km2: s.area_km2.unwrap_or(0.0),
            change_pct: s.change_pct.unwrap_or(0.0),
            median_age: s.median_age.unwrap_or(0.0),
            country_index,
            sub_index,
        };
    }
    true
}

// ---------- Search ----------

/// Search countries by query string. Returns the number of results written.
/// Results are written to the `out` array (up to `max_results`).
#[unsafe(no_mangle)]
pub extern "C" fn globe_search(
    query_ptr: *const c_char,
    out: *mut GlobeSearchResult,
    max_results: u32,
) -> u32 {
    if query_ptr.is_null() || out.is_null() {
        return 0;
    }
    let query = unsafe { CStr::from_ptr(query_ptr) };
    let query_str = match query.to_str() {
        Ok(s) => s,
        Err(_) => return 0,
    };

    let mut data = DATA.lock().unwrap();
    let data = match data.as_mut() {
        Some(d) => d,
        None => return 0,
    };

    let indices = search::filter_countries(&data.countries, query_str);
    let count = indices.len().min(max_results as usize);

    for (i, &idx) in indices.iter().take(count).enumerate() {
        let c = &data.countries[idx];
        let name = CString::new(c.name.as_str()).unwrap_or_default();
        data._strings.push(name);
        let name_ptr = data._strings.last().unwrap().as_ptr();

        unsafe {
            *out.add(i) = GlobeSearchResult {
                index: idx as u32,
                name: name_ptr,
                population: c.population,
            };
        }
    }

    count as u32
}

// ---------- Formatting ----------

/// Format a population number. Caller must free the result with globe_free_string.
#[unsafe(no_mangle)]
pub extern "C" fn globe_format_population(population: u64) -> *mut c_char {
    let s = format::format_population(population);
    CString::new(s).unwrap_or_default().into_raw()
}

/// Format a density value. Caller must free the result with globe_free_string.
#[unsafe(no_mangle)]
pub extern "C" fn globe_format_density(density: f64) -> *mut c_char {
    let s = format::format_density(density);
    CString::new(s).unwrap_or_default().into_raw()
}

/// Format a percent change. Caller must free the result with globe_free_string.
#[unsafe(no_mangle)]
pub extern "C" fn globe_format_change(pct: f64) -> *mut c_char {
    let s = format::format_change(pct);
    CString::new(s).unwrap_or_default().into_raw()
}

/// Free a string returned by globe_format_* functions.
#[unsafe(no_mangle)]
pub extern "C" fn globe_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}

/// Compute marker size using power-law scaling.
#[unsafe(no_mangle)]
pub extern "C" fn globe_marker_size(population: u64, max_population: u64, base: f32, range: f32) -> f32 {
    format::marker_size(population, max_population, base, range)
}

/// Get population color as RGB.
#[unsafe(no_mangle)]
pub extern "C" fn globe_population_color(normalized: f64) -> GlobeColorRgb {
    let (r, g, b) = format::population_color(normalized);
    GlobeColorRgb { r, g, b }
}

// ---------- String memory management ----------

/// Reset (free) all cached FFI strings to reclaim memory.
/// Safe to call periodically (e.g. every tick) — the next `globe_get_*` call
/// will simply push new CStrings back into the cache.
#[unsafe(no_mangle)]
pub extern "C" fn globe_strings_reset() {
    if let Ok(mut data) = DATA.lock() {
        if let Some(ref mut d) = *data {
            d._strings.clear();
        }
    }
}

// ---------- Tests ----------

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    fn test_json() -> CString {
        CString::new(r#"[
            {
                "name": "Testland",
                "population": 1000000,
                "lat": 40.0,
                "lon": -74.0,
                "iso": "TST",
                "aliases": ["TL"],
                "subdivision_label": "State",
                "subdivisions": [
                    {
                        "name": "North",
                        "population": 600000,
                        "lat": 41.0,
                        "lon": -74.0,
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
            },
            {
                "name": "Southia",
                "population": 500000,
                "lat": -30.0,
                "lon": 25.0,
                "iso": "STH",
                "aliases": [],
                "subdivision_label": "Province",
                "subdivisions": []
            }
        ]"#).unwrap()
    }

    #[test]
    fn test_init_and_count() {
        let json = test_json();
        let count = globe_init(json.as_ptr());
        assert_eq!(count, 2);
        assert_eq!(globe_country_count(), 2);
        globe_shutdown();
        assert_eq!(globe_country_count(), 0);
    }

    #[test]
    fn test_init_null() {
        assert_eq!(globe_init(std::ptr::null()), -1);
    }

    #[test]
    fn test_init_invalid_json() {
        let bad = CString::new("not json").unwrap();
        assert_eq!(globe_init(bad.as_ptr()), -1);
    }

    #[test]
    fn test_get_country() {
        let json = test_json();
        globe_init(json.as_ptr());

        let mut country = GlobeCountry {
            name: std::ptr::null(),
            population: 0,
            lat: 0.0,
            lon: 0.0,
            iso: std::ptr::null(),
            subdivision_count: 0,
            index: 0,
        };

        assert!(globe_get_country(0, &mut country));
        assert_eq!(country.population, 1_000_000);
        assert_eq!(country.subdivision_count, 1);
        assert_eq!(country.index, 0);

        let name = unsafe { CStr::from_ptr(country.name) };
        assert_eq!(name.to_str().unwrap(), "Testland");

        // Out of bounds
        assert!(!globe_get_country(99, &mut country));

        globe_shutdown();
    }

    #[test]
    fn test_get_subdivision() {
        let json = test_json();
        globe_init(json.as_ptr());

        let mut sub = GlobeSubdivision {
            name: std::ptr::null(),
            population: 0,
            lat: 0.0,
            lon: 0.0,
            density: 0.0,
            region: std::ptr::null(),
            capital: std::ptr::null(),
            area_km2: 0.0,
            change_pct: 0.0,
            median_age: 0.0,
            country_index: 0,
            sub_index: 0,
        };

        assert!(globe_get_subdivision(0, 0, &mut sub));
        assert_eq!(sub.population, 600_000);
        assert!((sub.density - 150.0).abs() < 0.01);

        let name = unsafe { CStr::from_ptr(sub.name) };
        assert_eq!(name.to_str().unwrap(), "North");

        // Out of bounds
        assert!(!globe_get_subdivision(0, 5, &mut sub));
        assert!(!globe_get_subdivision(5, 0, &mut sub));

        globe_shutdown();
    }

    #[test]
    fn test_search() {
        let json = test_json();
        globe_init(json.as_ptr());

        let mut results = [GlobeSearchResult {
            index: 0,
            name: std::ptr::null(),
            population: 0,
        }; 10];

        let query = CString::new("test").unwrap();
        let count = globe_search(query.as_ptr(), results.as_mut_ptr(), 10);
        assert_eq!(count, 1);
        assert_eq!(results[0].population, 1_000_000);

        // Empty query returns all, sorted by population
        let all = CString::new("").unwrap();
        let count = globe_search(all.as_ptr(), results.as_mut_ptr(), 10);
        assert_eq!(count, 2);
        // First result should be highest population
        assert!(results[0].population >= results[1].population);

        globe_shutdown();
    }

    #[test]
    fn test_search_null() {
        assert_eq!(globe_search(std::ptr::null(), std::ptr::null_mut(), 0), 0);
    }

    #[test]
    fn test_format_population_ffi() {
        let ptr = globe_format_population(1_476_625_576);
        assert!(!ptr.is_null());
        let s = unsafe { CStr::from_ptr(ptr) };
        assert_eq!(s.to_str().unwrap(), "1.48B");
        globe_free_string(ptr);
    }

    #[test]
    fn test_format_density_ffi() {
        let ptr = globe_format_density(2126.3);
        assert!(!ptr.is_null());
        let s = unsafe { CStr::from_ptr(ptr) };
        assert_eq!(s.to_str().unwrap(), "2126/km²");
        globe_free_string(ptr);
    }

    #[test]
    fn test_marker_size_ffi() {
        let size = globe_marker_size(1_000_000, 1_000_000_000, 6.0, 5.0);
        assert!(size > 6.0);
    }

    #[test]
    fn test_population_color_ffi() {
        let color = globe_population_color(0.0);
        assert_eq!(color.r, 0);
        assert!(color.b > 100);

        let color = globe_population_color(1.0);
        assert_eq!(color.r, 255);
        assert_eq!(color.b, 0);
    }

    #[test]
    fn test_free_null_string() {
        globe_free_string(std::ptr::null_mut()); // should not crash
    }

    #[test]
    fn test_shutdown_idempotent() {
        globe_shutdown();
        globe_shutdown(); // double shutdown should be safe
        assert_eq!(globe_country_count(), 0);
    }
}
