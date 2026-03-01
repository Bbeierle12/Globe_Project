/// Format a population number for display (e.g. "1.48B", "331.9M", "55.9K").
pub fn format_population(pop: u64) -> String {
    if pop >= 1_000_000_000 {
        format!("{:.2}B", pop as f64 / 1_000_000_000.0)
    } else if pop >= 1_000_000 {
        format!("{:.1}M", pop as f64 / 1_000_000.0)
    } else if pop >= 1_000 {
        format!("{:.1}K", pop as f64 / 1_000.0)
    } else {
        pop.to_string()
    }
}

/// Format density in people/km².
pub fn format_density(density: f64) -> String {
    if density >= 1000.0 {
        format!("{:.0}/km²", density)
    } else if density >= 100.0 {
        format!("{:.1}/km²", density)
    } else {
        format!("{:.2}/km²", density)
    }
}

/// Format percent change.
pub fn format_change(pct: f64) -> String {
    if pct >= 0.0 {
        format!("+{pct:.1}%")
    } else {
        format!("{pct:.1}%")
    }
}

/// Compute marker pixel size using a power law (matches browser app).
/// base + (pop/max_pop)^0.4 * range
pub fn marker_size(population: u64, max_population: u64, base: f32, range: f32) -> f32 {
    if max_population == 0 {
        return base;
    }
    let ratio = population as f64 / max_population as f64;
    base + (ratio.powf(0.4) as f32) * range
}

/// Map a normalized population value (0.0-1.0) to an RGB color.
/// Dark blue (low) → cyan → green → yellow → orange → red (high).
pub fn population_color(normalized: f64) -> (u8, u8, u8) {
    let t = normalized.clamp(0.0, 1.0);

    let (r, g, b) = if t < 0.2 {
        let s = t / 0.2;
        (0.0, s * 0.5, 0.5 + s * 0.5)
    } else if t < 0.4 {
        let s = (t - 0.2) / 0.2;
        (0.0, 0.5 + s * 0.5, 1.0 - s * 0.5)
    } else if t < 0.6 {
        let s = (t - 0.4) / 0.2;
        (s, 1.0, 0.5 - s * 0.5)
    } else if t < 0.8 {
        let s = (t - 0.6) / 0.2;
        (1.0, 1.0 - s * 0.5, 0.0)
    } else {
        let s = (t - 0.8) / 0.2;
        (1.0, 0.5 - s * 0.5, 0.0)
    };

    (
        (r * 255.0) as u8,
        (g * 255.0) as u8,
        (b * 255.0) as u8,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_population_billions() {
        assert_eq!(format_population(1_476_625_576), "1.48B");
    }

    #[test]
    fn test_format_population_millions() {
        assert_eq!(format_population(341_784_857), "341.8M");
    }

    #[test]
    fn test_format_population_thousands() {
        assert_eq!(format_population(55_869), "55.9K");
    }

    #[test]
    fn test_format_population_small() {
        assert_eq!(format_population(500), "500");
    }

    #[test]
    fn test_format_density() {
        assert_eq!(format_density(2126.3), "2126/km²");
        assert_eq!(format_density(97.9), "97.90/km²");
        assert_eq!(format_density(150.5), "150.5/km²");
    }

    #[test]
    fn test_format_change() {
        assert_eq!(format_change(6.2), "+6.2%");
        assert_eq!(format_change(-1.5), "-1.5%");
    }

    #[test]
    fn test_marker_size_basic() {
        let size = marker_size(1_000_000, 1_000_000_000, 6.0, 5.0);
        assert!(size > 6.0 && size < 11.0);
    }

    #[test]
    fn test_marker_size_zero_max() {
        assert_eq!(marker_size(100, 0, 6.0, 5.0), 6.0);
    }

    #[test]
    fn test_population_color_endpoints() {
        let (r, _g, b) = population_color(0.0);
        assert_eq!(r, 0);
        assert!(b > 100); // dark blue

        let (r, _g, b) = population_color(1.0);
        assert_eq!(r, 255);
        assert_eq!(b, 0); // red
    }

    #[test]
    fn test_population_color_clamp() {
        let below = population_color(-0.5);
        let zero = population_color(0.0);
        assert_eq!(below, zero);

        let above = population_color(1.5);
        let one = population_color(1.0);
        assert_eq!(above, one);
    }
}
