import { Download, Trash2, Eraser, Loader2, PaintBucket, X } from "lucide-react";
import { useModelManager } from "../../hooks/useModelManager";
import { useAppStore } from "../../stores/useAppStore";
import { applyInpainting, getAssetUrl } from "../../lib/tauri";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

interface InpaintPanelProps {
  getMaskData: (() => Uint8Array) | null;
  clearMask: (() => void) | null;
}

export function InpaintPanel({ getMaskData, clearMask }: InpaintPanelProps) {
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
  const inpaintMode = useAppStore((s) => s.inpaintMode);
  const setInpaintMode = useAppStore((s) => s.setInpaintMode);
  const brushSize = useAppStore((s) => s.brushSize);
  const setBrushSize = useAppStore((s) => s.setBrushSize);

  const model = models.find((m) => m.id === "lama");

  const handleApply = async () => {
    if (!currentFilePath || !imageInfo || !getMaskData) return;
    setProcessing(true);
    try {
      const beforeUrl = getAssetUrl(currentFilePath);
      const maskData = getMaskData();
      const resultPath = await applyInpainting(
        currentFilePath,
        Array.from(maskData),
        imageInfo.width,
        imageInfo.height,
      );
      const afterUrl = getAssetUrl(resultPath);
      pushOperation({
        type: "ai",
        label: "Inpainting",
        imagePath: resultPath,
      });
      setImage(afterUrl, imageInfo);
      setBeforeAfter(beforeUrl, afterUrl);
      setInpaintMode(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Inpainting failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setInpaintMode(false);
    clearMask?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PaintBucket size={14} />
        <span className="text-xs font-medium">Inpainting</span>
        {model?.installed && (
          <span className="text-xs text-green-500 ml-auto">Ready</span>
        )}
      </div>

      <p className="text-xs text-(--color-text-secondary)">
        Paint over areas to remove objects. Use [ ] keys to resize brush.
      </p>

      {!model?.installed ? (
        <div className="space-y-2">
          <p className="text-xs text-(--color-text-secondary)">
            Model needs to be downloaded ({model ? formatBytes(model.sizeBytes) : "~208 MB"})
          </p>
          {downloading === "lama" && progress ? (
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
              onClick={() => download("lama")}
              disabled={downloading !== null}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
            >
              <Download size={12} />
              Download Model
            </button>
          )}
        </div>
      ) : inpaintMode ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-xs text-(--color-text-secondary)">
                Brush Size
              </label>
              <span className="text-xs text-(--color-text-secondary)">
                {brushSize}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={200}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none bg-(--color-bg-tertiary) accent-(--color-accent)"
            />
          </div>

          <button
            onClick={() => clearMask?.()}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-bg-tertiary) transition-colors"
          >
            <Eraser size={12} />
            Clear Mask
          </button>

          <button
            onClick={handleApply}
            disabled={isProcessing || !currentFilePath}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <PaintBucket size={12} />
            )}
            {isProcessing ? "Processing..." : "Apply Inpainting"}
          </button>

          <button
            onClick={handleCancel}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <X size={12} />
            Cancel
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setInpaintMode(true)}
            disabled={!currentFilePath}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
          >
            <PaintBucket size={12} />
            Enter Brush Mode
          </button>
          <button
            onClick={() => remove("lama")}
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
