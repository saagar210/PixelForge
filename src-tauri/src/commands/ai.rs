use crate::error::AppError;
use crate::models::session::OnnxState;
use image::DynamicImage;
use ndarray::Array4;
use serde::Serialize;
use tauri::{AppHandle, State};

const IMAGENET_LABELS: &str = include_str!("../models/imagenet_labels.json");

fn save_temp_image(img: &DynamicImage) -> Result<String, AppError> {
    let id = uuid::Uuid::new_v4();
    let path = std::env::temp_dir().join(format!("pixelforge_{}.png", id));
    img.save(&path).map_err(|e| AppError::SaveFailed(e.to_string()))?;
    Ok(path.to_string_lossy().into_owned())
}

fn get_or_create_session(
    app: &AppHandle,
    state: &OnnxState,
    model_id: &str,
) -> Result<(), AppError> {
    let model_path = crate::models::manager::get_model_path(app, model_id)?;
    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;

    if !sessions.contains_key(model_id) {
        let session = ort::session::Session::builder()
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .with_optimization_level(ort::session::builder::GraphOptimizationLevel::Level3)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .with_intra_threads(4)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?
            .commit_from_file(&model_path)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        sessions.insert(model_id.to_string(), session);
    }

    Ok(())
}

fn softmax(logits: &[f32]) -> Vec<f32> {
    let max = logits.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
    let exps: Vec<f32> = logits.iter().map(|&x| (x - max).exp()).collect();
    let sum: f32 = exps.iter().sum();
    exps.iter().map(|&x| x / sum).collect()
}

// ── Background Removal (U²-Net) ─────────────────────────────────────

#[tauri::command]
pub fn remove_background(
    app: AppHandle,
    state: State<'_, OnnxState>,
    path: String,
) -> Result<String, AppError> {
    use tauri::Emitter;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "loading_model", "percent": 10 }),
    )
    .ok();

    get_or_create_session(&app, &state, "u2net")?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "preprocessing", "percent": 25 }),
    )
    .ok();

    let img = image::open(&path)?;
    let (orig_w, orig_h) = (img.width(), img.height());

    let resized = img.resize_exact(320, 320, image::imageops::FilterType::Lanczos3);
    let rgb = resized.to_rgb8();

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

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "inferring", "percent": 50 }),
    )
    .ok();

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("u2net")
        .ok_or_else(|| AppError::InferenceFailed("Session not found".into()))?;

    let input_value =
        ort::value::Tensor::from_array(input).map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    let outputs = session
        .run(ort::inputs![input_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    let (_shape, mask_slice) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "postprocessing", "percent": 80 }),
    )
    .ok();

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

    let mask_resized = image::imageops::resize(
        &mask_img,
        orig_w,
        orig_h,
        image::imageops::FilterType::Lanczos3,
    );

    let mut rgba = img.to_rgba8();
    for (rgba_pixel, mask_pixel) in rgba.pixels_mut().zip(mask_resized.pixels()) {
        rgba_pixel[3] = mask_pixel[0];
    }

    let result = DynamicImage::ImageRgba8(rgba);
    let output_path = save_temp_image(&result)?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "complete", "percent": 100 }),
    )
    .ok();

    Ok(output_path)
}

/// Core function for batch processing (no State<> wrapper)
pub fn remove_background_core(
    app: &AppHandle,
    state: &OnnxState,
    path: &str,
) -> Result<String, AppError> {
    use tauri::Emitter;

    get_or_create_session(app, state, "u2net")?;

    let img = image::open(path)?;
    let (orig_w, orig_h) = (img.width(), img.height());
    let resized = img.resize_exact(320, 320, image::imageops::FilterType::Lanczos3);
    let rgb = resized.to_rgb8();

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

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("u2net")
        .ok_or_else(|| AppError::InferenceFailed("u2net session not found".into()))?;

    let input_value =
        ort::value::Tensor::from_array(input).map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let outputs = session
        .run(ort::inputs![input_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let (_shape, mask_slice) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

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

    let mask_resized = image::imageops::resize(
        &mask_img,
        orig_w,
        orig_h,
        image::imageops::FilterType::Lanczos3,
    );

    let mut rgba = img.to_rgba8();
    for (rgba_pixel, mask_pixel) in rgba.pixels_mut().zip(mask_resized.pixels()) {
        rgba_pixel[3] = mask_pixel[0];
    }

    let result = DynamicImage::ImageRgba8(rgba);
    save_temp_image(&result)
}

// ── Image Classification (MobileNetV2) ──────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationResult {
    pub label: String,
    pub confidence: f32,
}

#[tauri::command]
pub fn classify_image(
    app: AppHandle,
    state: State<'_, OnnxState>,
    path: String,
) -> Result<Vec<ClassificationResult>, AppError> {
    use tauri::Emitter;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "loading_model", "percent": 10 }),
    )
    .ok();

    get_or_create_session(&app, &state, "mobilenetv2")?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "preprocessing", "percent": 25 }),
    )
    .ok();

    let img = image::open(&path)?;
    let resized = img.resize_exact(224, 224, image::imageops::FilterType::Lanczos3);
    let rgb = resized.to_rgb8();

    let mean = [0.485_f32, 0.456, 0.406];
    let std_dev = [0.229_f32, 0.224, 0.225];
    let mut input = Array4::<f32>::zeros((1, 3, 224, 224));

    for y in 0..224_usize {
        for x in 0..224_usize {
            let pixel = rgb.get_pixel(x as u32, y as u32);
            for c in 0..3 {
                input[[0, c, y, x]] = (pixel[c] as f32 / 255.0 - mean[c]) / std_dev[c];
            }
        }
    }

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "inferring", "percent": 50 }),
    )
    .ok();

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("mobilenetv2")
        .ok_or_else(|| AppError::InferenceFailed("mobilenetv2 session not found".into()))?;

    let input_value =
        ort::value::Tensor::from_array(input).map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let outputs = session
        .run(ort::inputs![input_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let (_shape, logits) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "postprocessing", "percent": 90 }),
    )
    .ok();

    let probs = softmax(logits);
    let labels: Vec<String> =
        serde_json::from_str(IMAGENET_LABELS).map_err(|e| AppError::General(e.to_string()))?;

    let mut indexed: Vec<(usize, f32)> = probs.iter().enumerate().map(|(i, &p)| (i, p)).collect();
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let top5: Vec<ClassificationResult> = indexed
        .iter()
        .take(5)
        .map(|&(i, conf)| ClassificationResult {
            label: labels
                .get(i)
                .cloned()
                .unwrap_or_else(|| format!("class_{}", i)),
            confidence: conf,
        })
        .collect();

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "complete", "percent": 100 }),
    )
    .ok();

    Ok(top5)
}

// ── Style Transfer ──────────────────────────────────────────────────

#[tauri::command]
pub fn apply_style_transfer(
    app: AppHandle,
    state: State<'_, OnnxState>,
    path: String,
    style_id: String,
    strength: f32,
) -> Result<String, AppError> {
    use tauri::Emitter;

    // Validate style_id
    if !crate::models::registry::STYLE_MODEL_IDS.contains(&style_id.as_str()) {
        return Err(AppError::ModelNotFound(format!(
            "Unknown style model: {}",
            style_id
        )));
    }

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "loading_model", "percent": 10 }),
    )
    .ok();

    get_or_create_session(&app, &state, &style_id)?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "preprocessing", "percent": 25 }),
    )
    .ok();

    let img = image::open(&path)?;
    let (orig_w, orig_h) = (img.width(), img.height());

    // Size guard: cap at 2048px on any side to prevent OOM
    let max_dim = 2048_u32;
    let process_img = if orig_w > max_dim || orig_h > max_dim {
        let scale = max_dim as f32 / orig_w.max(orig_h) as f32;
        let new_w = (orig_w as f32 * scale) as u32;
        let new_h = (orig_h as f32 * scale) as u32;
        img.resize_exact(new_w, new_h, image::imageops::FilterType::Lanczos3)
    } else {
        img.clone()
    };

    let rgb = process_img.to_rgb8();
    let (pw, ph) = (rgb.width() as usize, rgb.height() as usize);

    // Style transfer models expect [1, 3, H, W] in [0, 255] float32 range
    let mut input = Array4::<f32>::zeros((1, 3, ph, pw));
    for y in 0..ph {
        for x in 0..pw {
            let pixel = rgb.get_pixel(x as u32, y as u32);
            for c in 0..3 {
                input[[0, c, y, x]] = pixel[c] as f32;
            }
        }
    }

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "inferring", "percent": 50 }),
    )
    .ok();

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut(&style_id)
        .ok_or_else(|| AppError::InferenceFailed(format!("{} session not found", style_id)))?;

    let input_value =
        ort::value::Tensor::from_array(input).map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let outputs = session
        .run(ort::inputs![input_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let (_shape, result_data) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "postprocessing", "percent": 80 }),
    )
    .ok();

    // Convert output tensor to image
    let mut styled = image::RgbImage::new(pw as u32, ph as u32);
    for y in 0..ph {
        for x in 0..pw {
            let r = result_data[0 * ph * pw + y * pw + x].clamp(0.0, 255.0) as u8;
            let g = result_data[1 * ph * pw + y * pw + x].clamp(0.0, 255.0) as u8;
            let b = result_data[2 * ph * pw + y * pw + x].clamp(0.0, 255.0) as u8;
            styled.put_pixel(x as u32, y as u32, image::Rgb([r, g, b]));
        }
    }

    // Blend with original: result = original * (1 - strength) + styled * strength
    let original_rgb = process_img.to_rgb8();
    let s = strength.clamp(0.0, 1.0);
    let mut blended = image::RgbImage::new(pw as u32, ph as u32);
    for y in 0..ph {
        for x in 0..pw {
            let orig = original_rgb.get_pixel(x as u32, y as u32);
            let sty = styled.get_pixel(x as u32, y as u32);
            let r = (orig[0] as f32 * (1.0 - s) + sty[0] as f32 * s).round() as u8;
            let g = (orig[1] as f32 * (1.0 - s) + sty[1] as f32 * s).round() as u8;
            let b = (orig[2] as f32 * (1.0 - s) + sty[2] as f32 * s).round() as u8;
            blended.put_pixel(x as u32, y as u32, image::Rgb([r, g, b]));
        }
    }

    // If we downscaled for processing, resize back to original
    let final_img = if orig_w > max_dim || orig_h > max_dim {
        DynamicImage::ImageRgb8(blended).resize_exact(
            orig_w,
            orig_h,
            image::imageops::FilterType::Lanczos3,
        )
    } else {
        DynamicImage::ImageRgb8(blended)
    };

    let output = save_temp_image(&final_img)?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "complete", "percent": 100 }),
    )
    .ok();

    Ok(output)
}

// ── Image Upscaling (Real-ESRGAN with Tiling) ──────────────────────

struct Tile {
    src_x: u32,
    src_y: u32,
    src_w: u32,
    src_h: u32,
}

fn compute_tiles(img_w: u32, img_h: u32, tile_size: u32, overlap: u32) -> Vec<Tile> {
    let mut tiles = Vec::new();
    let step = tile_size.saturating_sub(overlap).max(1);
    let mut y = 0_u32;
    loop {
        let mut x = 0_u32;
        let h = tile_size.min(img_h.saturating_sub(y));
        loop {
            let w = tile_size.min(img_w.saturating_sub(x));
            tiles.push(Tile {
                src_x: x,
                src_y: y,
                src_w: w,
                src_h: h,
            });
            if x + w >= img_w {
                break;
            }
            x += step;
            if x + tile_size > img_w {
                x = img_w.saturating_sub(tile_size);
            }
        }
        if y + h >= img_h {
            break;
        }
        y += step;
        if y + tile_size > img_h {
            y = img_h.saturating_sub(tile_size);
        }
    }
    tiles
}

#[tauri::command]
pub fn upscale_image(
    app: AppHandle,
    state: State<'_, OnnxState>,
    path: String,
    scale: u32,
) -> Result<String, AppError> {
    use tauri::Emitter;

    let scale = if scale == 2 || scale == 4 { scale } else { 4 };

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "loading_model", "percent": 5 }),
    )
    .ok();

    get_or_create_session(&app, &state, "realesrgan-x4")?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "preprocessing", "percent": 10 }),
    )
    .ok();

    let img = image::open(&path)?;
    let (orig_w, orig_h) = (img.width(), img.height());
    let rgb = img.to_rgb8();

    let tile_size = 128_u32;
    let overlap = 16_u32;
    let tiles = compute_tiles(orig_w, orig_h, tile_size, overlap);
    let total_tiles = tiles.len();

    let out_w = orig_w * scale;
    let out_h = orig_h * scale;
    let pixel_count = (out_w as usize) * (out_h as usize);
    let mut accum = vec![0.0_f32; pixel_count * 3];
    let mut weights = vec![0.0_f32; pixel_count * 3];

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("realesrgan-x4")
        .ok_or_else(|| AppError::InferenceFailed("realesrgan-x4 session not found".into()))?;

    for (tile_idx, tile) in tiles.iter().enumerate() {
        let percent = (tile_idx as f32 / total_tiles as f32 * 75.0 + 15.0) as u32;
        app.emit(
            "operation-progress",
            serde_json::json!({ "stage": "inferring", "percent": percent }),
        )
        .ok();

        let tw = tile.src_w as usize;
        let th = tile.src_h as usize;

        // Extract tile and normalize to [0, 1]
        let mut input = Array4::<f32>::zeros((1, 3, th, tw));
        for y in 0..th {
            for x in 0..tw {
                let pixel = rgb.get_pixel(tile.src_x + x as u32, tile.src_y + y as u32);
                for c in 0..3 {
                    input[[0, c, y, x]] = pixel[c] as f32 / 255.0;
                }
            }
        }

        let input_value = ort::value::Tensor::from_array(input)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        let outputs = session
            .run(ort::inputs![input_value])
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        let (_shape, result_data) = outputs[0]
            .try_extract_tensor::<f32>()
            .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

        let out_tile_w = (tw as u32 * scale) as usize;
        let out_tile_h = (th as u32 * scale) as usize;
        let out_x = (tile.src_x * scale) as usize;
        let out_y = (tile.src_y * scale) as usize;
        let overlap_scaled = (overlap * scale) as usize;

        for y in 0..out_tile_h {
            for x in 0..out_tile_w {
                let ox = out_x + x;
                let oy = out_y + y;
                if ox >= out_w as usize || oy >= out_h as usize {
                    continue;
                }

                // Linear blend weight for overlap regions
                let wx = if out_tile_w <= overlap_scaled * 2 {
                    1.0
                } else if x < overlap_scaled {
                    x as f32 / overlap_scaled as f32
                } else if x >= out_tile_w - overlap_scaled {
                    (out_tile_w - 1 - x) as f32 / overlap_scaled as f32
                } else {
                    1.0
                };
                let wy = if out_tile_h <= overlap_scaled * 2 {
                    1.0
                } else if y < overlap_scaled {
                    y as f32 / overlap_scaled as f32
                } else if y >= out_tile_h - overlap_scaled {
                    (out_tile_h - 1 - y) as f32 / overlap_scaled as f32
                } else {
                    1.0
                };
                let w = (wx * wy).max(0.001);

                let idx = (oy * out_w as usize + ox) * 3;
                for c in 0..3 {
                    let val = result_data[c * out_tile_h * out_tile_w + y * out_tile_w + x]
                        .clamp(0.0, 1.0)
                        * 255.0;
                    accum[idx + c] += val * w;
                    weights[idx + c] += w;
                }
            }
        }
    }

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "postprocessing", "percent": 92 }),
    )
    .ok();

    // Finalize output image
    let mut output = image::RgbImage::new(out_w, out_h);
    for y in 0..out_h {
        for x in 0..out_w {
            let idx = (y as usize * out_w as usize + x as usize) * 3;
            let r = if weights[idx] > 0.0 {
                (accum[idx] / weights[idx]).round() as u8
            } else {
                0
            };
            let g = if weights[idx + 1] > 0.0 {
                (accum[idx + 1] / weights[idx + 1]).round() as u8
            } else {
                0
            };
            let b = if weights[idx + 2] > 0.0 {
                (accum[idx + 2] / weights[idx + 2]).round() as u8
            } else {
                0
            };
            output.put_pixel(x, y, image::Rgb([r, g, b]));
        }
    }

    // If scale was 2 but model is 4x, resize down
    let final_img = if scale == 2 {
        DynamicImage::ImageRgb8(output).resize_exact(
            orig_w * 2,
            orig_h * 2,
            image::imageops::FilterType::Lanczos3,
        )
    } else {
        DynamicImage::ImageRgb8(output)
    };

    let output_path = save_temp_image(&final_img)?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "complete", "percent": 100 }),
    )
    .ok();

    Ok(output_path)
}

/// Core function for batch processing
pub fn upscale_image_core(
    app: &AppHandle,
    state: &OnnxState,
    path: &str,
    scale: u32,
) -> Result<String, AppError> {
    // For batch, reuse the tile logic but without progress events
    get_or_create_session(app, state, "realesrgan-x4")?;

    let img = image::open(path)?;
    let (orig_w, orig_h) = (img.width(), img.height());
    let rgb = img.to_rgb8();
    let scale = if scale == 2 || scale == 4 { scale } else { 4 };

    let tile_size = 128_u32;
    let overlap = 16_u32;
    let tiles = compute_tiles(orig_w, orig_h, tile_size, overlap);

    let out_w = orig_w * scale;
    let out_h = orig_h * scale;
    let pixel_count = (out_w as usize) * (out_h as usize);
    let mut accum = vec![0.0_f32; pixel_count * 3];
    let mut weights = vec![0.0_f32; pixel_count * 3];

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("realesrgan-x4")
        .ok_or_else(|| AppError::InferenceFailed("realesrgan-x4 session not found".into()))?;

    for tile in &tiles {
        let tw = tile.src_w as usize;
        let th = tile.src_h as usize;

        let mut input = Array4::<f32>::zeros((1, 3, th, tw));
        for y in 0..th {
            for x in 0..tw {
                let pixel = rgb.get_pixel(tile.src_x + x as u32, tile.src_y + y as u32);
                for c in 0..3 {
                    input[[0, c, y, x]] = pixel[c] as f32 / 255.0;
                }
            }
        }

        let input_value = ort::value::Tensor::from_array(input)
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        let outputs = session
            .run(ort::inputs![input_value])
            .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
        let (_shape, result_data) = outputs[0]
            .try_extract_tensor::<f32>()
            .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

        let out_tile_w = (tw as u32 * scale) as usize;
        let out_tile_h = (th as u32 * scale) as usize;
        let out_x = (tile.src_x * scale) as usize;
        let out_y = (tile.src_y * scale) as usize;
        let overlap_scaled = (overlap * scale) as usize;

        for y in 0..out_tile_h {
            for x in 0..out_tile_w {
                let ox = out_x + x;
                let oy = out_y + y;
                if ox >= out_w as usize || oy >= out_h as usize {
                    continue;
                }
                let wx = if out_tile_w <= overlap_scaled * 2 {
                    1.0
                } else if x < overlap_scaled {
                    x as f32 / overlap_scaled as f32
                } else if x >= out_tile_w - overlap_scaled {
                    (out_tile_w - 1 - x) as f32 / overlap_scaled as f32
                } else {
                    1.0
                };
                let wy = if out_tile_h <= overlap_scaled * 2 {
                    1.0
                } else if y < overlap_scaled {
                    y as f32 / overlap_scaled as f32
                } else if y >= out_tile_h - overlap_scaled {
                    (out_tile_h - 1 - y) as f32 / overlap_scaled as f32
                } else {
                    1.0
                };
                let w = (wx * wy).max(0.001);
                let idx = (oy * out_w as usize + ox) * 3;
                for c in 0..3 {
                    let val = result_data[c * out_tile_h * out_tile_w + y * out_tile_w + x]
                        .clamp(0.0, 1.0)
                        * 255.0;
                    accum[idx + c] += val * w;
                    weights[idx + c] += w;
                }
            }
        }
    }

    let mut output = image::RgbImage::new(out_w, out_h);
    for y in 0..out_h {
        for x in 0..out_w {
            let idx = (y as usize * out_w as usize + x as usize) * 3;
            let r = if weights[idx] > 0.0 { (accum[idx] / weights[idx]).round() as u8 } else { 0 };
            let g = if weights[idx + 1] > 0.0 { (accum[idx + 1] / weights[idx + 1]).round() as u8 } else { 0 };
            let b = if weights[idx + 2] > 0.0 { (accum[idx + 2] / weights[idx + 2]).round() as u8 } else { 0 };
            output.put_pixel(x, y, image::Rgb([r, g, b]));
        }
    }

    let final_img = if scale == 2 {
        DynamicImage::ImageRgb8(output).resize_exact(orig_w * 2, orig_h * 2, image::imageops::FilterType::Lanczos3)
    } else {
        DynamicImage::ImageRgb8(output)
    };

    save_temp_image(&final_img)
}

// ── Inpainting (LaMa) ──────────────────────────────────────────────

#[tauri::command]
pub fn apply_inpainting(
    app: AppHandle,
    state: State<'_, OnnxState>,
    image_path: String,
    mask_data: Vec<u8>,
    mask_width: u32,
    mask_height: u32,
) -> Result<String, AppError> {
    use tauri::Emitter;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "loading_model", "percent": 10 }),
    )
    .ok();

    get_or_create_session(&app, &state, "lama")?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "preprocessing", "percent": 25 }),
    )
    .ok();

    let img = image::open(&image_path)?;
    let (orig_w, orig_h) = (img.width(), img.height());

    // Reconstruct mask from raw bytes
    let mask = image::GrayImage::from_raw(mask_width, mask_height, mask_data)
        .ok_or_else(|| AppError::General("Invalid mask dimensions".into()))?;

    // Resize both to 512x512 (LaMa fixed input)
    let img_resized = img.resize_exact(512, 512, image::imageops::FilterType::Lanczos3);
    let mask_resized =
        image::imageops::resize(&mask, 512, 512, image::imageops::FilterType::Nearest);

    // Image tensor [1, 3, 512, 512] in [0, 255] range
    let rgb = img_resized.to_rgb8();
    let mut img_tensor = Array4::<f32>::zeros((1, 3, 512, 512));
    for y in 0..512_usize {
        for x in 0..512_usize {
            let pixel = rgb.get_pixel(x as u32, y as u32);
            for c in 0..3 {
                img_tensor[[0, c, y, x]] = pixel[c] as f32;
            }
        }
    }

    // Mask tensor [1, 1, 512, 512] binary 0.0 or 1.0
    let mut mask_tensor = Array4::<f32>::zeros((1, 1, 512, 512));
    for y in 0..512_usize {
        for x in 0..512_usize {
            let val = mask_resized.get_pixel(x as u32, y as u32)[0];
            mask_tensor[[0, 0, y, x]] = if val > 128 { 1.0 } else { 0.0 };
        }
    }

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "inferring", "percent": 50 }),
    )
    .ok();

    let mut sessions = state
        .sessions
        .lock()
        .map_err(|_| AppError::General("Session lock poisoned".into()))?;
    let session = sessions
        .get_mut("lama")
        .ok_or_else(|| AppError::InferenceFailed("lama session not found".into()))?;

    let img_value = ort::value::Tensor::from_array(img_tensor)
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;
    let mask_value = ort::value::Tensor::from_array(mask_tensor)
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    let outputs = session
        .run(ort::inputs![img_value, mask_value])
        .map_err(|e| AppError::InferenceFailed(e.to_string()))?;

    let (_shape, result_data) = outputs[0]
        .try_extract_tensor::<f32>()
        .map_err(|e: ort::Error| AppError::InferenceFailed(e.to_string()))?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "postprocessing", "percent": 80 }),
    )
    .ok();

    // Build 512x512 result image
    let mut result_rgb = image::RgbImage::new(512, 512);
    for y in 0..512_usize {
        for x in 0..512_usize {
            let r = result_data[0 * 512 * 512 + y * 512 + x].clamp(0.0, 255.0) as u8;
            let g = result_data[1 * 512 * 512 + y * 512 + x].clamp(0.0, 255.0) as u8;
            let b = result_data[2 * 512 * 512 + y * 512 + x].clamp(0.0, 255.0) as u8;
            result_rgb.put_pixel(x as u32, y as u32, image::Rgb([r, g, b]));
        }
    }

    // Resize result back to original dimensions
    let result_full = image::imageops::resize(
        &result_rgb,
        orig_w,
        orig_h,
        image::imageops::FilterType::Lanczos3,
    );

    // Composite: use inpainted pixels only where mask is white, keep original elsewhere
    let orig_rgb = img.to_rgb8();
    let mask_full =
        image::imageops::resize(&mask, orig_w, orig_h, image::imageops::FilterType::Nearest);
    let mut final_img = orig_rgb.clone();
    for y in 0..orig_h {
        for x in 0..orig_w {
            if mask_full.get_pixel(x, y)[0] > 128 {
                final_img.put_pixel(x, y, *result_full.get_pixel(x, y));
            }
        }
    }

    let output = save_temp_image(&DynamicImage::ImageRgb8(final_img))?;

    app.emit(
        "operation-progress",
        serde_json::json!({ "stage": "complete", "percent": 100 }),
    )
    .ok();

    Ok(output)
}
