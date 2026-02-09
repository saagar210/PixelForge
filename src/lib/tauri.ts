import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageInfo } from "../types/image";

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
