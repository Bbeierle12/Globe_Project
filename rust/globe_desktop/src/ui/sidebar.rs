use iced::widget::{column, container, row, scrollable, text, text_input, Column};
use iced::{Element, Length};

use crate::app::Message;
use crate::data::types::Country;
use crate::utils::format::format_population;
use crate::utils::search::filter_countries;
use crate::ui::details::{country_detail, DetailView};

/// Build the sidebar as an Iced Element.
pub fn sidebar_view<'a>(
    countries: &'a [Country],
    search_query: &'a str,
    selected_index: Option<usize>,
    expanded: &'a std::collections::HashSet<usize>,
    auto_rotate: bool,
) -> Element<'a, Message> {
    let search_bar = text_input("Search countries...", search_query)
        .on_input(Message::SearchChanged)
        .padding(8)
        .size(14);

    let rotate_label = if auto_rotate { "Rotating" } else { "Paused" };
    let rotate_toggle = iced::widget::button(text(rotate_label).size(12))
        .on_press(Message::ToggleRotation)
        .padding(4);

    let header = row![search_bar, rotate_toggle]
        .spacing(8)
        .padding(8);

    let filtered = filter_countries(countries, search_query);

    let mut list_items: Vec<Element<'a, Message>> = Vec::new();

    for &idx in &filtered {
        let country = &countries[idx];
        let is_expanded = expanded.contains(&idx);

        let pop_str = format_population(country.population);
        let label = text(format!("{} ({})", country.name, pop_str)).size(13);
        let entry = iced::widget::button(label)
            .on_press(Message::SelectCountry(idx))
            .width(Length::Fill)
            .padding(4);

        list_items.push(entry.into());

        // Show subdivisions if expanded
        if is_expanded {
            for (si, sub) in country.subdivisions.iter().enumerate() {
                let sub_pop = format_population(sub.population);
                let sub_label = text(format!("  {} ({})", sub.name, sub_pop)).size(12);
                let sub_entry = iced::widget::button(sub_label)
                    .on_press(Message::SelectSubdivision(idx, si))
                    .width(Length::Fill)
                    .padding(2);

                list_items.push(sub_entry.into());
            }
        }
    }

    let list = Column::with_children(list_items).spacing(2);
    let scrollable_list = scrollable(list).height(Length::Fill);

    // Details panel for selected entity
    let details: Element<'a, Message> = if let Some(sel_idx) = selected_index {
        if sel_idx < countries.len() {
            let detail = country_detail(&countries[sel_idx]);
            detail_panel(detail)
        } else {
            text("").into()
        }
    } else {
        text("Select a country").size(12).into()
    };

    let content = column![header, scrollable_list, details]
        .spacing(4)
        .width(Length::Fixed(320.0))
        .height(Length::Fill);

    container(content).into()
}

/// Render a detail view panel. Takes ownership of DetailView to avoid lifetime issues.
fn detail_panel(detail: DetailView) -> Element<'static, Message> {
    let mut items: Vec<Element<'static, Message>> = vec![
        text(detail.name).size(16).into(),
        text(format!("Population: {}", detail.population)).size(12).into(),
    ];

    if let Some(density) = detail.density {
        items.push(text(format!("Density: {density}")).size(12).into());
    }
    if let Some(region) = detail.region {
        items.push(text(format!("Region: {region}")).size(12).into());
    }
    if let Some(capital) = detail.capital {
        items.push(text(format!("Capital: {capital}")).size(12).into());
    }
    if let Some(area) = detail.area {
        items.push(text(format!("Area: {area}")).size(12).into());
    }
    if let Some(change) = detail.change {
        items.push(text(format!("Change: {change}")).size(12).into());
    }
    if let Some(count) = detail.subdivision_count {
        items.push(text(format!("Subdivisions: {count}")).size(12).into());
    }

    Column::with_children(items)
        .spacing(4)
        .padding(8)
        .into()
}
