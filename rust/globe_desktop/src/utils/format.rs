/// Format a population number into a human-readable string.
///
/// Examples:
/// - 1_476_625_576 → "1.48B"
/// - 331_900_000  → "331.9M"
/// - 55_869       → "55.9K"
/// - 999          → "999"
pub fn format_population(n: u64) -> String {
    if n >= 1_000_000_000 {
        let val = n as f64 / 1_000_000_000.0;
        format!("{:.2}B", val)
    } else if n >= 1_000_000 {
        let val = n as f64 / 1_000_000.0;
        format!("{:.1}M", val)
    } else if n >= 1_000 {
        let val = n as f64 / 1_000.0;
        format!("{:.1}K", val)
    } else {
        n.to_string()
    }
}

/// Format density (people per km²) with one decimal.
pub fn format_density(d: f64) -> String {
    format!("{:.1}/km²", d)
}

/// Format a percentage change with sign.
pub fn format_change(pct: f64) -> String {
    if pct >= 0.0 {
        format!("+{:.1}%", pct)
    } else {
        format!("{:.1}%", pct)
    }
}

/// Calculate marker size based on population using power-law scaling.
///
/// Formula: base + (pop/max_pop)^0.4 * range
pub fn marker_size(population: u64, max_population: u64, base: f32, range: f32) -> f32 {
    if max_population == 0 {
        return base;
    }
    let ratio = population as f64 / max_population as f64;
    let scaled = ratio.powf(0.4) as f32;
    base + scaled * range
}

/// Map a normalized population value (0.0–1.0) to an RGB color.
///
/// Gradient: dark blue → blue → cyan → green → yellow → red
pub fn population_color(normalized: f64) -> [u8; 3] {
    let t = normalized.clamp(0.0, 1.0);

    let stops: [(f64, [u8; 3]); 6] = [
        (0.0, [20, 30, 80]),     // dark blue
        (0.2, [30, 80, 180]),    // blue
        (0.4, [30, 180, 200]),   // cyan
        (0.6, [80, 200, 80]),    // green
        (0.8, [220, 220, 40]),   // yellow
        (1.0, [220, 40, 40]),    // red
    ];

    // Find the two surrounding stops
    let mut lower = 0;
    for i in 0..stops.len() - 1 {
        if t >= stops[i].0 && t <= stops[i + 1].0 {
            lower = i;
            break;
        }
    }

    let (t0, c0) = stops[lower];
    let (t1, c1) = stops[lower + 1];
    let frac = if (t1 - t0).abs() < f64::EPSILON {
        0.0
    } else {
        (t - t0) / (t1 - t0)
    };

    [
        (c0[0] as f64 + (c1[0] as f64 - c0[0] as f64) * frac) as u8,
        (c0[1] as f64 + (c1[1] as f64 - c0[1] as f64) * frac) as u8,
        (c0[2] as f64 + (c1[2] as f64 - c0[2] as f64) * frac) as u8,
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_population_billions() {
        assert_eq!(format_population(1_476_625_576), "1.48B");
        assert_eq!(format_population(8_000_000_000), "8.00B");
        assert_eq!(format_population(1_000_000_000), "1.00B");
    }

    #[test]
    fn test_format_population_millions() {
        assert_eq!(format_population(331_900_000), "331.9M");
        assert_eq!(format_population(1_000_000), "1.0M");
        assert_eq!(format_population(50_500_000), "50.5M");
    }

    #[test]
    fn test_format_population_thousands() {
        assert_eq!(format_population(55_869), "55.9K");
        assert_eq!(format_population(1_000), "1.0K");
        assert_eq!(format_population(999_999), "1000.0K");
    }

    #[test]
    fn test_format_population_small() {
        assert_eq!(format_population(999), "999");
        assert_eq!(format_population(0), "0");
        assert_eq!(format_population(1), "1");
    }

    #[test]
    fn test_format_density() {
        assert_eq!(format_density(150.0), "150.0/km²");
        assert_eq!(format_density(0.5), "0.5/km²");
        assert_eq!(format_density(10000.0), "10000.0/km²");
    }

    #[test]
    fn test_format_change() {
        assert_eq!(format_change(2.5), "+2.5%");
        assert_eq!(format_change(-1.3), "-1.3%");
        assert_eq!(format_change(0.0), "+0.0%");
    }

    #[test]
    fn test_marker_size_basic() {
        // Max population entity should get base + range
        assert_eq!(marker_size(1_000_000, 1_000_000, 6.0, 5.0), 11.0);
        // Zero population should get just base
        assert_eq!(marker_size(0, 1_000_000, 6.0, 5.0), 6.0);
    }

    #[test]
    fn test_marker_size_zero_max() {
        assert_eq!(marker_size(100, 0, 6.0, 5.0), 6.0);
    }

    #[test]
    fn test_marker_size_power_law() {
        // Half population should NOT be half the range (power law 0.4)
        let size = marker_size(500_000, 1_000_000, 6.0, 5.0);
        // 0.5^0.4 ≈ 0.7579, so expected ≈ 6.0 + 0.7579 * 5.0 ≈ 9.79
        assert!(size > 9.5 && size < 10.0, "got {size}");
    }

    #[test]
    fn test_population_color_endpoints() {
        let dark_blue = population_color(0.0);
        assert_eq!(dark_blue, [20, 30, 80]);

        let red = population_color(1.0);
        assert_eq!(red, [220, 40, 40]);
    }

    #[test]
    fn test_population_color_clamp() {
        assert_eq!(population_color(-0.5), population_color(0.0));
        assert_eq!(population_color(1.5), population_color(1.0));
    }

    #[test]
    fn test_population_color_midpoint() {
        let color = population_color(0.5);
        // At 0.5, between cyan (0.4) and green (0.6), should be a cyan-green blend
        // cyan = [30, 180, 200], green = [80, 200, 80], midpoint ≈ [55, 190, 140]
        assert_eq!(color, [55, 190, 140]);
    }
}
