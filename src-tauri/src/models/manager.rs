use crate::error::AppError;
use crate::models::registry;
use serde::Serialize;
use tauri::AppHandle;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub id: String,
    pub name: String,
    pub description: String,
    pub size_bytes: u64,
    pub installed: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub model_id: String,
    pub percent: u32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
}

fn models_dir(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    use tauri::Manager;
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::General(e.to_string()))?;
    let dir = base.join("models");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

pub fn get_model_path(app: &AppHandle, model_id: &str) -> Result<std::path::PathBuf, AppError> {
    let model =
        registry::find_model(model_id).ok_or_else(|| AppError::ModelNotFound(model_id.into()))?;
    let path = models_dir(app)?.join(model.filename);
    if !path.exists() {
        return Err(AppError::ModelNotFound(format!(
            "Model '{}' is not downloaded. Download it first.",
            model.name
        )));
    }
    Ok(path)
}

#[tauri::command]
pub fn get_models_status(app: AppHandle) -> Result<Vec<ModelStatus>, AppError> {
    let dir = models_dir(&app)?;
    let statuses = registry::ALL_MODELS
        .iter()
        .map(|m| {
            let installed = dir.join(m.filename).exists();
            ModelStatus {
                id: m.id.to_string(),
                name: m.name.to_string(),
                description: m.description.to_string(),
                size_bytes: m.size_bytes,
                installed,
            }
        })
        .collect();
    Ok(statuses)
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model_id: String) -> Result<(), AppError> {
    use futures_util::StreamExt;
    use tauri::Emitter;

    let model =
        registry::find_model(&model_id).ok_or_else(|| AppError::ModelNotFound(model_id.clone()))?;

    let dir = models_dir(&app)?;
    let output_path = dir.join(model.filename);

    // Verify cached model if already present
    if output_path.exists() {
        if let Some(expected_hash) = model.sha256 {
            let actual_hash = compute_sha256(&output_path)?;
            if actual_hash == expected_hash {
                // Cached model is valid
                return Ok(());
            } else {
                // Corrupted cache, remove and re-download
                tokio::fs::remove_file(&output_path).await.ok();
            }
        } else {
            // No hash to verify, trust cached model
            return Ok(());
        }
    }

    let client = reqwest::Client::new();
    let response = client
        .get(model.url)
        .send()
        .await
        .map_err(|e| AppError::DownloadFailed(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::DownloadFailed(format!(
            "HTTP {}",
            response.status()
        )));
    }

    let total = response.content_length().unwrap_or(model.size_bytes);
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&output_path)
        .await
        .map_err(|e| AppError::DownloadFailed(e.to_string()))?;
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::DownloadFailed(e.to_string()))?;
        tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
            .await
            .map_err(|e| AppError::DownloadFailed(e.to_string()))?;
        downloaded += chunk.len() as u64;
        let percent = (downloaded as f64 / total as f64 * 100.0) as u32;
        app.emit(
            "model-download-progress",
            DownloadProgress {
                model_id: model.id.to_string(),
                percent,
                downloaded_bytes: downloaded,
                total_bytes: total,
            },
        )
        .ok();
    }

    // Verify SHA-256 if available
    if let Some(expected_hash) = model.sha256 {
        let actual_hash = compute_sha256(&output_path)?;
        if actual_hash != expected_hash {
            tokio::fs::remove_file(&output_path).await.ok();
            return Err(AppError::DownloadFailed(
                "SHA-256 checksum mismatch — download corrupted".into(),
            ));
        }
    }

    app.emit(
        "model-download-complete",
        serde_json::json!({ "modelId": model.id }),
    )
    .ok();
    Ok(())
}

#[tauri::command]
pub async fn delete_model(app: AppHandle, model_id: String) -> Result<(), AppError> {
    let model =
        registry::find_model(&model_id).ok_or_else(|| AppError::ModelNotFound(model_id.clone()))?;
    let dir = models_dir(&app)?;
    let path = dir.join(model.filename);
    if path.exists() {
        tokio::fs::remove_file(&path)
            .await
            .map_err(|e| AppError::General(e.to_string()))?;
    }
    Ok(())
}

fn compute_sha256(path: &std::path::Path) -> Result<String, AppError> {
    use sha2::{Digest, Sha256};
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher).map_err(|e| AppError::General(e.to_string()))?;
    Ok(format!("{:x}", hasher.finalize()))
}
