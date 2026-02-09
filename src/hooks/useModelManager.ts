import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import type { ModelStatus, DownloadProgress } from "../types/image";
import * as tauri from "../lib/tauri";

export function useModelManager() {
  const [models, setModels] = useState<ModelStatus[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const statuses = await tauri.getModelsStatus();
      setModels(statuses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load models";
      setError(msg);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const unlistenProgress = listen<DownloadProgress>(
      "model-download-progress",
      (event) => {
        setProgress(event.payload);
      },
    );

    const unlistenComplete = listen<{ modelId: string }>(
      "model-download-complete",
      (event) => {
        if (downloading === event.payload.modelId) {
          setDownloading(null);
          setProgress(null);
          refresh();
        }
      },
    );

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, [downloading, refresh]);

  const download = useCallback(
    async (modelId: string) => {
      setDownloading(modelId);
      setError(null);
      try {
        await tauri.downloadModel(modelId);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Download failed";
        setError(msg);
        setDownloading(null);
        setProgress(null);
      }
    },
    [],
  );

  const remove = useCallback(
    async (modelId: string) => {
      try {
        await tauri.deleteModel(modelId);
        refresh();
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to delete model";
        setError(msg);
      }
    },
    [refresh],
  );

  return { models, downloading, progress, error, download, remove, refresh };
}
