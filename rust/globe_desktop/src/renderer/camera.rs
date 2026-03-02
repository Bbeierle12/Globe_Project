use glam::{Mat4, Vec3};

/// Camera orbiting the globe.
pub struct Camera {
    pub yaw: f32,
    pub pitch: f32,
    pub distance: f32,
}

impl Default for Camera {
    fn default() -> Self {
        Self { yaw: 0.0, pitch: 0.3, distance: 3.0 }
    }
}

impl Camera {
    pub fn eye(&self) -> Vec3 {
        Vec3::new(
            self.distance * self.pitch.cos() * self.yaw.sin(),
            self.distance * self.pitch.sin(),
            self.distance * self.pitch.cos() * self.yaw.cos(),
        )
    }

    pub fn view(&self) -> Mat4 {
        Mat4::look_at_rh(self.eye(), Vec3::ZERO, Vec3::Y)
    }

    pub fn proj(&self, aspect: f32) -> Mat4 {
        Mat4::perspective_rh(std::f32::consts::FRAC_PI_4, aspect, 0.1, 100.0)
    }

    pub fn mvp(&self, aspect: f32) -> Mat4 {
        self.proj(aspect) * self.view()
    }

    /// Right vector in world space (for billboard rendering).
    pub fn right(&self) -> Vec3 {
        let fwd = (Vec3::ZERO - self.eye()).normalize();
        Vec3::Y.cross(fwd).normalize()
    }

    /// Up vector in world space (for billboard rendering).
    pub fn up(&self) -> Vec3 {
        let fwd = (Vec3::ZERO - self.eye()).normalize();
        fwd.cross(self.right()).normalize()
    }
}

/// Unproject an NDC point through the inverse MVP into a world-space ray.
///
/// Returns `(origin, direction)` — both in world space.
pub fn ray_from_ndc(ndc_x: f32, ndc_y: f32, inv_mvp: Mat4) -> (Vec3, Vec3) {
    let near = inv_mvp.project_point3(Vec3::new(ndc_x, ndc_y, -1.0));
    let far  = inv_mvp.project_point3(Vec3::new(ndc_x, ndc_y,  1.0));
    let dir  = (far - near).normalize();
    (near, dir)
}

/// Ray–unit-sphere intersection (sphere centered at origin, radius 1).
///
/// Returns the nearest front-face hit point, or `None` on a miss or
/// when both intersections are behind the ray origin.
pub fn ray_sphere_intersect(origin: Vec3, dir: Vec3) -> Option<Vec3> {
    let a    = dir.dot(dir);
    let b    = 2.0 * origin.dot(dir);
    let c    = origin.dot(origin) - 1.0;
    let disc = b * b - 4.0 * a * c;
    if disc < 0.0 { return None; }
    let sqrt_disc = disc.sqrt();
    let t0 = (-b - sqrt_disc) / (2.0 * a);
    let t1 = (-b + sqrt_disc) / (2.0 * a);
    let t  = if t0 > 0.0 { t0 } else if t1 > 0.0 { t1 } else { return None; };
    Some(origin + dir * t)
}

/// Convert lat/lon degrees to a point on the unit sphere (Y-up, north pole = (0,1,0)).
pub fn lat_lon_to_xyz(lat_deg: f32, lon_deg: f32) -> [f32; 3] {
    let lat = lat_deg.to_radians();
    let lon = lon_deg.to_radians();
    [lat.cos() * lon.sin(), lat.sin(), lat.cos() * lon.cos()]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_north_pole() {
        let [x, y, z] = lat_lon_to_xyz(90.0, 0.0);
        assert!((x).abs() < 1e-5);
        assert!((y - 1.0).abs() < 1e-5);
        assert!((z).abs() < 1e-5);
    }

    #[test]
    fn test_south_pole() {
        let [x, y, z] = lat_lon_to_xyz(-90.0, 0.0);
        assert!((x).abs() < 1e-5);
        assert!((y + 1.0).abs() < 1e-5);
        assert!((z).abs() < 1e-5);
    }

    #[test]
    fn test_equator_prime_meridian() {
        let [x, y, z] = lat_lon_to_xyz(0.0, 0.0);
        assert!((x).abs() < 1e-5);
        assert!((y).abs() < 1e-5);
        assert!((z - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_equator_east() {
        let [x, y, z] = lat_lon_to_xyz(0.0, 90.0);
        assert!((x - 1.0).abs() < 1e-5);
        assert!((y).abs() < 1e-5);
        assert!((z).abs() < 1e-5);
    }

    #[test]
    fn test_unit_length() {
        let [x, y, z] = lat_lon_to_xyz(45.0, 30.0);
        let len = (x * x + y * y + z * z).sqrt();
        assert!((len - 1.0).abs() < 1e-5, "length should be 1, got {len}");
    }

    #[test]
    fn test_camera_default() {
        let cam = Camera::default();
        assert_eq!(cam.yaw, 0.0);
        assert_eq!(cam.pitch, 0.3);
        assert_eq!(cam.distance, 3.0);
    }

    #[test]
    fn test_camera_eye_on_sphere() {
        let cam = Camera::default();
        let eye = cam.eye();
        let len = eye.length();
        assert!((len - cam.distance).abs() < 1e-4, "eye distance {len}");
    }

    #[test]
    fn test_camera_mvp_is_mat4() {
        let cam = Camera::default();
        let mvp = cam.mvp(16.0 / 9.0);
        // Check it's not identity (it's a real projection)
        assert_ne!(mvp, Mat4::IDENTITY);
    }

    #[test]
    fn test_camera_right_orthogonal_to_up() {
        let cam = Camera::default();
        let r = cam.right();
        let u = cam.up();
        let dot = r.dot(u);
        assert!(dot.abs() < 1e-4, "right and up should be orthogonal, dot={dot}");
    }

    // ── ray_sphere_intersect tests ───────────────────────────────────────────

    #[test]
    fn test_ray_sphere_center_hit() {
        // Ray along -Z from (0,0,3) hits front of sphere at (0,0,1).
        let origin = Vec3::new(0.0, 0.0, 3.0);
        let dir    = Vec3::new(0.0, 0.0, -1.0);
        let hit    = ray_sphere_intersect(origin, dir).expect("should hit");
        assert!((hit.z - 1.0).abs() < 1e-4, "expected z≈1, got {}", hit.z);
        assert!(hit.x.abs() < 1e-4);
        assert!(hit.y.abs() < 1e-4);
    }

    #[test]
    fn test_ray_sphere_miss() {
        // Ray offset 1.5 units in X — misses unit sphere.
        let origin = Vec3::new(1.5, 0.0, 3.0);
        let dir    = Vec3::new(0.0, 0.0, -1.0);
        assert!(ray_sphere_intersect(origin, dir).is_none());
    }

    #[test]
    fn test_ray_sphere_behind_origin() {
        // Ray pointing away from the sphere — both intersections are behind origin.
        let origin = Vec3::new(0.0, 0.0, 3.0);
        let dir    = Vec3::new(0.0, 0.0, 1.0); // pointing away
        assert!(ray_sphere_intersect(origin, dir).is_none());
    }
}
