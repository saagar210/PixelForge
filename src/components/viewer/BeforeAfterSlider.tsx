import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";

export function BeforeAfterSlider() {
  const beforeImageUrl = useAppStore((s) => s.beforeImageUrl);
  const afterImageUrl = useAppStore((s) => s.afterImageUrl);
  const showBeforeAfter = useAppStore((s) => s.showBeforeAfter);
  const clearBeforeAfter = useAppStore((s) => s.clearBeforeAfter);

  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (isDragging.current) {
        handleMove(e.clientX);
      }
    }
    function handleMouseUp() {
      isDragging.current = false;
    }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMove]);

  if (!showBeforeAfter || !beforeImageUrl || !afterImageUrl) return null;

  return (
    <div className="absolute inset-0 z-50 bg-(--color-bg-primary)">
      <button
        onClick={clearBeforeAfter}
        className="absolute top-3 right-3 z-60 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="absolute top-3 left-3 z-60 flex gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-black/50 text-white">Before</span>
        <span className="px-2 py-1 rounded bg-black/50 text-white">After</span>
      </div>

      <div
        ref={containerRef}
        className="w-full h-full relative cursor-col-resize select-none overflow-hidden"
        onMouseDown={handleMouseDown}
      >
        {/* After image (full background) */}
        <img
          src={afterImageUrl}
          alt="After"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${position}%` }}
        >
          <img
            src={beforeImageUrl}
            alt="Before"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ width: `${containerRef.current?.offsetWidth ?? 0}px` }}
            draggable={false}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
            <div className="w-4 h-0.5 bg-gray-400 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
