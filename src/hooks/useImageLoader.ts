import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../stores/useAppStore";
import { getImageInfo, convertImage, getAssetUrl } from "../lib/tauri";

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "tiff",
  "tif",
];

export function useImageLoader() {
  const { setImage, setLoading, setError, clearImage } = useAppStore();

  const loadImageFromPath = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);

      try {
        const info = await getImageInfo(path);

        let url: string;
        if (info.needsConversion) {
          url = await convertImage(path);
        } else {
          url = getAssetUrl(path);
        }

        setImage(url, info);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : "Failed to load image";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setImage, setLoading, setError],
  );

  const openFileDialog = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Images",
            extensions: IMAGE_EXTENSIONS,
          },
        ],
      });

      if (selected) {
        clearImage();
        await loadImageFromPath(selected);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to open file dialog";
      setError(message);
    }
  }, [loadImageFromPath, clearImage, setError]);

  return { openFileDialog, loadImageFromPath };
}
