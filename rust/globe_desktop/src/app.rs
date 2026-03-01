use std::collections::HashSet;

use iced::widget::{container, row, text};
use iced::{Element, Length, Task, Theme};

use crate::data::types::Country;
use crate::ui::sidebar::sidebar_view;

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
}

/// Application state.
pub struct GlobeApp {
    pub countries: Vec<Country>,
    pub search_query: String,
    pub selected_country: Option<usize>,
    pub selected_subdivision: Option<(usize, usize)>,
    pub expanded: HashSet<usize>,
    pub auto_rotate: bool,
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
        };
        (app, Task::none())
    }

    pub fn title(&self) -> String {
        "Globe — Population Explorer".into()
    }

    pub fn theme(&self) -> Theme {
        Theme::Dark
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
        }
        Task::none()
    }

    pub fn view(&self) -> Element<'_, Message> {
        let sidebar = sidebar_view(
            &self.countries,
            &self.search_query,
            self.selected_country,
            &self.expanded,
            self.auto_rotate,
        );

        // Globe placeholder — will be replaced with wgpu renderer
        let globe_placeholder = container(
            text("Globe Viewport (wgpu)").size(24),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .center_x(Length::Fill)
        .center_y(Length::Fill);

        let layout = row![sidebar, globe_placeholder];

        container(layout)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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
