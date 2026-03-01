use iced::mouse;
use iced::{Event, Point, Rectangle};
use iced::widget::shader;

use crate::data::types::Country;
use crate::utils::format::population_color;
use crate::renderer::camera::{Camera, lat_lon_to_xyz};
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
    /// Drag start position.
    pub drag_start: Option<Point>,
}

// ─── GlobeProgram ─────────────────────────────────────────────────────────────

/// Iced shader program for the 3D globe.
pub struct GlobeProgram {
    pub countries: Vec<Country>,
    /// Auto-rotation angle from the app tick (radians).
    pub rotation: f32,
}

impl<Message: Clone> shader::Program<Message> for GlobeProgram {
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
            mvp:  mvp.to_cols_array_2d(),
            time: 0.0,
            _pad: [0.0; 3],
        };

        let marker_uniforms = MarkerUniforms {
            view_proj:    mvp.to_cols_array_2d(),
            camera_right: [right.x, right.y, right.z, 0.0],
            camera_up:    [up.x,    up.y,    up.z,    0.0],
            camera_eye:   [eye.x,   eye.y,   eye.z,   0.0],
        };

        let markers = build_markers(&self.countries);

        GlobePrimitive { globe_uniforms, marker_uniforms, markers }
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
}
