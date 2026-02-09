use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Failed to read file: {0}")]
    FileRead(String),

    #[error("Failed to decode image: {0}")]
    ImageDecode(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("{0}")]
    General(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        let kind = match self {
            AppError::FileRead(_) => "FileRead",
            AppError::ImageDecode(_) => "ImageDecode",
            AppError::UnsupportedFormat(_) => "UnsupportedFormat",
            AppError::General(_) => "General",
        };
        state.serialize_field("kind", kind)?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileRead(err.to_string())
    }
}

impl From<image::ImageError> for AppError {
    fn from(err: image::ImageError) -> Self {
        AppError::ImageDecode(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_serializes_correctly() {
        let err = AppError::FileRead("not found".into());
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["kind"], "FileRead");
        assert!(json["message"].as_str().unwrap().contains("not found"));
    }

    #[test]
    fn all_variants_serialize() {
        let variants: Vec<AppError> = vec![
            AppError::FileRead("a".into()),
            AppError::ImageDecode("b".into()),
            AppError::UnsupportedFormat("c".into()),
            AppError::General("d".into()),
        ];
        for err in variants {
            let json = serde_json::to_value(&err).unwrap();
            assert!(json["kind"].is_string());
            assert!(json["message"].is_string());
        }
    }
}
