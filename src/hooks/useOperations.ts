import { useCallback } from "react";
import { useAppStore } from "../stores/useAppStore";
import { getAssetUrl } from "../lib/tauri";
import * as tauri from "../lib/tauri";
import type { OperationType } from "../types/image";

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return "Operation failed";
}

export function useOperations() {
  const { currentFilePath, pushOperation, setProcessing, setError, setImage, imageInfo } =
    useAppStore();

  const runOperation = useCallback(
    async (
      type: OperationType | "ai",
      label: string,
      invoke: (path: string) => Promise<string>,
    ) => {
      if (!currentFilePath) {
        setError("No image loaded");
        return;
      }

      setProcessing(true);
      try {
        const resultPath = await invoke(currentFilePath);
        const url = getAssetUrl(resultPath);
        pushOperation({ type, label, imagePath: resultPath });
        if (imageInfo) {
          setImage(url, imageInfo);
        }
      } catch (err: unknown) {
        setError(extractError(err));
      } finally {
        setProcessing(false);
      }
    },
    [currentFilePath, pushOperation, setProcessing, setError, setImage, imageInfo],
  );

  const crop = useCallback(
    (x: number, y: number, width: number, height: number) =>
      runOperation("crop", `Crop ${width}x${height}`, (p) =>
        tauri.applyCrop(p, x, y, width, height),
      ),
    [runOperation],
  );

  const resize = useCallback(
    (width: number, height: number, filter: string) =>
      runOperation("resize", `Resize to ${width}x${height}`, (p) =>
        tauri.applyResize(p, width, height, filter),
      ),
    [runOperation],
  );

  const rotate = useCallback(
    (degrees: number) =>
      runOperation("rotate", `Rotate ${degrees}deg`, (p) =>
        tauri.applyRotate(p, degrees),
      ),
    [runOperation],
  );

  const flip = useCallback(
    (direction: "horizontal" | "vertical") =>
      runOperation("flip", `Flip ${direction}`, (p) =>
        tauri.applyFlip(p, direction),
      ),
    [runOperation],
  );

  const brightness = useCallback(
    (value: number) =>
      runOperation("brightness", `Brightness ${value > 0 ? "+" : ""}${value}`, (p) =>
        tauri.applyBrightness(p, value),
      ),
    [runOperation],
  );

  const contrast = useCallback(
    (value: number) =>
      runOperation("contrast", `Contrast ${value > 0 ? "+" : ""}${value}`, (p) =>
        tauri.applyContrast(p, value),
      ),
    [runOperation],
  );

  const hue = useCallback(
    (degrees: number) =>
      runOperation("hue", `Hue ${degrees > 0 ? "+" : ""}${degrees}deg`, (p) =>
        tauri.applyHue(p, degrees),
      ),
    [runOperation],
  );

  const saturation = useCallback(
    (value: number) =>
      runOperation("saturation", `Saturation ${value > 0 ? "+" : ""}${value}`, (p) =>
        tauri.applySaturation(p, value),
      ),
    [runOperation],
  );

  const lightness = useCallback(
    (value: number) =>
      runOperation("lightness", `Lightness ${value > 0 ? "+" : ""}${value}`, (p) =>
        tauri.applyLightness(p, value),
      ),
    [runOperation],
  );

  const blur = useCallback(
    (sigma: number) =>
      runOperation("blur", `Blur ${sigma.toFixed(1)}`, (p) =>
        tauri.applyBlur(p, sigma),
      ),
    [runOperation],
  );

  const sharpen = useCallback(
    (sigma: number, threshold: number) =>
      runOperation("sharpen", `Sharpen ${sigma.toFixed(1)}`, (p) =>
        tauri.applySharpen(p, sigma, threshold),
      ),
    [runOperation],
  );

  return {
    crop,
    resize,
    rotate,
    flip,
    brightness,
    contrast,
    hue,
    saturation,
    lightness,
    blur,
    sharpen,
  };
}
