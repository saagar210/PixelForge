use crate::error::AppError;
use serde::Serialize;
use std::path::Path;
use tauri::ipc::{InvokeResponseBody, Response};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
    pub file_size_bytes: u64,
    pub file_name: String,
    pub file_path: String,
    pub needs_conversion: bool,
}

fn detect_format(path: &Path) -> Result<(String, bool), AppError> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "jpg" | "jpeg" => Ok(("JPEG".into(), false)),
        "png" => Ok(("PNG".into(), false)),
        "webp" => Ok(("WebP".into(), false)),
        "avif" => Ok(("AVIF".into(), false)),
        "gif" => Ok(("GIF".into(), false)),
        "bmp" => Ok(("BMP".into(), false)),
        "tiff" | "tif" => Ok(("TIFF".into(), true)),
        other => Err(AppError::UnsupportedFormat(other.to_string())),
    }
}

#[tauri::command]
pub fn get_image_info(path: String) -> Result<ImageInfo, AppError> {
    let file_path = Path::new(&path);

    let metadata = std::fs::metadata(file_path)?;
    let (format, needs_conversion) = detect_format(file_path)?;
    let (width, height) =
        image::image_dimensions(file_path).map_err(|e| AppError::ImageDecode(e.to_string()))?;

    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    Ok(ImageInfo {
        width,
        height,
        format,
        file_size_bytes: metadata.len(),
        file_name,
        file_path: path,
        needs_conversion,
    })
}

#[tauri::command]
pub fn convert_image(path: String) -> Result<Response, AppError> {
    let img = image::open(&path)?;
    let mut bytes: Vec<u8> = Vec::new();
    img.write_to(
        &mut std::io::Cursor::new(&mut bytes),
        image::ImageFormat::Png,
    )
    .map_err(|e| AppError::ImageDecode(e.to_string()))?;

    Ok(Response::new(InvokeResponseBody::Raw(bytes)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_image_info_nonexistent_file() {
        let result = get_image_info("/nonexistent/file.png".into());
        assert!(result.is_err());
    }

    #[test]
    fn detect_format_known() {
        let cases = vec![
            ("test.jpg", "JPEG", false),
            ("test.jpeg", "JPEG", false),
            ("test.png", "PNG", false),
            ("test.webp", "WebP", false),
            ("test.gif", "GIF", false),
            ("test.bmp", "BMP", false),
            ("test.tiff", "TIFF", true),
            ("test.tif", "TIFF", true),
            ("test.avif", "AVIF", false),
        ];
        for (name, expected_fmt, expected_conv) in cases {
            let (fmt, conv) = detect_format(Path::new(name)).unwrap();
            assert_eq!(fmt, expected_fmt, "failed for {}", name);
            assert_eq!(conv, expected_conv, "failed for {}", name);
        }
    }

    #[test]
    fn detect_format_unknown() {
        let result = detect_format(Path::new("test.xyz"));
        assert!(result.is_err());
    }

    #[test]
    fn get_image_info_real_png() {
        // Create a minimal 1x1 PNG in a temp file
        let dir = std::env::temp_dir();
        let path = dir.join("pixelforge_test.png");
        let img = image::RgbaImage::new(1, 1);
        img.save(&path).unwrap();

        let info = get_image_info(path.to_string_lossy().into()).unwrap();
        assert_eq!(info.width, 1);
        assert_eq!(info.height, 1);
        assert_eq!(info.format, "PNG");
        assert!(!info.needs_conversion);
        assert!(info.file_size_bytes > 0);

        std::fs::remove_file(&path).ok();
    }
}
