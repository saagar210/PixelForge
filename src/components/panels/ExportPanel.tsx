import { useState } from "react";
import { Save } from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { useAppStore } from "../../stores/useAppStore";
import { saveImage } from "../../lib/tauri";

const FORMATS = [
  { value: "png", label: "PNG", ext: "png" },
  { value: "jpeg", label: "JPEG", ext: "jpg" },
  { value: "webp", label: "WebP", ext: "webp" },
  { value: "bmp", label: "BMP", ext: "bmp" },
  { value: "tiff", label: "TIFF", ext: "tiff" },
  { value: "avif", label: "AVIF", ext: "avif" },
];

export function ExportPanel() {
  const currentFilePath = useAppStore((s) => s.currentFilePath);
  const setError = useAppStore((s) => s.setError);
  const isProcessing = useAppStore((s) => s.isProcessing);
  const setProcessing = useAppStore((s) => s.setProcessing);

  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(85);

  const handleSave = async () => {
    if (!currentFilePath) return;

    const formatInfo = FORMATS.find((f) => f.value === format);
    if (!formatInfo) return;

    try {
      const dest = await save({
        filters: [
          {
            name: formatInfo.label,
            extensions: [formatInfo.ext],
          },
        ],
      });

      if (!dest) return;

      setProcessing(true);
      await saveImage(currentFilePath, dest, format, quality);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const showQuality = format === "jpeg";

  return (
    <div className="p-3 space-y-4">
      <h3 className="text-xs font-medium">Export / Save As</h3>

      <div className="space-y-2">
        <label className="text-xs text-(--color-text-secondary)">Format</label>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="w-full px-2 py-1.5 text-xs rounded bg-(--color-bg-tertiary) border border-(--color-border)"
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {showQuality && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs">Quality</span>
            <span className="text-xs text-(--color-text-secondary)">
              {quality}%
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-(--color-bg-tertiary) accent-(--color-accent)"
          />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!currentFilePath || isProcessing}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
      >
        <Save size={14} />
        Save As
      </button>
    </div>
  );
}
