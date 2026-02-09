import { useAppStore } from "../../stores/useAppStore";
import { X } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageInfo() {
  const imageInfo = useAppStore((s) => s.imageInfo);
  const zoom = useAppStore((s) => s.zoom);
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);

  return (
    <>
      {error && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm shadow-lg">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="hover:bg-red-700 rounded p-0.5"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {imageInfo && (
        <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center gap-4 px-4 py-2 text-xs bg-(--color-bg-secondary)/90 border-t border-(--color-border) text-(--color-text-secondary) select-none backdrop-blur-sm">
          <span className="font-medium text-(--color-text-primary)">
            {imageInfo.fileName}
          </span>
          <span>
            {imageInfo.width} x {imageInfo.height}
          </span>
          <span>{imageInfo.format}</span>
          <span>{formatFileSize(imageInfo.fileSizeBytes)}</span>
          <span className="ml-auto">{Math.round(zoom * 100)}%</span>
        </div>
      )}
    </>
  );
}
