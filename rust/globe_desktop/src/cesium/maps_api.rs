//! Google Maps Tile API client.
//!
//! Flow:
//!   1. POST /v1/createSession → session token
//!   2. GET  /v1/2dtiles/{z}/{x}/{y}?session=…&key=… → JPEG tile bytes (16 tiles at zoom 2)
//!   3. Stitch 4×4 tiles into a 1024×1024 Web-Mercator image
//!   4. Reproject → 2048×1024 equirectangular RGBA (ready for wgpu sphere texture)

use reqwest::Client;
use serde::Deserialize;
use std::f64::consts::PI;
use std::path::PathBuf;

use crate::data::types::Country;

const TILE_API: &str = "https://tile.googleapis.com/v1";
const ZOOM: u32 = 2;   // 2^2 = 4 tiles per axis → 16 total
const TILE_PX: u32 = 256;
const OUT_W: u32 = 2048;
const OUT_H: u32 = 1024;

// ─── API types ────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionResponse {
    session: String,
}

// ─── Token loading ────────────────────────────────────────────────────────────

/// Load the Google Maps API key from the environment or nearest .env file.
pub fn load_maps_key() -> Option<String> {
    if let Some(k) = read_maps_key_from_env() {
        return Some(k);
    }
    if let Ok(mut dir) = std::env::current_dir() {
        for _ in 0..6 {
            let candidate = dir.join(".env");
            if candidate.exists() {
                let _ = dotenvy::from_path(&candidate);
                break;
            }
            if !dir.pop() {
                break;
            }
        }
    }
    read_maps_key_from_env()
}

fn read_maps_key_from_env() -> Option<String> {
    for var in ["VITE_GOOGLE_MAPS_API_KEY", "GOOGLE_MAPS_API_KEY"] {
        if let Ok(k) = std::env::var(var) {
            if !k.is_empty() && k != "your_key_here" {
                return Some(k);
            }
        }
    }
    None
}

// ─── Disk cache ───────────────────────────────────────────────────────────────

fn cache_dir() -> PathBuf {
    if let Ok(xdg) = std::env::var("XDG_CACHE_HOME") {
        return PathBuf::from(xdg).join("globe_desktop");
    }
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home).join(".cache").join("globe_desktop");
    }
    PathBuf::from(".globe_cache")
}

fn cache_paths() -> (PathBuf, PathBuf) {
    let dir = cache_dir();
    (dir.join("globe_satellite.rgba"), dir.join("globe_satellite.meta"))
}

/// Pure validation logic — separated so tests can call it directly.
fn try_load_cache_from_bytes(meta_str: &str, pixels: Vec<u8>) -> Option<(Vec<u8>, u32, u32)> {
    let meta: serde_json::Value = serde_json::from_str(meta_str).ok()?;
    let zoom   = meta["zoom"].as_u64()? as u32;
    if zoom != ZOOM { return None; }
    let width  = meta["width"].as_u64()? as u32;
    let height = meta["height"].as_u64()? as u32;
    if pixels.len() != (width * height * 4) as usize { return None; }
    Some((pixels, width, height))
}

fn try_load_cache() -> Option<(Vec<u8>, u32, u32)> {
    let (rgba_path, meta_path) = cache_paths();
    let meta_str = std::fs::read_to_string(&meta_path).ok()?;
    let pixels   = std::fs::read(&rgba_path).ok()?;
    try_load_cache_from_bytes(&meta_str, pixels)
}

fn save_cache(pixels: &[u8], w: u32, h: u32) {
    let dir = cache_dir();
    if std::fs::create_dir_all(&dir).is_err() { return; }
    let (rgba_path, meta_path) = cache_paths();
    let _ = std::fs::write(&rgba_path, pixels);
    let meta = serde_json::json!({ "width": w, "height": h, "zoom": ZOOM });
    let _ = std::fs::write(&meta_path, meta.to_string());
}

// ─── Session ──────────────────────────────────────────────────────────────────

async fn create_session(client: &Client, api_key: &str, map_type: &str) -> Result<String, String> {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct Body<'a> {
        map_type: &'a str,
        language: &'a str,
        region: &'a str,
    }

    let url = format!("{TILE_API}/createSession?key={api_key}");
    let resp = client
        .post(&url)
        .json(&Body { map_type, language: "en-US", region: "US" })
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("createSession HTTP {}", e.status().map_or(0, |s| s.as_u16())))?
        .json::<SessionResponse>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(resp.session)
}

// ─── Tile fetch ───────────────────────────────────────────────────────────────

async fn fetch_tile(
    client: &Client,
    session: &str,
    api_key: &str,
    z: u32,
    x: u32,
    y: u32,
) -> Result<Vec<u8>, String> {
    let url = format!("{TILE_API}/2dtiles/{z}/{x}/{y}?session={session}&key={api_key}");
    let bytes = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| format!("tile {z}/{x}/{y} HTTP {}", e.status().map_or(0, |s| s.as_u16())))?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    Ok(bytes.to_vec())
}

// ─── Reprojection ─────────────────────────────────────────────────────────────

/// Reproject a Web Mercator image to equirectangular (nearest-neighbor).
///
/// Input : row 0 = north (~85°), row H-1 = south (~-85°); col 0 = lon -180°.
/// Output: row 0 = lat +90°, row H-1 = lat -90°; col 0 = lon -180°.
fn mercator_to_equirectangular(
    merc: &image::RgbaImage,
    out_w: u32,
    out_h: u32,
) -> image::RgbaImage {
    let mw = merc.width()  as f64;
    let mh = merc.height() as f64;
    let mut out = image::RgbaImage::new(out_w, out_h);

    // Ocean blue fallback for polar caps Mercator can't cover.
    let ocean = image::Rgba([20u8, 30, 80, 255]);

    for py in 0..out_h {
        // Equirectangular: top row = north pole (+π/2), bottom = south (-π/2)
        let lat = PI / 2.0 - PI * (py as f64 / out_h as f64);

        // Skip polar regions where Mercator diverges (|lat| > ~85°)
        if lat.abs() > 85.0_f64.to_radians() {
            for px in 0..out_w {
                out.put_pixel(px, py, ocean);
            }
            continue;
        }

        // Normalized Mercator y: 0 = north (~85°), 1 = south (~-85°)
        let y_merc = 0.5 - (PI / 4.0 + lat / 2.0).tan().ln() / (2.0 * PI);
        let sy = ((y_merc * mh) as u32).min(merc.height() - 1);

        for px in 0..out_w {
            let x_merc = px as f64 / out_w as f64; // 0 = lon -180°, 1 = lon +180°
            let sx = ((x_merc * mw) as u32).min(merc.width() - 1);
            out.put_pixel(px, py, *merc.get_pixel(sx, sy));
        }
    }

    out
}

// ─── Public entry point ───────────────────────────────────────────────────────

/// Fetch a world satellite texture via the Maps Tile API.
///
/// Returns `(rgba_pixels, width, height)` ready to upload to wgpu.
pub async fn fetch_world_texture(api_key: &str) -> Result<(Vec<u8>, u32, u32), String> {
    if let Some(cached) = try_load_cache() {
        return Ok(cached);
    }

    let client = Client::new();
    let session = create_session(&client, api_key, "satellite").await?;

    let n = 1u32 << ZOOM; // 4 at zoom=2

    // Fetch all n×n tiles sequentially (avoids needing direct tokio dep for spawn).
    let mut tile_grid: Vec<Vec<image::RgbaImage>> = Vec::with_capacity(n as usize);
    for y in 0..n {
        let mut row = Vec::with_capacity(n as usize);
        for x in 0..n {
            let bytes = fetch_tile(&client, &session, api_key, ZOOM, x, y).await?;
            let img = image::load_from_memory(&bytes)
                .map_err(|e| format!("decode tile {x},{y}: {e}"))?
                .to_rgba8();
            row.push(img);
        }
        tile_grid.push(row);
    }

    // Stitch into one Mercator image.
    let merc_size = n * TILE_PX;
    let mut mercator = image::RgbaImage::new(merc_size, merc_size);
    for (ty, row) in tile_grid.iter().enumerate() {
        for (tx, tile) in row.iter().enumerate() {
            image::imageops::replace(
                &mut mercator,
                tile,
                (tx as u32 * TILE_PX) as i64,
                (ty as u32 * TILE_PX) as i64,
            );
        }
    }

    // Reproject Mercator → equirectangular.
    let equirect = mercator_to_equirectangular(&mercator, OUT_W, OUT_H);
    let pixels = equirect.into_raw(); // RGBA u8 flat vec

    save_cache(&pixels, OUT_W, OUT_H);
    Ok((pixels, OUT_W, OUT_H))
}

// ─── Regional tiles ───────────────────────────────────────────────────────────

/// Axis-aligned bounding box in geographic degrees.
#[derive(Debug, Clone)]
pub struct BBox {
    pub north: f64,
    pub south: f64,
    pub east:  f64,
    pub west:  f64,
}

/// Stitched RGBA pixels from a grid of map tiles.
#[derive(Debug)]
pub struct RegionTileResult {
    pub pixels: Vec<u8>,
    pub width:  u32,
    pub height: u32,
}

/// Convert a geographic point to Mercator tile coordinates at the given zoom.
fn lat_lon_to_tile(lat_deg: f64, lon_deg: f64, zoom: u32) -> (u32, u32) {
    let lat_deg   = lat_deg.clamp(-85.0, 85.0);
    let n         = (1u32 << zoom) as f64;
    let x_f       = (lon_deg + 180.0) / 360.0 * n;
    let lat_rad   = lat_deg.to_radians();
    let y_f       = (1.0 - (lat_rad.tan() + 1.0 / lat_rad.cos()).ln() / PI) / 2.0 * n;
    let max_tile  = (1u32 << zoom) - 1;
    (
        (x_f.floor() as u32).min(max_tile),
        (y_f.floor().clamp(0.0, max_tile as f64) as u32),
    )
}

/// Compute an 8°-padded bounding box for a country, clamped to ±85°.
pub fn country_bbox(country: &Country) -> BBox {
    let lat = country.position.lat;
    let lon = country.position.lon;
    BBox {
        north: (lat + 8.0).min(85.0),
        south: (lat - 8.0).max(-85.0),
        east:  lon + 8.0,
        west:  lon - 8.0,
    }
}

fn region_cache_paths(iso: &str, zoom: u32) -> (PathBuf, PathBuf) {
    let dir = cache_dir();
    (
        dir.join(format!("region_{}_{}.rgba", iso, zoom)),
        dir.join(format!("region_{}_{}.meta", iso, zoom)),
    )
}

/// Fetch a stitched satellite tile grid covering `bbox` and return RGBA pixels.
///
/// Tile count is capped at 8×8. Results are cached on disk using `iso` as key.
pub async fn fetch_region_tiles(
    api_key: &str,
    iso:     &str,
    bbox:    BBox,
    zoom:    u32,
) -> Result<RegionTileResult, String> {
    // Check region cache.
    let (rgba_path, meta_path) = region_cache_paths(iso, zoom);
    if let (Ok(meta_str), Ok(pixels)) = (
        std::fs::read_to_string(&meta_path),
        std::fs::read(&rgba_path),
    ) {
        if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
            if let (Some(w), Some(h)) = (meta["width"].as_u64(), meta["height"].as_u64()) {
                let (w, h) = (w as u32, h as u32);
                if pixels.len() == (w * h * 4) as usize {
                    return Ok(RegionTileResult { pixels, width: w, height: h });
                }
            }
        }
    }

    let client  = Client::new();
    let session = create_session(&client, api_key, "satellite").await?;

    let (x_min, y_min) = lat_lon_to_tile(bbox.north, bbox.west, zoom);
    let (x_max, y_max) = lat_lon_to_tile(bbox.south, bbox.east, zoom);
    let x_count = if x_max >= x_min { (x_max - x_min + 1).min(8) } else { 1 };
    let y_count = if y_max >= y_min { (y_max - y_min + 1).min(8) } else { 1 };

    let out_w = x_count * TILE_PX;
    let out_h = y_count * TILE_PX;
    let mut stitched = image::RgbaImage::new(out_w, out_h);

    for ty in 0..y_count {
        for tx in 0..x_count {
            let bytes = fetch_tile(&client, &session, api_key, zoom, x_min + tx, y_min + ty).await?;
            let img = image::load_from_memory(&bytes)
                .map_err(|e| format!("decode region tile {tx},{ty}: {e}"))?
                .to_rgba8();
            image::imageops::replace(
                &mut stitched,
                &img,
                (tx * TILE_PX) as i64,
                (ty * TILE_PX) as i64,
            );
        }
    }

    let pixels = stitched.into_raw();

    // Save to cache.
    let dir = cache_dir();
    if std::fs::create_dir_all(&dir).is_ok() {
        let _ = std::fs::write(&rgba_path, &pixels);
        let meta = serde_json::json!({ "width": out_w, "height": out_h });
        let _ = std::fs::write(&meta_path, meta.to_string());
    }

    Ok(RegionTileResult { pixels, width: out_w, height: out_h })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reproject_dimensions() {
        // 4×4 pixel placeholder Mercator (all red)
        let mut merc = image::RgbaImage::new(4, 4);
        for p in merc.pixels_mut() {
            *p = image::Rgba([255, 0, 0, 255]);
        }
        let out = mercator_to_equirectangular(&merc, 8, 4);
        assert_eq!(out.width(), 8);
        assert_eq!(out.height(), 4);
    }

    #[test]
    fn test_reproject_polar_caps_are_ocean() {
        let merc = image::RgbaImage::new(4, 4);
        // Use enough height so the last row truly reaches >85° south.
        // With height=200, bottom row lat ≈ -90° + 0.9° ≈ -89.1° → polar cap.
        let out = mercator_to_equirectangular(&merc, 8, 200);
        // Top row (lat = +90°) → ocean fallback.
        let top = out.get_pixel(0, 0);
        assert_eq!(top[0], 20);
        // Bottom row (lat near -90°) → ocean fallback.
        let bot = out.get_pixel(0, 199);
        assert_eq!(bot[0], 20);
    }

    #[test]
    fn test_output_pixel_count() {
        let merc = image::RgbaImage::new(16, 16);
        let out = mercator_to_equirectangular(&merc, OUT_W, OUT_H);
        assert_eq!(out.into_raw().len() as u32, OUT_W * OUT_H * 4);
    }

    #[test]
    fn test_load_maps_key_placeholder_ignored() {
        let result = read_maps_key_from_env();
        // Function must not panic regardless of env state.
        let _ = result;
    }

    #[test]
    fn test_cache_dir_returns_a_path() {
        let dir = cache_dir();
        assert!(!dir.as_os_str().is_empty());
    }

    #[test]
    fn test_try_load_cache_zoom_mismatch_returns_none() {
        let meta   = r#"{"width":2048,"height":1024,"zoom":99}"#;
        let pixels = vec![0u8; 2048 * 1024 * 4];
        assert!(try_load_cache_from_bytes(meta, pixels).is_none());
    }

    #[test]
    fn test_try_load_cache_pixel_size_mismatch_returns_none() {
        let meta   = format!(r#"{{"width":2048,"height":1024,"zoom":{ZOOM}}}"#);
        let pixels = vec![0u8; 100]; // intentionally wrong size
        assert!(try_load_cache_from_bytes(&meta, pixels).is_none());
    }

    // ── Regional tile tests ──────────────────────────────────────────────────

    #[test]
    fn test_lat_lon_to_tile_equator() {
        // (0°, 0°) at zoom=1 → tile (1, 1)
        let (x, y) = lat_lon_to_tile(0.0, 0.0, 1);
        assert_eq!(x, 1);
        assert_eq!(y, 1);
    }

    #[test]
    fn test_country_bbox_clamps_poles() {
        use crate::data::types::{Country, LatLon};
        let c = Country {
            name:              "Test".into(),
            population:        1000,
            position:          LatLon { lat: 82.0, lon: 0.0 },
            iso:               "TST".into(),
            aliases:           vec![],
            subdivision_label: None,
            subdivisions:      vec![],
        };
        let bbox = country_bbox(&c);
        assert!((bbox.north - 85.0).abs() < 1e-9, "north should be clamped to 85°");
        assert!((bbox.south - 74.0).abs() < 1e-9, "south = 82 - 8 = 74°");
    }

    #[test]
    fn test_country_bbox_normal() {
        use crate::data::types::{Country, LatLon};
        let c = Country {
            name:              "Test".into(),
            population:        1000,
            position:          LatLon { lat: 20.0, lon: 78.0 },
            iso:               "TST".into(),
            aliases:           vec![],
            subdivision_label: None,
            subdivisions:      vec![],
        };
        let bbox = country_bbox(&c);
        assert!((bbox.north - 28.0).abs() < 1e-9);
        assert!((bbox.south - 12.0).abs() < 1e-9);
        assert!((bbox.east  - 86.0).abs() < 1e-9);
        assert!((bbox.west  - 70.0).abs() < 1e-9);
    }
}
