use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
    pub url: &'static str,
    pub filename: &'static str,
    pub size_bytes: u64,
    pub sha256: Option<&'static str>,
}

pub const MODEL_U2NET: ModelInfo = ModelInfo {
    id: "u2net",
    name: "U²-Net Background Removal",
    description: "Segments foreground objects from background",
    url: "https://huggingface.co/tomjackson2023/rembg/resolve/main/u2net.onnx",
    filename: "u2net.onnx",
    size_bytes: 176_000_000,
    sha256: Some("8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491"),
};

pub const ALL_MODELS: &[&ModelInfo] = &[
    &MODEL_U2NET,
];

pub fn find_model(id: &str) -> Option<&'static ModelInfo> {
    ALL_MODELS.iter().find(|m| m.id == id).copied()
}
