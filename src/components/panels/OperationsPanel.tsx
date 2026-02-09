import { useState } from "react";
import { RotateCw, RotateCcw, FlipHorizontal, FlipVertical } from "lucide-react";
import { useOperations } from "../../hooks/useOperations";
import { useAppStore } from "../../stores/useAppStore";

function SliderControl({
  label,
  value,
  onChange,
  onApply,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onApply: () => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs">{label}</span>
        <span className="text-xs text-(--color-text-secondary)">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-(--color-bg-tertiary) accent-(--color-accent)"
      />
      <button
        onClick={onApply}
        className="w-full mt-1 px-2 py-1 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors"
      >
        Apply
      </button>
    </div>
  );
}

function RotateFlipSection() {
  const ops = useOperations();
  const isProcessing = useAppStore((s) => s.isProcessing);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium">Rotate & Flip</h3>
      <div className="grid grid-cols-2 gap-1">
        <button
          disabled={isProcessing}
          onClick={() => ops.rotate(90)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCw size={12} /> 90
        </button>
        <button
          disabled={isProcessing}
          onClick={() => ops.rotate(270)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors disabled:opacity-50"
        >
          <RotateCcw size={12} /> -90
        </button>
        <button
          disabled={isProcessing}
          onClick={() => ops.flip("horizontal")}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors disabled:opacity-50"
        >
          <FlipHorizontal size={12} /> H
        </button>
        <button
          disabled={isProcessing}
          onClick={() => ops.flip("vertical")}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors disabled:opacity-50"
        >
          <FlipVertical size={12} /> V
        </button>
      </div>
    </div>
  );
}

function ResizeSection() {
  const imageInfo = useAppStore((s) => s.imageInfo);
  const ops = useOperations();

  const [width, setWidth] = useState(imageInfo?.width ?? 100);
  const [height, setHeight] = useState(imageInfo?.height ?? 100);
  const [filter, setFilter] = useState("lanczos");

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium">Resize</h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-(--color-text-secondary)">W</label>
          <input
            type="number"
            min={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full px-2 py-1 text-xs rounded bg-(--color-bg-tertiary) border border-(--color-border)"
          />
        </div>
        <div>
          <label className="text-xs text-(--color-text-secondary)">H</label>
          <input
            type="number"
            min={1}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full px-2 py-1 text-xs rounded bg-(--color-bg-tertiary) border border-(--color-border)"
          />
        </div>
      </div>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-2 py-1 text-xs rounded bg-(--color-bg-tertiary) border border-(--color-border)"
      >
        <option value="lanczos">Lanczos (best)</option>
        <option value="bilinear">Bilinear (fast)</option>
        <option value="nearest">Nearest (pixel art)</option>
      </select>
      <button
        onClick={() => ops.resize(width, height, filter)}
        className="w-full px-2 py-1 text-xs rounded bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors disabled:opacity-50"
      >
        Resize
      </button>
    </div>
  );
}

function AdjustmentsSection() {
  const ops = useOperations();

  const [brightnessVal, setBrightnessVal] = useState(0);
  const [contrastVal, setContrastVal] = useState(0);
  const [hueVal, setHueVal] = useState(0);
  const [satVal, setSatVal] = useState(0);
  const [lightVal, setLightVal] = useState(0);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium">Adjustments</h3>
      <SliderControl
        label="Brightness"
        value={brightnessVal}
        onChange={setBrightnessVal}
        onApply={() => { ops.brightness(brightnessVal); setBrightnessVal(0); }}
        min={-100}
        max={100}
      />
      <SliderControl
        label="Contrast"
        value={contrastVal}
        onChange={setContrastVal}
        onApply={() => { ops.contrast(contrastVal); setContrastVal(0); }}
        min={-100}
        max={100}
      />
      <SliderControl
        label="Hue"
        value={hueVal}
        onChange={setHueVal}
        onApply={() => { ops.hue(hueVal); setHueVal(0); }}
        min={-180}
        max={180}
        unit="deg"
      />
      <SliderControl
        label="Saturation"
        value={satVal}
        onChange={setSatVal}
        onApply={() => { ops.saturation(satVal); setSatVal(0); }}
        min={-100}
        max={100}
      />
      <SliderControl
        label="Lightness"
        value={lightVal}
        onChange={setLightVal}
        onApply={() => { ops.lightness(lightVal); setLightVal(0); }}
        min={-50}
        max={50}
      />
    </div>
  );
}

function BlurSharpenSection() {
  const ops = useOperations();

  const [blurSigma, setBlurSigma] = useState(2.0);
  const [sharpenSigma, setSharpenSigma] = useState(1.5);
  const [sharpenThreshold] = useState(10);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium">Blur & Sharpen</h3>
      <SliderControl
        label="Blur"
        value={blurSigma}
        onChange={setBlurSigma}
        onApply={() => ops.blur(blurSigma)}
        min={0.5}
        max={20}
        step={0.5}
      />
      <div className="space-y-1">
        <SliderControl
          label="Sharpen"
          value={sharpenSigma}
          onChange={setSharpenSigma}
          onApply={() => ops.sharpen(sharpenSigma, sharpenThreshold)}
          min={0.5}
          max={10}
          step={0.5}
        />
      </div>
    </div>
  );
}

export function OperationsPanel() {
  return (
    <div className="p-3 space-y-4 overflow-y-auto max-h-full">
      <RotateFlipSection />
      <div className="border-t border-(--color-border)" />
      <ResizeSection />
      <div className="border-t border-(--color-border)" />
      <AdjustmentsSection />
      <div className="border-t border-(--color-border)" />
      <BlurSharpenSection />
    </div>
  );
}
