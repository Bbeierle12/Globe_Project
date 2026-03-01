use bytemuck::{Pod, Zeroable};

/// A single vertex on the globe sphere.
#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct SphereVertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
}

pub struct SphereMesh {
    pub vertices: Vec<SphereVertex>,
    pub indices: Vec<u32>,
}

/// Generate a UV sphere with the given number of latitude/longitude segments.
///
/// lat_segs: number of horizontal bands (e.g. 24)
/// lon_segs: number of vertical slices (e.g. 48)
pub fn generate_sphere(lat_segs: u32, lon_segs: u32) -> SphereMesh {
    let mut vertices = Vec::with_capacity(((lat_segs + 1) * (lon_segs + 1)) as usize);
    let mut indices = Vec::with_capacity((lat_segs * lon_segs * 6) as usize);

    let pi = std::f32::consts::PI;

    for i in 0..=lat_segs {
        // phi: latitude angle from -pi/2 (south) to +pi/2 (north)
        let phi = pi * (i as f32 / lat_segs as f32 - 0.5);
        for j in 0..=lon_segs {
            let theta = 2.0 * pi * j as f32 / lon_segs as f32;
            let x = phi.cos() * theta.sin();
            let y = phi.sin();
            let z = phi.cos() * theta.cos();
            vertices.push(SphereVertex {
                position: [x, y, z],
                normal: [x, y, z],
            });
        }
    }

    for i in 0..lat_segs {
        for j in 0..lon_segs {
            let a = i * (lon_segs + 1) + j;
            let b = a + 1;
            let c = (i + 1) * (lon_segs + 1) + j;
            let d = c + 1;
            indices.extend_from_slice(&[a, b, c, b, d, c]);
        }
    }

    SphereMesh { vertices, indices }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vertex_count() {
        let mesh = generate_sphere(24, 48);
        assert_eq!(mesh.vertices.len(), (25 * 49) as usize);
    }

    #[test]
    fn test_index_count() {
        let mesh = generate_sphere(24, 48);
        assert_eq!(mesh.indices.len(), (24 * 48 * 6) as usize);
    }

    #[test]
    fn test_all_vertices_on_unit_sphere() {
        let mesh = generate_sphere(16, 32);
        for v in &mesh.vertices {
            let [x, y, z] = v.position;
            let len = (x * x + y * y + z * z).sqrt();
            assert!((len - 1.0).abs() < 1e-5, "vertex not on unit sphere: len={len}");
        }
    }

    #[test]
    fn test_normals_equal_positions() {
        let mesh = generate_sphere(8, 16);
        for v in &mesh.vertices {
            assert_eq!(v.position, v.normal, "normal should equal position on unit sphere");
        }
    }

    #[test]
    fn test_indices_in_bounds() {
        let mesh = generate_sphere(12, 24);
        let n = mesh.vertices.len() as u32;
        for &idx in &mesh.indices {
            assert!(idx < n, "index {idx} out of bounds (n={n})");
        }
    }

    #[test]
    fn test_north_pole_vertex_exists() {
        let mesh = generate_sphere(24, 48);
        // Last latitude ring should be near y=1 (north pole)
        let last = mesh.vertices.last().unwrap();
        assert!(last.position[1] > 0.99, "last vertex should be near north pole");
    }

    #[test]
    fn test_south_pole_vertex_exists() {
        let mesh = generate_sphere(24, 48);
        // First vertex should be near y=-1 (south pole)
        let first = &mesh.vertices[0];
        assert!(first.position[1] < -0.99, "first vertex should be near south pole");
    }

    #[test]
    fn test_minimum_segments() {
        let mesh = generate_sphere(2, 4);
        assert!(!mesh.vertices.is_empty());
        assert!(!mesh.indices.is_empty());
    }
}
