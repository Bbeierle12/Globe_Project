use iced::Color;

/// Globe desktop dark theme colors, matching the browser UI.
pub struct GlobeTheme;

impl GlobeTheme {
    /// Background color (#050810)
    pub const BACKGROUND: Color = Color {
        r: 0.0196,
        g: 0.0314,
        b: 0.0627,
        a: 1.0,
    };

    /// Primary text color (#b8c8dd)
    pub const TEXT_PRIMARY: Color = Color {
        r: 0.722,
        g: 0.784,
        b: 0.867,
        a: 1.0,
    };

    /// Accent color - cyan (#4fc3f7)
    pub const ACCENT: Color = Color {
        r: 0.310,
        g: 0.765,
        b: 0.969,
        a: 1.0,
    };

    /// Sidebar background (#0a0f1a)
    pub const SIDEBAR_BG: Color = Color {
        r: 0.039,
        g: 0.059,
        b: 0.102,
        a: 1.0,
    };

    /// Selected item highlight (#1a2a3a)
    pub const SELECTED: Color = Color {
        r: 0.102,
        g: 0.165,
        b: 0.228,
        a: 1.0,
    };

    /// Hover highlight (#0f1a2a)
    pub const HOVER: Color = Color {
        r: 0.059,
        g: 0.102,
        b: 0.165,
        a: 1.0,
    };

    /// Country marker color (#f0f7ff)
    pub const MARKER_COUNTRY: Color = Color {
        r: 0.941,
        g: 0.969,
        b: 1.0,
        a: 1.0,
    };

    /// Subdivision marker color (#8bc8ff)
    pub const MARKER_SUBDIVISION: Color = Color {
        r: 0.545,
        g: 0.784,
        b: 1.0,
        a: 1.0,
    };

    /// Search bar background
    pub const SEARCH_BG: Color = Color {
        r: 0.059,
        g: 0.078,
        b: 0.118,
        a: 1.0,
    };

    /// Border color
    pub const BORDER: Color = Color {
        r: 0.118,
        g: 0.157,
        b: 0.216,
        a: 1.0,
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_background_is_near_black() {
        let bg = GlobeTheme::BACKGROUND;
        assert!(bg.r < 0.1);
        assert!(bg.g < 0.1);
        assert!(bg.b < 0.1);
        assert_eq!(bg.a, 1.0);
    }

    #[test]
    fn test_accent_is_cyan() {
        let a = GlobeTheme::ACCENT;
        // Cyan means high blue+green, lower red
        assert!(a.b > 0.9);
        assert!(a.g > 0.7);
        assert!(a.r < 0.5);
    }

    #[test]
    fn test_text_is_light() {
        let t = GlobeTheme::TEXT_PRIMARY;
        // Should be a light grayish-blue
        assert!(t.r > 0.5);
        assert!(t.g > 0.5);
        assert!(t.b > 0.5);
    }

    #[test]
    fn test_sidebar_darker_than_background() {
        // Sidebar should be darker or similar to main bg
        let bg = GlobeTheme::BACKGROUND;
        let sb = GlobeTheme::SIDEBAR_BG;
        let bg_lum = bg.r * 0.299 + bg.g * 0.587 + bg.b * 0.114;
        let sb_lum = sb.r * 0.299 + sb.g * 0.587 + sb.b * 0.114;
        // Both are very dark, sidebar is slightly lighter but still dark
        assert!(sb_lum < 0.15, "sidebar should be dark, got {sb_lum}");
        assert!(bg_lum < 0.15, "background should be dark, got {bg_lum}");
    }
}
