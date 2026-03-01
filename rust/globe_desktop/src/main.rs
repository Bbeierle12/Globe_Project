mod app;
mod data;
mod ui;
mod utils;

use app::GlobeApp;

fn main() -> iced::Result {
    iced::application(GlobeApp::new, GlobeApp::update, GlobeApp::view)
        .title(GlobeApp::title)
        .theme(GlobeApp::theme)
        .centered()
        .run()
}
