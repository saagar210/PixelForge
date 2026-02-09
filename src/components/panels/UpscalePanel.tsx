import { Download, Trash2, ArrowUpRight, Loader2 } from "lucide-react";
import { useModelManager } from "../../hooks/useModelManager";
import { useAppStore } from "../../stores/useAppStore";
import { upscaleImage, getAssetUrl } from "../../lib/tauri";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function UpscalePanel() {
  const { models, downloading, progress, download, remove } =
    useModelManager();
  const currentFilePath = useAppStore((s) => s.currentFilePath);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const setProcessing = useAppStore((s) => s.setProcessing);
  const setError = useAppStore((s) => s.setError);
  const pushOperation = useAppStore((s) => s.pushOperation);
  const setImage = useAppStore((s) => s.setImage);
  const imageInfo = useAppStore((s) => s.imageInfo);
  const setBeforeAfter = useAppStore((s) => s.setBeforeAfter);

  const model = models.find((m) => m.id === "realesrgan-x4");
  const scale = 4;

  const handleUpscale = async () => {
    if (!currentFilePath || !imageInfo) return;
    setProcessing(true);
    try {
      const beforeUrl = getAssetUrl(currentFilePath);
      const resultPath = await upscaleImage(currentFilePath, scale);
      const afterUrl = getAssetUrl(resultPath);
      pushOperation({
        type: "ai",
        label: `Upscale ${scale}x`,
        imagePath: resultPath,
      });
      setImage(afterUrl, {
        ...imageInfo,
        width: imageInfo.width * scale,
        height: imageInfo.height * scale,
      });
      setBeforeAfter(beforeUrl, afterUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upscaling failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ArrowUpRight size={14} />
        <span className="text-xs font-medium">AI Upscaling</span>
        {model?.installed && (
          <span className="text-xs text-green-500 ml-auto">Ready</span>
        )}
      </div>

      <p className="text-xs text-(--color-text-secondary)">
        Upscale image {scale}x using Real-ESRGAN
      </p>

      {imageInfo && (
        <div className="text-xs text-(--color-text-secondary) bg-(--color-bg-tertiary) rounded p-2">
          <div>
            Current: {imageInfo.width} x {imageInfo.height}
          </div>
          <div>
            Output: {imageInfo.width * scale} x {imageInfo.height * scale}
          </div>
        </div>
      )}

      {!model?.installed ? (
        <div className="space-y-2">
          <p className="text-xs text-(--color-text-secondary)">
            Model needs to be downloaded ({model ? formatBytes(model.sizeBytes) : "~67 MB"})
          </p>
          {downloading === "realesrgan-x4" && progress ? (
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
              onClick={() => download("realesrgan-x4")}
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
            onClick={handleUpscale}
            disabled={isProcessing || !currentFilePath}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ArrowUpRight size={12} />
            )}
            {isProcessing ? "Upscaling..." : `Upscale ${scale}x`}
          </button>
          <button
            onClick={() => remove("realesrgan-x4")}
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
