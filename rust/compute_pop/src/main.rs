const EXPECTED_US_TOTAL: u64 = 341_784_857;

type Row = (&'static str, u64, u64, f64, f64);

const STATES: &[Row] = &[
    ("California", 39355309, 39555703, 155779.22, 38.4),
    ("Texas", 31709821, 29149498, 261231.71, 35.9),
    ("Florida", 23462518, 21538207, 53624.76, 42.7),
    ("New York", 20002427, 20203696, 47126.40, 40.1),
    ("Pennsylvania", 13059432, 13002753, 44742.70, 41.2),
    ("Illinois", 12719141, 12821741, 55518.93, 39.4),
    ("Ohio", 11900510, 11799445, 40860.69, 39.8),
    ("Georgia", 11302748, 10713861, 57513.49, 38.0),
    ("North Carolina", 11197968, 10441392, 48617.91, 39.4),
    ("Michigan", 10127884, 10079362, 56538.90, 40.4),
    ("New Jersey", 9548215, 9289024, 7354.22, 40.1),
    ("Virginia", 8880107, 8631419, 39490.09, 39.4),
    ("Washington", 8001020, 7707519, 66455.52, 38.7),
    ("Arizona", 7623818, 7158104, 113594.08, 39.4),
    ("Tennessee", 7315076, 6912319, 41234.90, 39.1),
    ("Massachusetts", 7154084, 7033112, 7800.06, 40.1),
    ("Indiana", 6973333, 6786605, 35826.11, 38.3),
    ("Missouri", 6270541, 6154913, 68741.52, 39.4),
    ("Maryland", 6265347, 6181640, 9707.24, 39.8),
    ("Wisconsin", 5972787, 5894323, 54157.80, 40.7),
    ("Colorado", 6012561, 5775326, 103641.89, 38.0),
    ("Minnesota", 5830405, 5706733, 79626.74, 39.2),
    ("South Carolina", 5570274, 5118250, 30060.70, 40.7),
    ("Alabama", 5193088, 5025437, 50645.33, 39.6),
    ("Louisiana", 4618189, 4657894, 43203.90, 38.7),
    ("Kentucky", 4606864, 4506287, 39486.34, 39.3),
    ("Oregon", 4273586, 4237282, 95988.01, 40.8),
    ("Oklahoma", 4123288, 3959354, 68594.92, 37.4),
    ("Connecticut", 3688496, 3607750, 4842.36, 41.2),
    ("Utah", 3538904, 3271601, 82169.62, 32.5),
    ("Iowa", 3238387, 3190582, 55857.13, 39.0),
    ("Nevada", 3282188, 3105593, 109781.18, 39.5),
    ("Arkansas", 3114791, 3011530, 52035.48, 39.1),
    ("Kansas", 2977220, 2937986, 81758.72, 38.0),
    ("Mississippi", 2954160, 2961264, 46923.27, 39.3),
    ("New Mexico", 2125498, 2117492, 121298.15, 39.9),
    ("Nebraska", 2018006, 1961980, 76824.17, 37.4),
    ("Idaho", 2029733, 1839123, 82643.12, 37.8),
    ("West Virginia", 1766147, 1793759, 24038.21, 42.9),
    ("Hawaii", 1432820, 1455267, 6422.63, 41.5),
    ("New Hampshire", 1415342, 1377573, 8952.65, 43.6),
    ("Maine", 1414874, 1363218, 30842.92, 44.9),
    ("Montana", 1144694, 1084221, 145545.80, 41.3),
    ("Rhode Island", 1114521, 1097357, 1033.81, 41.0),
    ("Delaware", 1059952, 989950, 1948.54, 42.1),
    ("South Dakota", 935094, 886656, 75811.00, 38.7),
    ("North Dakota", 799358, 779136, 69000.80, 36.7),
    ("Alaska", 737270, 733383, 570640.95, 36.3),
    ("District of Columbia", 693645, 689544, 61.05, 34.9),
    ("Vermont", 644663, 643077, 9216.66, 43.9),
    ("Wyoming", 588753, 576872, 97093.14, 40.2),
];

fn render_output() -> String {
    let us_total: u64 = STATES.iter().map(|(_, pop_2025, _, _, _)| *pop_2025).sum();
    let mut output = String::new();

    output.push_str(&format!("US Total (sum of states+DC): {us_total}\n"));
    output.push_str(&format!("Expected:                    {EXPECTED_US_TOTAL}\n"));
    output.push_str(&format!(
        "Match: {}\n\n",
        if us_total == EXPECTED_US_TOTAL {
            "True"
        } else {
            "False"
        }
    ));

    for (state, pop_2025, pop_2020_base, land_area, median_age) in STATES {
        let density = *pop_2025 as f64 / *land_area;
        let change = ((*pop_2025 as f64 - *pop_2020_base as f64) / *pop_2020_base as f64) * 100.0;
        let name = if *state == "District of Columbia" { "DC" } else { state };

        output.push_str(&format!(
            "{name}: pop={pop_2025}, dn={density:.1}, ch={change:.1}, ag={median_age:.1}\n"
        ));
    }

    output
}

fn main() {
    print!("{}", render_output());
}

#[cfg(test)]
mod tests {
    use super::render_output;

    #[test]
    fn output_contains_expected_totals_and_dc_label() {
        let output = render_output();
        assert!(output.contains("US Total (sum of states+DC): 341784857"));
        assert!(output.contains("Match: True"));
        assert!(output.contains("DC: pop=693645"));
    }
}
