import { useState } from "react";
import { Download, Trash2, Paintbrush, Loader2 } from "lucide-react";
import { useModelManager } from "../../hooks/useModelManager";
import { useAppStore } from "../../stores/useAppStore";
import { applyStyleTransfer, getAssetUrl } from "../../lib/tauri";

const STYLES = [
  { id: "style-mosaic", name: "Mosaic" },
  { id: "style-candy", name: "Candy" },
  { id: "style-rain-princess", name: "Rain Princess" },
  { id: "style-udnie", name: "Udnie" },
  { id: "style-pointilism", name: "Pointilism" },
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function StyleTransferPanel() {
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

  const [selectedStyle, setSelectedStyle] = useState<string>("style-mosaic");
  const [strength, setStrength] = useState(100);

  const handleApply = async () => {
    if (!currentFilePath || !imageInfo) return;
    setProcessing(true);
    try {
      const beforeUrl = getAssetUrl(currentFilePath);
      const resultPath = await applyStyleTransfer(
        currentFilePath,
        selectedStyle,
        strength / 100,
      );
      const afterUrl = getAssetUrl(resultPath);
      const styleName =
        STYLES.find((s) => s.id === selectedStyle)?.name ?? selectedStyle;
      pushOperation({
        type: "ai",
        label: `Style: ${styleName}`,
        imagePath: resultPath,
      });
      setImage(afterUrl, imageInfo);
      setBeforeAfter(beforeUrl, afterUrl);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Style transfer failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Paintbrush size={14} />
        <span className="text-xs font-medium">Style Transfer</span>
      </div>

      <div className="space-y-2">
        {STYLES.map((style) => {
          const model = models.find((m) => m.id === style.id);
          const isDownloading = downloading === style.id;

          return (
            <div
              key={style.id}
              className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                selectedStyle === style.id
                  ? "border-(--color-accent) bg-(--color-accent)/5"
                  : "border-(--color-border) hover:border-(--color-text-secondary)"
              }`}
              onClick={() => setSelectedStyle(style.id)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{style.name}</span>
                {model?.installed ? (
                  <span className="text-xs text-green-500">Ready</span>
                ) : isDownloading && progress ? (
                  <span className="text-xs text-(--color-text-secondary)">
                    {progress.percent}%
                  </span>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      download(style.id);
                    }}
                    disabled={downloading !== null}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
                  >
                    <Download size={10} />
                    {model ? formatBytes(model.sizeBytes) : "~7 MB"}
                  </button>
                )}
              </div>
              {isDownloading && progress && (
                <div className="mt-1 w-full h-1 rounded-full bg-(--color-bg-tertiary)">
                  <div
                    className="h-full rounded-full bg-(--color-accent) transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <label className="text-xs text-(--color-text-secondary)">
            Strength
          </label>
          <span className="text-xs text-(--color-text-secondary)">
            {strength}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={strength}
          onChange={(e) => setStrength(Number(e.target.value))}
          className="w-full h-1 rounded-full appearance-none bg-(--color-bg-tertiary) accent-(--color-accent)"
        />
      </div>

      <button
        onClick={handleApply}
        disabled={
          isProcessing ||
          !currentFilePath ||
          !models.find((m) => m.id === selectedStyle)?.installed
        }
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Paintbrush size={12} />
        )}
        {isProcessing ? "Applying..." : "Apply Style"}
      </button>

      {models.find((m) => m.id === selectedStyle)?.installed && (
        <button
          onClick={() => remove(selectedStyle)}
          className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-red-500 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={12} />
          Delete Model
        </button>
      )}
    </div>
  );
}
