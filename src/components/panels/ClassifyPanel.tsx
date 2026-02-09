import { useState } from "react";
import { Download, Trash2, Brain, Loader2 } from "lucide-react";
import { useModelManager } from "../../hooks/useModelManager";
import { useAppStore } from "../../stores/useAppStore";
import { classifyImage } from "../../lib/tauri";
import type { ClassificationResult } from "../../types/image";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function ClassifyPanel() {
  const { models, downloading, progress, download, remove } =
    useModelManager();
  const currentFilePath = useAppStore((s) => s.currentFilePath);
  const [results, setResults] = useState<ClassificationResult[] | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const model = models.find((m) => m.id === "mobilenetv2");

  const handleClassify = async () => {
    if (!currentFilePath) return;
    setIsClassifying(true);
    setError(null);
    try {
      const res = await classifyImage(currentFilePath);
      setResults(res);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Classification failed";
      setError(msg);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={14} />
        <span className="text-xs font-medium">Image Classification</span>
        {model?.installed && (
          <span className="text-xs text-green-500 ml-auto">Ready</span>
        )}
      </div>

      <p className="text-xs text-(--color-text-secondary)">
        Identify objects in your image (top 5 predictions)
      </p>

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">
          {error}
        </div>
      )}

      {!model?.installed ? (
        <div className="space-y-2">
          <p className="text-xs text-(--color-text-secondary)">
            Model needs to be downloaded ({model ? formatBytes(model.sizeBytes) : "~13 MB"})
          </p>
          {downloading === "mobilenetv2" && progress ? (
            <div className="space-y-1">
              <div className="w-full h-1.5 rounded-full bg-(--color-bg-tertiary)">
                <div
                  className="h-full rounded-full bg-(--color-accent) transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-xs text-(--color-text-secondary)">
                {progress.percent}% ({formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)})
              </span>
            </div>
          ) : (
            <button
              onClick={() => download("mobilenetv2")}
              disabled={downloading !== null}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              Download Model
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={handleClassify}
            disabled={isClassifying || !currentFilePath}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
          >
            {isClassifying ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Brain size={12} />
            )}
            {isClassifying ? "Classifying..." : "Classify Image"}
          </button>

          {results && (
            <div className="space-y-1">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-(--color-text-primary) capitalize">
                        {r.label}
                      </span>
                      <span className="text-(--color-text-secondary)">
                        {(r.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-(--color-bg-tertiary)">
                      <div
                        className="h-full rounded-full bg-(--color-accent) transition-all"
                        style={{ width: `${r.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => remove("mobilenetv2")}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
            Delete Model
          </button>
        </div>
      )}
    </div>
  );
}
