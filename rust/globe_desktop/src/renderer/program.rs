use glam::Vec3;
use iced::mouse;
use iced::{Event, Point, Rectangle};
use iced::widget::shader;

use crate::app::Message;
use crate::data::types::Country;
use crate::utils::format::population_color;
use crate::renderer::camera::{Camera, lat_lon_to_xyz, ray_from_ndc, ray_sphere_intersect};
use crate::renderer::pipeline::{
    GlobeUniforms, MarkerUniforms, MarkerInstance, GlobePrimitive,
};

// ─── GlobeState ───────────────────────────────────────────────────────────────

/// Internal state managed by the shader widget across frames.
#[derive(Debug, Default)]
pub struct GlobeState {
    /// Accumulated yaw offset from mouse drag (radians).
    pub yaw: f32,
    /// Accumulated pitch offset from mouse drag (radians).
    pub pitch: f32,
    /// Drag start position (cleared on release).
    pub drag_start: Option<Point>,
    /// Position where the button was first pressed (used for click detection).
    pub press_pos: Option<Point>,
}

// ─── GlobeProgram ─────────────────────────────────────────────────────────────

/// Iced shader program for the 3D globe.
pub struct GlobeProgram {
    pub countries:        Vec<Country>,
    /// Auto-rotation angle from the app tick (radians).
    pub rotation:         f32,
    /// Satellite texture pixels (None until downloaded, Arc to avoid deep clone).
    pub texture:          Option<std::sync::Arc<Vec<u8>>>,
    pub texture_width:    u32,
    pub texture_height:   u32,
    /// Callback that maps a country index to the app message emitted on click.
    pub on_country_click: fn(usize) -> Message,
}

impl shader::Program<Message> for GlobeProgram {
    type State     = GlobeState;
    type Primitive = GlobePrimitive;

    fn draw(
        &self,
        state: &GlobeState,
        _cursor: mouse::Cursor,
        bounds: Rectangle,
    ) -> GlobePrimitive {
        let total_yaw = state.yaw + self.rotation;
        let pitch     = if state.pitch == 0.0 { 0.3 } else { state.pitch };

        let cam = Camera { yaw: total_yaw, pitch, distance: 3.0 };

        let aspect = if bounds.height > 0.0 { bounds.width / bounds.height } else { 1.0 };
        let mvp    = cam.mvp(aspect);
        let right  = cam.right();
        let up     = cam.up();
        let eye    = cam.eye();

        let globe_uniforms = GlobeUniforms {
            mvp:         mvp.to_cols_array_2d(),
            time:        0.0,
            use_texture: if self.texture.is_some() { 1.0 } else { 0.0 },
            _pad:        [0.0; 2],
        };

        let marker_uniforms = MarkerUniforms {
            view_proj:    mvp.to_cols_array_2d(),
            camera_right: [right.x, right.y, right.z, 0.0],
            camera_up:    [up.x,    up.y,    up.z,    0.0],
            camera_eye:   [eye.x,   eye.y,   eye.z,   0.0],
        };

        let markers = build_markers(&self.countries);

        GlobePrimitive {
            globe_uniforms,
            marker_uniforms,
            markers,
            texture_pixels:  self.texture.clone(),   // Arc clone — O(1)
            texture_width:   self.texture_width,
            texture_height:  self.texture_height,
        }
    }

    fn update(
        &self,
        state: &mut GlobeState,
        event: &Event,
        bounds: Rectangle,
        cursor: mouse::Cursor,
    ) -> Option<shader::Action<Message>> {
        match event {
            Event::Mouse(mouse::Event::ButtonPressed(mouse::Button::Left)) => {
                if let mouse::Cursor::Available(pos) = cursor {
                    if bounds.contains(pos) {
                        state.drag_start = Some(pos);
                        state.press_pos  = Some(pos);
                        return Some(shader::Action::capture());
                    }
                }
            }
            Event::Mouse(mouse::Event::CursorMoved { position }) => {
                if let Some(start) = state.drag_start {
                    let dx = position.x - start.x;
                    let dy = position.y - start.y;
                    state.yaw   -= dx * 0.005;
                    state.pitch  = (state.pitch - dy * 0.005).clamp(-1.4, 1.4);
                    state.drag_start = Some(*position);
                    return Some(shader::Action::request_redraw().and_capture());
                }
            }
            Event::Mouse(mouse::Event::ButtonReleased(mouse::Button::Left)) => {
                if let Some(press) = state.press_pos.take() {
                    if let mouse::Cursor::Available(pos) = cursor {
                        let dx = pos.x - press.x;
                        let dy = pos.y - press.y;
                        // Click = release within 4 px of press position.
                        if dx * dx + dy * dy < 16.0 {
                            let total_yaw = state.yaw + self.rotation;
                            let pitch = if state.pitch == 0.0 { 0.3 } else { state.pitch };
                            if let Some(idx) = pick_country(pos, bounds, total_yaw, pitch, &self.countries) {
                                state.drag_start = None;
                                return Some(shader::Action::publish((self.on_country_click)(idx)));
                            }
                        }
                    }
                }
                state.drag_start = None;
            }
            _ => {}
        }
        None
    }

    fn mouse_interaction(
        &self,
        state: &GlobeState,
        _bounds: Rectangle,
        _cursor: mouse::Cursor,
    ) -> mouse::Interaction {
        if state.drag_start.is_some() {
            mouse::Interaction::Grabbing
        } else {
            mouse::Interaction::default()
        }
    }
}

/// Cast a ray from cursor position, intersect the unit sphere, find nearest country.
///
/// Returns `Some(index)` when the best match is within 0.15 world-space units.
fn pick_country(
    cursor:    iced::Point,
    bounds:    iced::Rectangle,
    total_yaw: f32,
    pitch:     f32,
    countries: &[Country],
) -> Option<usize> {
    let pw = bounds.width;
    let ph = bounds.height;
    if pw <= 0.0 || ph <= 0.0 || countries.is_empty() { return None; }

    let ndc_x =  2.0 * (cursor.x - bounds.x) / pw - 1.0;
    let ndc_y = -(2.0 * (cursor.y - bounds.y) / ph - 1.0);

    let cam     = Camera { yaw: total_yaw, pitch, distance: 3.0 };
    let inv_mvp = cam.mvp(pw / ph).inverse();

    let (origin, dir) = ray_from_ndc(ndc_x, ndc_y, inv_mvp);
    let hit = ray_sphere_intersect(origin, dir)?;

    let mut best_idx  = 0;
    let mut best_dist = f32::MAX;
    for (i, c) in countries.iter().enumerate() {
        let xyz = lat_lon_to_xyz(c.position.lat as f32, c.position.lon as f32);
        let pos = Vec3::from_array(xyz);
        let d   = (hit - pos).length();
        if d < best_dist {
            best_dist = d;
            best_idx  = i;
        }
    }

    if best_dist < 0.15 { Some(best_idx) } else { None }
}

/// Convert countries to billboard instances for GPU rendering.
fn build_markers(countries: &[Country]) -> Vec<MarkerInstance> {
    let max_pop = countries.iter().map(|c| c.population).max().unwrap_or(1);

    countries
        .iter()
        .map(|c| {
            let [x, y, z] = lat_lon_to_xyz(c.position.lat as f32, c.position.lon as f32);
            // Offset slightly above sphere surface to avoid z-fighting
            let world_pos = [x * 1.015, y * 1.015, z * 1.015];

            let norm = c.population as f64 / max_pop as f64;
            let [r, g, b] = population_color(norm);
            let color = [r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0];

            // Size scales with log of population fraction
            let size = 0.025 + (norm as f32).powf(0.4) * 0.055;

            MarkerInstance { world_pos, color, size, _pad: 0.0 }
        })
        .collect()
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
                subdivisions: vec![],
            },
            Country {
                name: "Tuvalu".into(),
                population: 11_312,
                position: LatLon { lat: -7.11, lon: 177.64 },
                iso: "TUV".into(),
                aliases: vec![],
                subdivision_label: None,
                subdivisions: vec![],
            },
        ]
    }

    #[test]
    fn test_build_markers_count() {
        let countries = sample_countries();
        let markers = build_markers(&countries);
        assert_eq!(markers.len(), 2);
    }

    #[test]
    fn test_build_markers_world_pos_above_surface() {
        let countries = sample_countries();
        let markers = build_markers(&countries);
        for m in &markers {
            let [x, y, z] = m.world_pos;
            let r = (x * x + y * y + z * z).sqrt();
            assert!(r > 1.0, "marker should be above sphere surface, r={r}");
        }
    }

    #[test]
    fn test_build_markers_color_range() {
        let countries = sample_countries();
        let markers = build_markers(&countries);
        for m in &markers {
            for &c in &m.color {
                assert!(c >= 0.0 && c <= 1.0, "color component out of [0,1]: {c}");
            }
        }
    }

    #[test]
    fn test_build_markers_size_range() {
        let countries = sample_countries();
        let markers = build_markers(&countries);
        for m in &markers {
            assert!(m.size > 0.0 && m.size < 1.0, "size out of range: {}", m.size);
        }
    }

    #[test]
    fn test_max_pop_marker_largest() {
        let countries = sample_countries();
        let markers = build_markers(&countries);
        // India (max pop) should have larger marker than Tuvalu
        assert!(
            markers[0].size > markers[1].size,
            "max-pop country should have larger marker"
        );
    }

    #[test]
    fn test_globe_state_default() {
        let state = GlobeState::default();
        assert_eq!(state.yaw, 0.0);
        assert_eq!(state.pitch, 0.0);
        assert!(state.drag_start.is_none());
    }

    #[test]
    fn test_empty_countries_no_panic() {
        let markers = build_markers(&[]);
        assert!(markers.is_empty());
    }

    // ── pick_country tests ───────────────────────────────────────────────────

    #[test]
    fn test_pick_country_empty_returns_none() {
        let result = pick_country(
            iced::Point::new(400.0, 300.0),
            iced::Rectangle::new(iced::Point::ORIGIN, iced::Size::new(800.0, 600.0)),
            0.0, 0.3,
            &[],
        );
        assert!(result.is_none());
    }

    #[test]
    fn test_pick_country_north_pole_click() {
        use crate::data::types::LatLon;
        let countries = vec![Country {
            name:               "North".into(),
            population:         1000,
            position:           LatLon { lat: 90.0, lon: 0.0 },
            iso:                "NPL".into(),
            aliases:            vec![],
            subdivision_label:  None,
            subdivisions:       vec![],
        }];
        // Click at top-center of viewport — does not panic regardless of hit/miss.
        let _ = pick_country(
            iced::Point::new(400.0, 50.0),
            iced::Rectangle::new(iced::Point::ORIGIN, iced::Size::new(800.0, 600.0)),
            0.0, 0.3,
            &countries,
        );
    }
}
