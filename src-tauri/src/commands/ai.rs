use crate::error::AppError;
use crate::models::session::OnnxState;
use image::DynamicImage;
use ndarray::Array4;
use tauri::{AppHandle, State};

fn save_temp_image(img: &DynamicImage) -> Result<String, AppError> {
    let id = uuid::Uuid::new_v4();
    let path = std::env::temp_dir().join(format!("pixelforge_{}.png", id));
    img.save(&path).map_err(|e| AppError::SaveFailed(e.to_string()))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn remove_background(
    app: AppHandle,
    state: State<'_, OnnxState>,
    path: String,
) -> Result<String, AppError> {
    use tauri::Emitter;

    app.emit("operation-progress", serde_json::json!({ "stage": "loading_model", "percent": 10 })).ok();

    let model_path = crate::models::manager::get_model_path(&app, "u2net")?;

    let mut sessions = state.sessions.lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;

    if !sessions.contains_key("u2net") {
        let session = ort::session::Session::builder()
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .with_intra_threads(4)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .commit_from_file(&model_path)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        sessions.insert("u2net".to_string(), session);
    }

    app.emit("operation-progress", serde_json::json!({ "stage": "preprocessing", "percent": 25 })).ok();

    let img = image::open(&path)?;
    let (orig_w, orig_h) = (img.width(), img.height());

    // Resize to 320x320 for U²-Net
    let resized = img.resize_exact(320, 320, image::imageops::FilterType::Lanczos3);
    let rgb = resized.to_rgb8();

    // Create tensor [1, 3, 320, 320] with ImageNet normalization
    let mean = [0.485_f32, 0.456, 0.406];
    let std_dev = [0.229_f32, 0.224, 0.225];
    let mut input = Array4::<f32>::zeros((1, 3, 320, 320));

    for y in 0..320_usize {
        for x in 0..320_usize {
            let pixel = rgb.get_pixel(x as u32, y as u32);
            for c in 0..3 {
                input[[0, c, y, x]] = (pixel[c] as f32 / 255.0 - mean[c]) / std_dev[c];
            }
        }
    }

    app.emit("operation-progress", serde_json::json!({ "stage": "inferring", "percent": 50 })).ok();

    let session = sessions.get_mut("u2net")
        .ok_or_else(|| AppError::InferenceFailed("Session not found".into()))?;

    let input_value = ort::value::Tensor::from_array(input)
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    let outputs = session.run(ort::inputs![input_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    // U²-Net output[0] is the final prediction, shape [1, 1, 320, 320]
    let (_shape, mask_slice) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

    app.emit("operation-progress", serde_json::json!({ "stage": "postprocessing", "percent": 80 })).ok();

    // Normalize mask to 0-255
    let min_val: f32 = mask_slice.iter().cloned().fold(f32::INFINITY, f32::min);
    let max_val: f32 = mask_slice.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let range = (max_val - min_val).max(f32::EPSILON);

    let mut mask_img = image::GrayImage::new(320, 320);
    for y in 0..320_u32 {
        for x in 0..320_u32 {
            let idx = (y * 320 + x) as usize;
            let val = mask_slice[idx];
            let normalized = ((val - min_val) / range * 255.0).clamp(0.0, 255.0) as u8;
            mask_img.put_pixel(x, y, image::Luma([normalized]));
        }
    }

    // Resize mask to original dimensions
    let mask_resized = image::imageops::resize(
        &mask_img,
        orig_w,
        orig_h,
        image::imageops::FilterType::Lanczos3,
    );

    // Apply mask as alpha channel
    let mut rgba = img.to_rgba8();
    for (rgba_pixel, mask_pixel) in rgba.pixels_mut().zip(mask_resized.pixels()) {
        rgba_pixel[3] = mask_pixel[0];
    }

    let result = DynamicImage::ImageRgba8(rgba);
    let output_path = save_temp_image(&result)?;

    app.emit("operation-progress", serde_json::json!({ "stage": "complete", "percent": 100 })).ok();

    Ok(output_path)
}
