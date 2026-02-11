export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  fileName: string;
  filePath: string;
  needsConversion: boolean;
}

export interface AppError {
  kind: string;
  message: string;
}

// Phase 2: Operations
export type OperationType =
  | "crop"
  | "resize"
  | "rotate"
  | "flip"
  | "brightness"
  | "contrast"
  | "hue"
  | "saturation"
  | "lightness"
  | "blur"
  | "sharpen";

export interface OperationHistoryEntry {
  type: OperationType | "ai";
  label: string;
  imagePath: string;
}

export interface CropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeParams {
  width: number;
  height: number;
  filter: "lanczos" | "bilinear" | "nearest";
}

export interface SaveParams {
  sourcePath: string;
  destPath: string;
  format: string;
  quality: number;
}

// Phase 3: Models
export interface ModelStatus {
  id: string;
  name: string;
  description: string;
  sizeBytes: number;
  installed: boolean;
}

export interface DownloadProgress {
  modelId: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
}

// Phase 4: AI Operations
export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  percentage: number;
}

export interface ClassificationResult {
  label: string;
  confidence: number;
}

export interface BatchResizeRequest {
  inputPaths: string[];
  outputDir: string;
  width: number;
  height: number;
  filter: "lanczos" | "bilinear" | "nearest";
  format: "png" | "jpeg" | "webp" | "bmp" | "tiff" | "avif";
  quality: number;
}

export interface BatchResult {
  total: number;
  processed: number;
  failed: number;
  outputs: string[];
  errors: string[];
}

export interface BatchProgress {
  current: number;
  total: number;
  percent: number;
  file: string;
}
