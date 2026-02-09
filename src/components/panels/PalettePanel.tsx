import { useState } from "react";
import { Palette, Loader2, Copy } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";
import { extractPalette } from "../../lib/tauri";
import type { PaletteColor } from "../../types/image";

const COLOR_COUNT_OPTIONS = [5, 8, 12] as const;

export function PalettePanel() {
  const currentFilePath = useAppStore((s) => s.currentFilePath);
  const [numColors, setNumColors] = useState<number>(8);
  const [colors, setColors] = useState<PaletteColor[] | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!currentFilePath) return;
    setIsExtracting(true);
    setError(null);
    try {
      const result = await extractPalette(currentFilePath, numColors);
      setColors(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Palette extraction failed";
      setError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopy = async () => {
    if (!colors) return;
    const text = colors.map((c) => c.hex).join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Palette size={14} />
        <span className="text-xs font-medium">Color Palette</span>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-(--color-text-secondary)">
          Number of colors
        </label>
        <div className="flex gap-1">
          {COLOR_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setNumColors(n)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                numColors === n
                  ? "bg-(--color-accent) text-white"
                  : "bg-(--color-bg-tertiary) text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleExtract}
        disabled={isExtracting || !currentFilePath}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
      >
        {isExtracting ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Palette size={12} />
        )}
        {isExtracting ? "Extracting..." : "Extract Palette"}
      </button>

      {error && (
        <div className="text-xs text-red-500 bg-red-500/10 rounded p-2">
          {error}
        </div>
      )}

      {colors && (
        <div className="space-y-2">
          <div className="space-y-1">
            {colors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-(--color-border)"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-mono text-(--color-text-primary)">
                  {color.hex}
                </span>
                <span className="text-xs text-(--color-text-secondary) ml-auto">
                  {color.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-bg-tertiary) transition-colors"
          >
            <Copy size={12} />
            Copy Hex Codes
          </button>
        </div>
      )}
    </div>
  );
}
