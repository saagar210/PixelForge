use crate::error::AppError;
use image::DynamicImage;

fn save_temp_image(img: &DynamicImage) -> Result<String, AppError> {
    let id = uuid::Uuid::new_v4();
    let path = std::env::temp_dir().join(format!("pixelforge_{}.png", id));
    img.save(&path).map_err(|e| AppError::SaveFailed(e.to_string()))?;
    Ok(path.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn apply_crop(path: String, x: u32, y: u32, width: u32, height: u32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    if x + width > img.width() || y + height > img.height() {
        return Err(AppError::General("Crop region exceeds image bounds".into()));
    }
    let cropped = img.crop_imm(x, y, width, height);
    save_temp_image(&cropped)
}

#[tauri::command]
pub fn apply_resize(path: String, width: u32, height: u32, filter: String) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let filter_type = match filter.as_str() {
        "lanczos" => image::imageops::FilterType::Lanczos3,
        "bilinear" => image::imageops::FilterType::Triangle,
        "nearest" => image::imageops::FilterType::Nearest,
        other => return Err(AppError::General(format!("Unknown filter: {}", other))),
    };
    let resized = img.resize_exact(width, height, filter_type);
    save_temp_image(&resized)
}

#[tauri::command]
pub fn apply_rotate(path: String, degrees: i32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let rotated = match degrees {
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 | -90 => img.rotate270(),
        _ => return Err(AppError::General("Only 90, 180, 270 degree rotations supported".into())),
    };
    save_temp_image(&rotated)
}

#[tauri::command]
pub fn apply_flip(path: String, direction: String) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let flipped = match direction.as_str() {
        "horizontal" => img.fliph(),
        "vertical" => img.flipv(),
        _ => return Err(AppError::General("Direction must be 'horizontal' or 'vertical'".into())),
    };
    save_temp_image(&flipped)
}

#[tauri::command]
pub fn apply_brightness(path: String, value: i32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let value = value.clamp(-255, 255);
    let result = img.brighten(value);
    save_temp_image(&result)
}

#[tauri::command]
pub fn apply_contrast(path: String, value: f32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let value = value.clamp(-100.0, 100.0);
    let result = img.adjust_contrast(value);
    save_temp_image(&result)
}

#[tauri::command]
pub fn apply_hue(path: String, degrees: i32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let result = img.huerotate(degrees);
    save_temp_image(&result)
}

// --- HSL helpers (image crate lacks saturation/lightness) ---

fn rgb_to_hsl(r: u8, g: u8, b: u8) -> (f32, f32, f32) {
    let r = r as f32 / 255.0;
    let g = g as f32 / 255.0;
    let b = b as f32 / 255.0;
    let max = r.max(g).max(b);
    let min = r.min(g).min(b);
    let l = (max + min) / 2.0;
    if (max - min).abs() < f32::EPSILON {
        return (0.0, 0.0, l);
    }
    let d = max - min;
    let s = if l > 0.5 { d / (2.0 - max - min) } else { d / (max + min) };
    let h = if (max - r).abs() < f32::EPSILON {
        ((g - b) / d + if g < b { 6.0 } else { 0.0 }) / 6.0
    } else if (max - g).abs() < f32::EPSILON {
        ((b - r) / d + 2.0) / 6.0
    } else {
        ((r - g) / d + 4.0) / 6.0
    };
    (h, s, l)
}

fn hue_to_rgb(p: f32, q: f32, mut t: f32) -> f32 {
    if t < 0.0 { t += 1.0; }
    if t > 1.0 { t -= 1.0; }
    if t < 1.0 / 6.0 { return p + (q - p) * 6.0 * t; }
    if t < 0.5 { return q; }
    if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6.0; }
    p
}

fn hsl_to_rgb(h: f32, s: f32, l: f32) -> (u8, u8, u8) {
    if s.abs() < f32::EPSILON {
        let v = (l * 255.0).round() as u8;
        return (v, v, v);
    }
    let q = if l < 0.5 { l * (1.0 + s) } else { l + s - l * s };
    let p = 2.0 * l - q;
    let r = hue_to_rgb(p, q, h + 1.0 / 3.0);
    let g = hue_to_rgb(p, q, h);
    let b = hue_to_rgb(p, q, h - 1.0 / 3.0);
    (
        (r * 255.0).round() as u8,
        (g * 255.0).round() as u8,
        (b * 255.0).round() as u8,
    )
}

#[tauri::command]
pub fn apply_saturation(path: String, value: f32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let mut rgba = img.to_rgba8();
    let factor = 1.0 + value / 100.0;

    for pixel in rgba.pixels_mut() {
        let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
        let new_s = (s * factor).clamp(0.0, 1.0);
        let (r, g, b) = hsl_to_rgb(h, new_s, l);
        pixel[0] = r;
        pixel[1] = g;
        pixel[2] = b;
    }

    save_temp_image(&DynamicImage::ImageRgba8(rgba))
}

#[tauri::command]
pub fn apply_lightness(path: String, value: f32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let mut rgba = img.to_rgba8();

    for pixel in rgba.pixels_mut() {
        let (h, s, l) = rgb_to_hsl(pixel[0], pixel[1], pixel[2]);
        let new_l = (l + value / 100.0).clamp(0.0, 1.0);
        let (r, g, b) = hsl_to_rgb(h, s, new_l);
        pixel[0] = r;
        pixel[1] = g;
        pixel[2] = b;
    }

    save_temp_image(&DynamicImage::ImageRgba8(rgba))
}

#[tauri::command]
pub fn apply_blur(path: String, sigma: f32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let sigma = sigma.clamp(0.1, 50.0);
    let blurred = img.blur(sigma);
    save_temp_image(&blurred)
}

#[tauri::command]
pub fn apply_sharpen(path: String, sigma: f32, threshold: i32) -> Result<String, AppError> {
    let img = image::open(&path)?;
    let sharpened = img.unsharpen(sigma, threshold);
    save_temp_image(&sharpened)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_image(w: u32, h: u32) -> String {
        let img = image::RgbaImage::from_fn(w, h, |x, y| {
            image::Rgba([(x % 256) as u8, (y % 256) as u8, 128, 255])
        });
        let path = std::env::temp_dir().join(format!("pixelforge_test_{}.png", uuid::Uuid::new_v4()));
        img.save(&path).unwrap();
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn test_crop_valid() {
        let path = create_test_image(100, 100);
        let result = apply_crop(path, 10, 10, 50, 50).unwrap();
        let img = image::open(&result).unwrap();
        assert_eq!(img.width(), 50);
        assert_eq!(img.height(), 50);
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_crop_out_of_bounds() {
        let path = create_test_image(100, 100);
        let result = apply_crop(path, 60, 60, 50, 50);
        assert!(result.is_err());
    }

    #[test]
    fn test_resize() {
        let path = create_test_image(100, 100);
        let result = apply_resize(path, 50, 50, "lanczos".into()).unwrap();
        let img = image::open(&result).unwrap();
        assert_eq!(img.width(), 50);
        assert_eq!(img.height(), 50);
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_resize_invalid_filter() {
        let path = create_test_image(100, 100);
        let result = apply_resize(path, 50, 50, "unknown".into());
        assert!(result.is_err());
    }

    #[test]
    fn test_rotate_90() {
        let path = create_test_image(100, 200);
        let result = apply_rotate(path, 90).unwrap();
        let img = image::open(&result).unwrap();
        assert_eq!(img.width(), 200);
        assert_eq!(img.height(), 100);
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_rotate_180() {
        let path = create_test_image(100, 200);
        let result = apply_rotate(path, 180).unwrap();
        let img = image::open(&result).unwrap();
        assert_eq!(img.width(), 100);
        assert_eq!(img.height(), 200);
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_flip() {
        let path = create_test_image(100, 100);
        let result = apply_flip(path, "horizontal".into()).unwrap();
        let img = image::open(&result).unwrap();
        assert_eq!(img.width(), 100);
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_brightness() {
        let path = create_test_image(50, 50);
        let result = apply_brightness(path, 50).unwrap();
        assert!(std::path::Path::new(&result).exists());
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_contrast() {
        let path = create_test_image(50, 50);
        let result = apply_contrast(path, 30.0).unwrap();
        assert!(std::path::Path::new(&result).exists());
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_saturation() {
        let path = create_test_image(50, 50);
        let result = apply_saturation(path, 50.0).unwrap();
        assert!(std::path::Path::new(&result).exists());
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_blur() {
        let path = create_test_image(50, 50);
        let result = apply_blur(path, 2.0).unwrap();
        assert!(std::path::Path::new(&result).exists());
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_sharpen() {
        let path = create_test_image(50, 50);
        let result = apply_sharpen(path, 1.5, 10).unwrap();
        assert!(std::path::Path::new(&result).exists());
        std::fs::remove_file(&result).ok();
    }

    #[test]
    fn test_hsl_roundtrip() {
        // White
        let (h, s, l) = rgb_to_hsl(255, 255, 255);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert_eq!((r, g, b), (255, 255, 255));

        // Black
        let (h, s, l) = rgb_to_hsl(0, 0, 0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert_eq!((r, g, b), (0, 0, 0));

        // Red
        let (h, s, l) = rgb_to_hsl(255, 0, 0);
        let (r, g, b) = hsl_to_rgb(h, s, l);
        assert_eq!((r, g, b), (255, 0, 0));
    }
}
