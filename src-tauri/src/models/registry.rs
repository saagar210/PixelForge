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
    name: "U\u{00b2}-Net Background Removal",
    description: "Segments foreground objects from background",
    url: "https://huggingface.co/tomjackson2023/rembg/resolve/main/u2net.onnx",
    filename: "u2net.onnx",
    size_bytes: 176_000_000,
    sha256: Some("8d10d2f3bb75ae3b6d527c77944fc5e7dcd94b29809d47a739a7a728a912b491"),
};

pub const MODEL_REALESRGAN_X4: ModelInfo = ModelInfo {
    id: "realesrgan-x4",
    name: "Real-ESRGAN x4",
    description: "AI image upscaling (4x resolution)",
    url: "https://huggingface.co/AXERA-TECH/Real-ESRGAN/resolve/main/onnx/realesrgan-x4.onnx",
    filename: "realesrgan-x4.onnx",
    size_bytes: 67_000_000,
    sha256: None, // TODO: fill after first verified download
};

pub const MODEL_LAMA: ModelInfo = ModelInfo {
    id: "lama",
    name: "LaMa Inpainting",
    description: "AI object removal and inpainting",
    url: "https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx",
    filename: "lama_fp32.onnx",
    size_bytes: 208_000_000,
    sha256: None, // TODO: fill after first verified download
};

pub const MODEL_STYLE_MOSAIC: ModelInfo = ModelInfo {
    id: "style-mosaic",
    name: "Mosaic Style",
    description: "Mosaic artistic style transfer",
    url: "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/mosaic-9.onnx",
    filename: "mosaic-9.onnx",
    size_bytes: 6_600_000,
    sha256: None,
};

pub const MODEL_STYLE_CANDY: ModelInfo = ModelInfo {
    id: "style-candy",
    name: "Candy Style",
    description: "Candy artistic style transfer",
    url: "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/candy-9.onnx",
    filename: "candy-9.onnx",
    size_bytes: 6_600_000,
    sha256: None,
};

pub const MODEL_STYLE_RAIN_PRINCESS: ModelInfo = ModelInfo {
    id: "style-rain-princess",
    name: "Rain Princess Style",
    description: "Rain Princess artistic style transfer",
    url: "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/rain-princess-9.onnx",
    filename: "rain-princess-9.onnx",
    size_bytes: 6_600_000,
    sha256: None,
};

pub const MODEL_STYLE_UDNIE: ModelInfo = ModelInfo {
    id: "style-udnie",
    name: "Udnie Style",
    description: "Udnie artistic style transfer",
    url: "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/udnie-9.onnx",
    filename: "udnie-9.onnx",
    size_bytes: 6_600_000,
    sha256: None,
};

pub const MODEL_STYLE_POINTILISM: ModelInfo = ModelInfo {
    id: "style-pointilism",
    name: "Pointilism Style",
    description: "Pointilism artistic style transfer",
    url: "https://github.com/onnx/models/raw/main/validated/vision/style_transfer/fast_neural_style/model/pointilism-9.onnx",
    filename: "pointilism-9.onnx",
    size_bytes: 6_600_000,
    sha256: None,
};

pub const MODEL_MOBILENETV2: ModelInfo = ModelInfo {
    id: "mobilenetv2",
    name: "MobileNetV2",
    description: "Image classification (1000 categories)",
    url: "https://huggingface.co/onnxmodelzoo/mobilenetv2-12/resolve/main/model/mobilenetv2-12.onnx",
    filename: "mobilenetv2-12.onnx",
    size_bytes: 13_300_000,
    sha256: None, // TODO: fill after first verified download
};

pub const ALL_MODELS: &[&ModelInfo] = &[
    &MODEL_U2NET,
    &MODEL_REALESRGAN_X4,
    &MODEL_LAMA,
    &MODEL_STYLE_MOSAIC,
    &MODEL_STYLE_CANDY,
    &MODEL_STYLE_RAIN_PRINCESS,
    &MODEL_STYLE_UDNIE,
    &MODEL_STYLE_POINTILISM,
    &MODEL_MOBILENETV2,
];

pub fn find_model(id: &str) -> Option<&'static ModelInfo> {
    ALL_MODELS.iter().find(|m| m.id == id).copied()
}

pub const STYLE_MODEL_IDS: &[&str] = &[
    "style-mosaic",
    "style-candy",
    "style-rain-princess",
    "style-udnie",
    "style-pointilism",
];
