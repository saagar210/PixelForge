import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { FolderOpen, FolderOutput, Play, Loader2 } from "lucide-react";
import { runBatchResizeExport } from "../../lib/tauri";
import type { BatchProgress, BatchResult } from "../../types/image";

const FORMATS = ["png", "jpeg", "webp", "bmp", "tiff", "avif"] as const;
const FILTERS = ["lanczos", "bilinear", "nearest"] as const;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "bmp", "tiff", "tif"];

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}

export function BatchPanel() {
  const [inputPaths, setInputPaths] = useState<string[]>([]);
  const [outputDir, setOutputDir] = useState<string>("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("png");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("lanczos");
  const [quality, setQuality] = useState(90);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unlistenProgress = listen<BatchProgress>("batch-progress", (event) => {
      setProgress(event.payload);
    });

    const unlistenComplete = listen<BatchResult>("batch-complete", (event) => {
      setResult(event.payload);
      setRunning(false);
      setProgress(null);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
    };
  }, []);

  const currentFileName = useMemo(() => {
    if (!progress?.file) return "";
    return progress.file.split(/[\\/]/).pop() ?? progress.file;
  }, [progress]);

  const chooseInputs = async () => {
    setError(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
      });

      if (!selected) return;
      setInputPaths(Array.isArray(selected) ? selected : [selected]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to select input images"));
    }
  };

  const chooseOutputDir = async () => {
    setError(null);
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setOutputDir(selected);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to select output folder"));
    }
  };

  const runBatch = async () => {
    setError(null);
    setResult(null);
    setProgress(null);
    setRunning(true);

    try {
      const res = await runBatchResizeExport({
        inputPaths,
        outputDir,
        width,
        height,
        filter,
        format,
        quality,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Batch run failed"));
    } finally {
      setRunning(false);
    }
  };

  const disabled = running || inputPaths.length === 0 || !outputDir;

  return (
    <div className="p-3 space-y-3 text-xs">
      <h3 className="font-medium">Batch Resize + Export</h3>

      <button
        onClick={chooseInputs}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors"
      >
        <FolderOpen size={12} />
        Select Input Images ({inputPaths.length})
      </button>

      {inputPaths.length > 0 && (
        <div className="text-(--color-text-secondary)">
          First file: {inputPaths[0].split(/[\\/]/).pop()}
        </div>
      )}

      <button
        onClick={chooseOutputDir}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors"
      >
        <FolderOutput size={12} />
        {outputDir ? "Change Output Folder" : "Select Output Folder"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          value={width}
          onChange={(e) => setWidth(Math.max(1, Number(e.target.value) || 1))}
          className="px-2 py-1 rounded bg-(--color-bg-tertiary) border border-(--color-border)"
          aria-label="Batch width"
        />
        <input
          type="number"
          min={1}
          value={height}
          onChange={(e) => setHeight(Math.max(1, Number(e.target.value) || 1))}
          className="px-2 py-1 rounded bg-(--color-bg-tertiary) border border-(--color-border)"
          aria-label="Batch height"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof FILTERS)[number])}
          className="px-2 py-1 rounded bg-(--color-bg-tertiary) border border-(--color-border)"
        >
          {FILTERS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as (typeof FORMATS)[number])}
          className="px-2 py-1 rounded bg-(--color-bg-tertiary) border border-(--color-border)"
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {format === "jpeg" && (
        <div className="space-y-1">
          <div className="flex justify-between text-(--color-text-secondary)">
            <span>JPEG quality</span>
            <span>{quality}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      <button
        onClick={runBatch}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) disabled:opacity-50"
      >
        {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        {running ? "Processing..." : "Run Batch"}
      </button>

      {progress && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-(--color-bg-tertiary)">
            <div
              className="h-full rounded-full bg-(--color-accent)"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="text-(--color-text-secondary)">
            {progress.current}/{progress.total} — {currentFileName}
          </div>
        </div>
      )}

      {error && <div className="text-red-500 bg-red-500/10 rounded p-2">{error}</div>}

      {result && (
        <div className="rounded border border-(--color-border) p-2 space-y-1">
          <div>Total: {result.total}</div>
          <div>Processed: {result.processed}</div>
          <div>Failed: {result.failed}</div>
          <div>Output files: {result.outputs.length}</div>
          {result.errors.length > 0 && (
            <div className="text-red-500 space-y-1 mt-1">
              {result.errors.slice(0, 3).map((entry, idx) => (
                <div key={idx}>{entry}</div>
              ))}
              {result.errors.length > 3 && (
                <div>...and {result.errors.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
