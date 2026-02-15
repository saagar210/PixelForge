use crate::error::AppError;

#[tauri::command]
pub fn save_image(
    source_path: String,
    dest_path: String,
    format: String,
    quality: u8,
) -> Result<(), AppError> {
    let img = image::open(&source_path)?;

    match format.as_str() {
        "jpeg" | "jpg" => {
            let mut file = std::fs::File::create(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut file, quality);
            img.write_with_encoder(encoder)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        "png" => {
            img.save(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        "webp" => {
            img.save(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        "bmp" => {
            img.save(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        "tiff" => {
            img.save(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        "avif" => {
            img.save(&dest_path)
                .map_err(|e| AppError::SaveFailed(e.to_string()))?;
        }
        other => {
            return Err(AppError::UnsupportedFormat(other.into()));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_image() -> String {
        let img = image::RgbaImage::new(10, 10);
        let path = std::env::temp_dir().join(format!(
            "pixelforge_export_test_{}.png",
            uuid::Uuid::new_v4()
        ));
        img.save(&path).unwrap();
        path.to_string_lossy().into_owned()
    }

    #[test]
    fn test_save_jpeg() {
        let src = create_test_image();
        let dest = std::env::temp_dir().join("pixelforge_test_out.jpg");
        save_image(src, dest.to_string_lossy().into(), "jpeg".into(), 85).unwrap();
        assert!(dest.exists());
        // Verify JPEG magic bytes
        let bytes = std::fs::read(&dest).unwrap();
        assert_eq!(bytes[0], 0xFF);
        assert_eq!(bytes[1], 0xD8);
        std::fs::remove_file(&dest).ok();
    }

    #[test]
    fn test_save_png() {
        let src = create_test_image();
        let dest = std::env::temp_dir().join("pixelforge_test_out.png");
        save_image(src, dest.to_string_lossy().into(), "png".into(), 100).unwrap();
        assert!(dest.exists());
        let bytes = std::fs::read(&dest).unwrap();
        assert_eq!(&bytes[0..4], &[0x89, 0x50, 0x4E, 0x47]);
        std::fs::remove_file(&dest).ok();
    }

    #[test]
    fn test_save_unsupported() {
        let src = create_test_image();
        let dest = std::env::temp_dir().join("pixelforge_test_out.xyz");
        let result = save_image(src, dest.to_string_lossy().into(), "xyz".into(), 100);
        assert!(result.is_err());
    }
}
