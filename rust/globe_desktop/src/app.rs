use std::collections::HashSet;
use std::time::Duration;

use iced::widget::{container, row};
use iced::widget::shader::Shader;
use iced::theme::Palette;
use iced::{Color, Element, Length, Subscription, Task, Theme};

use std::sync::Arc;

use crate::cesium::ion_api::{IonAsset, IonClient, IonEndpoint, IonStatus, load_ion_token};
use crate::cesium::maps_api::{country_bbox, fetch_region_tiles, fetch_world_texture, load_maps_key};
use crate::data::loader::load_countries_from_str;
use crate::data::types::Country;
use crate::renderer::GlobeProgram;
use crate::ui::sidebar::sidebar_view;
use crate::ui::theme::GlobeTheme;

/// Embedded country data (compiled into the binary at build time).
const COUNTRIES_JSON: &str = include_str!("../assets/countries.json");

/// Messages the application can receive.
#[derive(Debug, Clone)]
pub enum Message {
    /// Search text changed.
    SearchChanged(String),
    /// A country was selected (index into countries vec).
    SelectCountry(usize),
    /// A subdivision was selected (country index, subdivision index).
    SelectSubdivision(usize, usize),
    /// Toggle auto-rotation on/off.
    ToggleRotation,
    /// Expand/collapse a country's subdivisions.
    ToggleExpand(usize),
    /// Countries data finished loading.
    CountriesLoaded(Vec<Country>),
    /// Animation tick for auto-rotation.
    Tick,
    /// Cesium Ion connected successfully.
    IonLoaded { username: String, assets: Vec<IonAsset> },
    /// Cesium Ion connection failed.
    IonFailed(String),
    /// Google Maps satellite texture downloaded and reprojected.
    MapsTextureLoaded { pixels: Arc<Vec<u8>>, width: u32, height: u32 },
    /// Google Maps tile fetch failed.
    MapsFailed(String),
    /// User clicked an Ion asset row — fetch its endpoint.
    SelectIonAsset(u64),
    /// Ion asset endpoint loaded successfully.
    IonEndpointLoaded { asset_id: u64, endpoint: IonEndpoint },
    /// Ion asset endpoint fetch failed.
    IonEndpointFailed { asset_id: u64, error: String },
    /// Regional satellite tiles loaded for a country.
    RegionTilesLoaded { country_idx: usize, pixels: Arc<Vec<u8>>, width: u32, height: u32 },
    /// Regional tile fetch failed.
    RegionTilesFailed(String),
}

/// Application state.
pub struct GlobeApp {
    pub countries: Vec<Country>,
    pub search_query: String,
    pub selected_country: Option<usize>,
    pub selected_subdivision: Option<(usize, usize)>,
    pub expanded: HashSet<usize>,
    pub auto_rotate: bool,
    /// Accumulated auto-rotation angle (radians). Combined with drag yaw in GlobeState.
    pub rotation: f32,
    /// Cesium Ion connection status.
    pub ion_status: IonStatus,
    /// Cesium Ion assets from /v1/assets.
    pub ion_assets: Vec<IonAsset>,
    /// Satellite texture pixels (None until downloaded).
    pub maps_texture: Option<Arc<Vec<u8>>>,
    pub maps_texture_w: u32,
    pub maps_texture_h: u32,
    /// Currently selected Ion asset id (for endpoint fetch).
    pub selected_ion_asset:   Option<u64>,
    /// Loaded endpoint for the selected Ion asset.
    pub ion_endpoint:         Option<IonEndpoint>,
    /// True while the endpoint request is in flight.
    pub ion_endpoint_loading: bool,
    /// Cached regional satellite texture for the selected country.
    pub region_texture: Option<(Arc<Vec<u8>>, u32, u32)>,
    /// Country index for which region_texture was fetched.
    pub region_for_idx: Option<usize>,
}

impl GlobeApp {
    pub fn new() -> (Self, Task<Message>) {
        let app = Self {
            countries: Vec::new(),
            search_query: String::new(),
            selected_country: None,
            selected_subdivision: None,
            expanded: HashSet::new(),
            auto_rotate: true,
            rotation: 0.0,
            ion_status:      IonStatus::Loading,
            ion_assets:      Vec::new(),
            maps_texture:    None,
            maps_texture_w:  0,
            maps_texture_h:  0,
            selected_ion_asset:   None,
            ion_endpoint:         None,
            ion_endpoint_loading: false,
            region_texture: None,
            region_for_idx: None,
        };

        let load_task = Task::perform(
            async { load_countries_from_str(COUNTRIES_JSON).unwrap_or_default() },
            Message::CountriesLoaded,
        );

        let ion_task = Task::perform(
            async {
                let token = match load_ion_token() {
                    Some(t) => t,
                    None    => return Err("No token — set VITE_CESIUM_ION_TOKEN in .env".into()),
                };
                let client = IonClient::new(token);
                let me     = client.get_me().await?;
                let list   = client.list_assets(200).await?;
                Ok((me.username, list.items))
            },
            |result: Result<(String, Vec<IonAsset>), String>| match result {
                Ok((username, assets)) => Message::IonLoaded { username, assets },
                Err(e)                 => Message::IonFailed(e),
            },
        );

        let maps_task = Task::perform(
            async {
                let key = match load_maps_key() {
                    Some(k) => k,
                    None    => return Err("No VITE_GOOGLE_MAPS_API_KEY in .env".into()),
                };
                fetch_world_texture(&key).await
            },
            |result: Result<(Vec<u8>, u32, u32), String>| match result {
                Ok((pixels, w, h)) => Message::MapsTextureLoaded {
                    pixels: Arc::new(pixels),
                    width:  w,
                    height: h,
                },
                Err(e) => Message::MapsFailed(e),
            },
        );

        (app, Task::batch([load_task, ion_task, maps_task]))
    }

    pub fn title(&self) -> String {
        "Globe — Population Explorer".into()
    }

    pub fn theme(&self) -> Theme {
        Theme::custom(
            "Globe",
            Palette {
                background: GlobeTheme::BACKGROUND,
                text:       GlobeTheme::TEXT_PRIMARY,
                primary:    GlobeTheme::ACCENT,
                success:    Color::from_rgb(0.24, 0.65, 0.40),
                warning:    Color::from_rgb(0.85, 0.60, 0.15),
                danger:     Color::from_rgb(0.78, 0.25, 0.25),
            },
        )
    }

    pub fn update(&mut self, message: Message) -> Task<Message> {
        match message {
            Message::SearchChanged(query) => {
                self.search_query = query;
            }
            Message::SelectCountry(idx) => {
                if self.selected_country == Some(idx) {
                    // Toggle expand on re-select
                    if self.expanded.contains(&idx) {
                        self.expanded.remove(&idx);
                    } else {
                        self.expanded.insert(idx);
                    }
                } else {
                    self.selected_country = Some(idx);
                    self.selected_subdivision = None;
                    // Auto-expand on first select
                    self.expanded.insert(idx);
                }
                // Fetch regional satellite inset if we don't already have it.
                if self.region_for_idx != Some(idx) {
                    self.region_texture = None;
                    self.region_for_idx = None;
                    if let Some(key) = load_maps_key() {
                        if let Some(country) = self.countries.get(idx) {
                            let iso  = country.iso.clone();
                            let bbox = country_bbox(country);
                            return Task::perform(
                                async move {
                                    fetch_region_tiles(&key, &iso, bbox, 5).await
                                        .map(|r| (idx, r))
                                },
                                |result| match result {
                                    Ok((country_idx, r)) => Message::RegionTilesLoaded {
                                        country_idx,
                                        pixels: Arc::new(r.pixels),
                                        width:  r.width,
                                        height: r.height,
                                    },
                                    Err(e) => Message::RegionTilesFailed(e),
                                },
                            );
                        }
                    }
                }
            }
            Message::SelectSubdivision(country_idx, sub_idx) => {
                self.selected_country = Some(country_idx);
                self.selected_subdivision = Some((country_idx, sub_idx));
            }
            Message::ToggleRotation => {
                self.auto_rotate = !self.auto_rotate;
            }
            Message::ToggleExpand(idx) => {
                if self.expanded.contains(&idx) {
                    self.expanded.remove(&idx);
                } else {
                    self.expanded.insert(idx);
                }
            }
            Message::CountriesLoaded(countries) => {
                self.countries = countries;
            }
            Message::Tick => {
                if self.auto_rotate {
                    self.rotation += 0.003;
                }
            }
            Message::IonLoaded { username, assets } => {
                self.ion_status = IonStatus::Connected(username);
                self.ion_assets = assets;
            }
            Message::IonFailed(e) => {
                self.ion_status = if e.contains("No token") {
                    IonStatus::NoToken
                } else {
                    IonStatus::Error(e)
                };
            }
            Message::MapsTextureLoaded { pixels, width, height } => {
                self.maps_texture   = Some(pixels);
                self.maps_texture_w = width;
                self.maps_texture_h = height;
            }
            Message::MapsFailed(e) => {
                eprintln!("Maps tile fetch failed: {e}");
            }
            Message::SelectIonAsset(id) => {
                if self.selected_ion_asset == Some(id) {
                    return Task::none();
                }
                self.selected_ion_asset   = Some(id);
                self.ion_endpoint         = None;
                self.ion_endpoint_loading = true;
                let token = match load_ion_token() {
                    Some(t) => t,
                    None    => { self.ion_endpoint_loading = false; return Task::none(); }
                };
                return Task::perform(
                    async move {
                        let client = IonClient::new(token);
                        client.get_asset_endpoint(id).await
                            .map(|ep| (id, ep))
                            .map_err(|e| (id, e))
                    },
                    |res| match res {
                        Ok((asset_id, endpoint)) => Message::IonEndpointLoaded { asset_id, endpoint },
                        Err((asset_id, error))   => Message::IonEndpointFailed { asset_id, error },
                    },
                );
            }
            Message::IonEndpointLoaded { asset_id, endpoint } => {
                if self.selected_ion_asset == Some(asset_id) {
                    self.ion_endpoint         = Some(endpoint);
                    self.ion_endpoint_loading = false;
                }
            }
            Message::IonEndpointFailed { asset_id, error } => {
                if self.selected_ion_asset == Some(asset_id) {
                    self.ion_endpoint_loading = false;
                    eprintln!("Ion endpoint failed: {error}");
                }
            }
            Message::RegionTilesLoaded { country_idx, pixels, width, height } => {
                if self.selected_country == Some(country_idx) {
                    self.region_texture = Some((pixels, width, height));
                    self.region_for_idx = Some(country_idx);
                }
            }
            Message::RegionTilesFailed(e) => {
                eprintln!("Region tile fetch failed: {e}");
            }
        }
        Task::none()
    }

    pub fn subscription(&self) -> Subscription<Message> {
        if self.auto_rotate {
            iced::time::every(Duration::from_millis(16)).map(|_| Message::Tick)
        } else {
            Subscription::none()
        }
    }

    pub fn view(&self) -> Element<'_, Message> {
        let sidebar = sidebar_view(
            &self.countries,
            &self.search_query,
            self.selected_country,
            self.selected_subdivision,
            &self.expanded,
            self.auto_rotate,
            &self.ion_status,
            &self.ion_assets,
            self.selected_ion_asset,
            self.ion_endpoint.as_ref(),
            self.ion_endpoint_loading,
            self.region_texture.as_ref(),
        );

        let globe = Shader::new(GlobeProgram {
            countries:        self.countries.clone(),
            rotation:         self.rotation,
            texture:          self.maps_texture.clone(),
            texture_width:    self.maps_texture_w,
            texture_height:   self.maps_texture_h,
            on_country_click: Message::SelectCountry,
        })
        .width(Length::Fill)
        .height(Length::Fill);

        let layout = row![sidebar, globe];

        container(layout)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cesium::ion_api::IonAttribution;
    use crate::data::types::{LatLon, Subdivision};

    fn sample_countries() -> Vec<Country> {
        vec![
            Country {
                name: "India".into(),
                population: 1_476_625_576,
                position: LatLon { lat: 20.59, lon: 78.96 },
                iso: "IND".into(),
                aliases: vec![],
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
                aliases: vec![],
                subdivision_label: Some("State".into()),
                subdivisions: vec![],
            },
        ]
    }

    #[test]
    fn test_app_initial_state() {
        let (app, _) = GlobeApp::new();
        assert!(app.countries.is_empty());
        assert!(app.search_query.is_empty());
        assert!(app.selected_country.is_none());
        assert!(app.selected_subdivision.is_none());
        assert!(app.expanded.is_empty());
        assert!(app.auto_rotate);
    }

    #[test]
    fn test_search_changed() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::SearchChanged("india".into()));
        assert_eq!(app.search_query, "india");
    }

    #[test]
    fn test_select_country() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();
        let _ = app.update(Message::SelectCountry(0));
        assert_eq!(app.selected_country, Some(0));
        assert!(app.expanded.contains(&0));
    }

    #[test]
    fn test_select_country_toggle_expand() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();

        // First select -> expands
        let _ = app.update(Message::SelectCountry(0));
        assert!(app.expanded.contains(&0));

        // Second select of same -> collapses
        let _ = app.update(Message::SelectCountry(0));
        assert!(!app.expanded.contains(&0));

        // Third select -> expands again
        let _ = app.update(Message::SelectCountry(0));
        assert!(app.expanded.contains(&0));
    }

    #[test]
    fn test_select_subdivision() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();
        let _ = app.update(Message::SelectSubdivision(0, 0));
        assert_eq!(app.selected_country, Some(0));
        assert_eq!(app.selected_subdivision, Some((0, 0)));
    }

    #[test]
    fn test_toggle_rotation() {
        let (mut app, _) = GlobeApp::new();
        assert!(app.auto_rotate);
        let _ = app.update(Message::ToggleRotation);
        assert!(!app.auto_rotate);
        let _ = app.update(Message::ToggleRotation);
        assert!(app.auto_rotate);
    }

    #[test]
    fn test_toggle_expand() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::ToggleExpand(5));
        assert!(app.expanded.contains(&5));
        let _ = app.update(Message::ToggleExpand(5));
        assert!(!app.expanded.contains(&5));
    }

    #[test]
    fn test_countries_loaded() {
        let (mut app, _) = GlobeApp::new();
        assert!(app.countries.is_empty());
        let _ = app.update(Message::CountriesLoaded(sample_countries()));
        assert_eq!(app.countries.len(), 2);
        assert_eq!(app.countries[0].name, "India");
    }

    #[test]
    fn test_title() {
        let (app, _) = GlobeApp::new();
        assert!(app.title().contains("Globe"));
    }

    // ── Feature C tests ──────────────────────────────────────────────────────

    fn sample_endpoint() -> IonEndpoint {
        IonEndpoint {
            url:           "https://assets.cesium.com/1/".into(),
            access_token:  "tok".into(),
            endpoint_type: "TERRAIN".into(),
            attributions:  vec![],
        }
    }

    #[test]
    fn test_select_ion_asset_sets_loading() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::SelectIonAsset(1));
        assert_eq!(app.selected_ion_asset, Some(1));
        // Either loading flag is true (token present) or false (no token) — never panics.
        assert!(app.ion_endpoint.is_none());
    }

    #[test]
    fn test_ion_endpoint_loaded_stores_result() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::SelectIonAsset(1));
        let _ = app.update(Message::IonEndpointLoaded { asset_id: 1, endpoint: sample_endpoint() });
        assert!(app.ion_endpoint.is_some());
        assert!(!app.ion_endpoint_loading);
    }

    #[test]
    fn test_ion_endpoint_loaded_wrong_id_ignored() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::SelectIonAsset(1));
        let _ = app.update(Message::IonEndpointLoaded { asset_id: 2, endpoint: sample_endpoint() });
        assert!(app.ion_endpoint.is_none());
    }

    // ── Feature D tests ──────────────────────────────────────────────────────

    #[test]
    fn test_region_tiles_loaded_stores_texture() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();
        let _ = app.update(Message::SelectCountry(0));
        let pixels = Arc::new(vec![0u8; 256 * 256 * 4]);
        let _ = app.update(Message::RegionTilesLoaded {
            country_idx: 0,
            pixels: pixels.clone(),
            width:  256,
            height: 256,
        });
        assert!(app.region_texture.is_some());
        assert_eq!(app.region_for_idx, Some(0));
    }

    #[test]
    fn test_region_tiles_loaded_wrong_idx_ignored() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();
        let _ = app.update(Message::SelectCountry(0));
        let pixels = Arc::new(vec![0u8; 256 * 256 * 4]);
        let _ = app.update(Message::RegionTilesLoaded {
            country_idx: 99, // not selected
            pixels,
            width:  256,
            height: 256,
        });
        assert!(app.region_texture.is_none());
    }

    #[test]
    fn test_region_tiles_failed_does_not_crash() {
        let (mut app, _) = GlobeApp::new();
        let _ = app.update(Message::RegionTilesFailed("some error".into()));
        assert!(app.region_texture.is_none());
    }

    #[test]
    fn test_selecting_different_country_clears_subdivision() {
        let (mut app, _) = GlobeApp::new();
        app.countries = sample_countries();
        let _ = app.update(Message::SelectSubdivision(0, 0));
        assert_eq!(app.selected_subdivision, Some((0, 0)));

        let _ = app.update(Message::SelectCountry(1));
        assert_eq!(app.selected_country, Some(1));
        assert!(app.selected_subdivision.is_none());
    }
}
