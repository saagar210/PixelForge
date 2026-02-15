use crate::commands::{export, operations};
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchResizeRequest {
    pub input_paths: Vec<String>,
    pub output_dir: String,
    pub width: u32,
    pub height: u32,
    pub filter: String,
    pub format: String,
    pub quality: u8,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BatchResult {
    pub total: u32,
    pub processed: u32,
    pub failed: u32,
    pub outputs: Vec<String>,
    pub errors: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchProgressEvent {
    current: u32,
    total: u32,
    percent: u32,
    file: String,
}

fn format_extension(format: &str) -> Result<&'static str, AppError> {
    match format {
        "jpeg" | "jpg" => Ok("jpg"),
        "png" => Ok("png"),
        "webp" => Ok("webp"),
        "bmp" => Ok("bmp"),
        "tiff" => Ok("tiff"),
        "avif" => Ok("avif"),
        other => Err(AppError::UnsupportedFormat(other.to_string())),
    }
}

fn build_output_path(output_dir: &Path, input_path: &str, ext: &str) -> PathBuf {
    let source = Path::new(input_path);
    let stem = source
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    output_dir.join(format!("{}_resized.{}", stem, ext))
}

fn build_unique_output_path(output_dir: &Path, input_path: &str, ext: &str) -> PathBuf {
    let base = build_output_path(output_dir, input_path, ext);
    if !base.exists() {
        return base;
    }

    let source = Path::new(input_path);
    let stem = source
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");

    let mut index = 2_u32;
    loop {
        let candidate = output_dir.join(format!("{}_resized_{}.{}", stem, index, ext));
        if !candidate.exists() {
            return candidate;
        }
        index += 1;
    }
}

#[tauri::command]
pub fn run_batch_resize_export(
    app: AppHandle,
    request: BatchResizeRequest,
) -> Result<BatchResult, AppError> {
    use tauri::Emitter;

    if request.input_paths.is_empty() {
        return Err(AppError::General("No input files selected".into()));
    }

    if request.width == 0 || request.height == 0 {
        return Err(AppError::General(
            "Width and height must be greater than 0".into(),
        ));
    }

    let output_dir = Path::new(&request.output_dir);
    if !output_dir.exists() {
        std::fs::create_dir_all(output_dir)?;
    }

    let ext = format_extension(&request.format)?;

    let total = request.input_paths.len() as u32;
    let mut processed = 0_u32;
    let mut failed = 0_u32;
    let mut outputs = Vec::new();
    let mut errors = Vec::new();

    for (index, input) in request.input_paths.iter().enumerate() {
        let current = index as u32 + 1;
        let percent = ((current as f64 / total as f64) * 100.0).round() as u32;

        app.emit(
            "batch-progress",
            BatchProgressEvent {
                current,
                total,
                percent,
                file: input.clone(),
            },
        )
        .ok();

        let result: Result<String, AppError> = (|| {
            if !Path::new(input).exists() {
                return Err(AppError::FileRead("Input file does not exist".into()));
            }

            let resized_path =
                operations::resize_image(input, request.width, request.height, &request.filter)?;

            let output_path = build_unique_output_path(output_dir, input, ext);
            export::save_image(
                resized_path.clone(),
                output_path.to_string_lossy().into_owned(),
                request.format.clone(),
                request.quality,
            )?;

            std::fs::remove_file(&resized_path).ok();
            Ok(output_path.to_string_lossy().into_owned())
        })();

        match result {
            Ok(path) => {
                processed += 1;
                outputs.push(path);
            }
            Err(err) => {
                failed += 1;
                errors.push(format!("{}: {}", input, err));
            }
        }
    }

    let summary = BatchResult {
        total,
        processed,
        failed,
        outputs,
        errors,
    };

    app.emit("batch-complete", summary.clone()).ok();

    Ok(summary)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_mapping_works() {
        assert_eq!(format_extension("jpeg").expect("jpeg maps"), "jpg");
        assert_eq!(format_extension("png").expect("png maps"), "png");
        assert!(format_extension("xyz").is_err());
    }

    #[test]
    fn output_path_uses_stem_and_suffix() {
        let out = build_output_path(Path::new("/tmp/out"), "/tmp/a/photo.png", "jpg");
        assert!(out.ends_with("photo_resized.jpg"));
    }

    #[test]
    fn unique_path_appends_increment_when_collision_exists() {
        let dir =
            std::env::temp_dir().join(format!("pixelforge_batch_test_{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).expect("create temp dir");

        let first = dir.join("photo_resized.jpg");
        std::fs::write(&first, b"x").expect("seed collision file");

        let second = build_unique_output_path(&dir, "/tmp/photo.png", "jpg");
        assert!(second.ends_with("photo_resized_2.jpg"));

        std::fs::remove_dir_all(&dir).ok();
    }
}
