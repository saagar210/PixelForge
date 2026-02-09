import { Download, Trash2, Sparkles, Loader2 } from "lucide-react";
import { useModelManager } from "../../hooks/useModelManager";
import { useAppStore } from "../../stores/useAppStore";
import { removeBackground } from "../../lib/tauri";
import { getAssetUrl } from "../../lib/tauri";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function AiPanel() {
  const { models, downloading, progress, error, download, remove } =
    useModelManager();
  const currentFilePath = useAppStore((s) => s.currentFilePath);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const setProcessing = useAppStore((s) => s.setProcessing);
  const setError = useAppStore((s) => s.setError);
  const pushOperation = useAppStore((s) => s.pushOperation);
  const setImage = useAppStore((s) => s.setImage);
  const imageInfo = useAppStore((s) => s.imageInfo);
  const setBeforeAfter = useAppStore((s) => s.setBeforeAfter);

  const u2net = models.find((m) => m.id === "u2net");

  const handleRemoveBackground = async () => {
    if (!currentFilePath || !imageInfo) return;
    setProcessing(true);
    try {
      const beforeUrl = getAssetUrl(currentFilePath);
      const resultPath = await removeBackground(currentFilePath);
      const afterUrl = getAssetUrl(resultPath);
      pushOperation({
        type: "ai",
        label: "Remove background",
        imagePath: resultPath,
      });
      setImage(afterUrl, imageInfo);
      setBeforeAfter(beforeUrl, afterUrl);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Background removal failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-medium">AI Tools</h3>

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="rounded-lg border border-(--color-border) p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Background Removal</span>
            {u2net?.installed && (
              <span className="text-xs text-green-500">Ready</span>
            )}
          </div>
          <p className="text-xs text-(--color-text-secondary)">
            Remove image background using U-Net AI model
          </p>

          {!u2net?.installed ? (
            <div className="space-y-2">
              <p className="text-xs text-(--color-text-secondary)">
                Model needs to be downloaded ({u2net ? formatBytes(u2net.sizeBytes) : "~176 MB"})
              </p>
              {downloading === "u2net" && progress ? (
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
                  onClick={() => download("u2net")}
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
                onClick={handleRemoveBackground}
                disabled={isProcessing || !currentFilePath}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                {isProcessing ? "Processing..." : "Remove Background"}
              </button>
              <button
                onClick={() => remove("u2net")}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={12} />
                Delete Model
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
