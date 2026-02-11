import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageInfo, ModelStatus, PaletteColor, ClassificationResult, BatchResizeRequest, BatchResult } from "../types/image";

// Phase 1: Image loading
export async function getImageInfo(path: string): Promise<ImageInfo> {
  return invoke<ImageInfo>("get_image_info", { path });
}

export async function convertImage(path: string): Promise<string> {
  const bytes = await invoke<ArrayBuffer>("convert_image", { path });
  const blob = new Blob([bytes], { type: "image/png" });
  return URL.createObjectURL(blob);
}

export function getAssetUrl(path: string): string {
  return convertFileSrc(path);
}

// Phase 2: Image operations — each returns path to new temp file
export async function applyCrop(
  path: string,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<string> {
  return invoke<string>("apply_crop", { path, x, y, width, height });
}

export async function applyResize(
  path: string,
  width: number,
  height: number,
  filter: string,
): Promise<string> {
  return invoke<string>("apply_resize", { path, width, height, filter });
}

export async function applyRotate(
  path: string,
  degrees: number,
): Promise<string> {
  return invoke<string>("apply_rotate", { path, degrees });
}

export async function applyFlip(
  path: string,
  direction: string,
): Promise<string> {
  return invoke<string>("apply_flip", { path, direction });
}

export async function applyBrightness(
  path: string,
  value: number,
): Promise<string> {
  return invoke<string>("apply_brightness", { path, value });
}

export async function applyContrast(
  path: string,
  value: number,
): Promise<string> {
  return invoke<string>("apply_contrast", { path, value });
}

export async function applyHue(
  path: string,
  degrees: number,
): Promise<string> {
  return invoke<string>("apply_hue", { path, degrees });
}

export async function applySaturation(
  path: string,
  value: number,
): Promise<string> {
  return invoke<string>("apply_saturation", { path, value });
}

export async function applyLightness(
  path: string,
  value: number,
): Promise<string> {
  return invoke<string>("apply_lightness", { path, value });
}

export async function applyBlur(
  path: string,
  sigma: number,
): Promise<string> {
  return invoke<string>("apply_blur", { path, sigma });
}

export async function applySharpen(
  path: string,
  sigma: number,
  threshold: number,
): Promise<string> {
  return invoke<string>("apply_sharpen", { path, sigma, threshold });
}

// Phase 2: Export
export async function saveImage(
  sourcePath: string,
  destPath: string,
  format: string,
  quality: number,
): Promise<void> {
  return invoke<void>("save_image", { sourcePath, destPath, format, quality });
}

// Phase 3: Model management
export async function getModelsStatus(): Promise<ModelStatus[]> {
  return invoke<ModelStatus[]>("get_models_status");
}

export async function downloadModel(modelId: string): Promise<void> {
  return invoke<void>("download_model", { modelId });
}

export async function deleteModel(modelId: string): Promise<void> {
  return invoke<void>("delete_model", { modelId });
}

// Phase 3: AI operations
export async function removeBackground(path: string): Promise<string> {
  return invoke<string>("remove_background", { path });
}

// Phase 4: AI operations
export async function extractPalette(path: string, numColors: number): Promise<PaletteColor[]> {
  return invoke<PaletteColor[]>("extract_palette", { path, numColors });
}

export async function classifyImage(path: string): Promise<ClassificationResult[]> {
  return invoke<ClassificationResult[]>("classify_image", { path });
}

export async function applyStyleTransfer(
  path: string,
  styleId: string,
  strength: number,
): Promise<string> {
  return invoke<string>("apply_style_transfer", { path, styleId, strength });
}

export async function upscaleImage(path: string, scale: number): Promise<string> {
  return invoke<string>("upscale_image", { path, scale });
}

export async function applyInpainting(
  imagePath: string,
  maskData: number[],
  maskWidth: number,
  maskHeight: number,
): Promise<string> {
  return invoke<string>("apply_inpainting", {
    imagePath,
    maskData: Array.from(maskData),
    maskWidth,
    maskHeight,
  });
}


// Phase 5: Batch processing
export async function runBatchResizeExport(request: BatchResizeRequest): Promise<BatchResult> {
  return invoke<BatchResult>("run_batch_resize_export", { request });
}
