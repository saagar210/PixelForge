mod commands;
mod error;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(models::session::OnnxState::new())
        .invoke_handler(tauri::generate_handler![
            // Phase 1: Image viewer
            commands::image::get_image_info,
            commands::image::convert_image,
            // Phase 2: Operations + Export
            commands::operations::apply_crop,
            commands::operations::apply_resize,
            commands::operations::apply_rotate,
            commands::operations::apply_flip,
            commands::operations::apply_brightness,
            commands::operations::apply_contrast,
            commands::operations::apply_hue,
            commands::operations::apply_saturation,
            commands::operations::apply_lightness,
            commands::operations::apply_blur,
            commands::operations::apply_sharpen,
            commands::export::save_image,
            // Phase 3: AI + Model management
            commands::ai::remove_background,
            models::manager::get_models_status,
            models::manager::download_model,
            models::manager::delete_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
