import { useRef, useEffect, useCallback } from "react";
import { useAppStore } from "../../stores/useAppStore";

const CHECKERBOARD_SIZE = 16;

function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#cccccc";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < h; y += CHECKERBOARD_SIZE) {
    for (let x = 0; x < w; x += CHECKERBOARD_SIZE) {
      if ((Math.floor(x / CHECKERBOARD_SIZE) + Math.floor(y / CHECKERBOARD_SIZE)) % 2 === 0) {
        ctx.fillRect(x, y, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
      }
    }
  }
}

export function ImageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Use refs for mutable state to avoid stale closures in event handlers
  const zoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  const { imageUrl, zoom, panX, panY, setZoom, setPan } = useAppStore();

  // Sync store → refs
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Clear with background
    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#0f172a" : "#f1f5f9";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const img = imgRef.current;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const z = zoomRef.current;
    const px = panXRef.current;
    const py = panYRef.current;

    const drawW = img.naturalWidth * z;
    const drawH = img.naturalHeight * z;
    const drawX = (rect.width - drawW) / 2 + px;
    const drawY = (rect.height - drawH) / 2 + py;

    // Draw checkerboard behind image area
    ctx.save();
    ctx.beginPath();
    ctx.rect(drawX, drawY, drawW, drawH);
    ctx.clip();
    drawCheckerboard(ctx, rect.width, rect.height);
    ctx.restore();

    // Draw image
    ctx.imageSmoothingEnabled = z < 1;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // Fit image to viewport
  const fitToView = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || img.naturalWidth === 0) return;

    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / img.naturalWidth;
    const scaleY = rect.height / img.naturalHeight;
    const fitZoom = Math.min(scaleX, scaleY, 1); // don't upscale past 100%

    setZoom(fitZoom);
    setPan(0, 0);
  }, [setZoom, setPan]);

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) {
      imgRef.current = null;
      draw();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      fitToView();
    };
    img.onerror = () => {
      useAppStore.getState().setError("Failed to decode image");
    };
    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, fitToView, draw]);

  // Redraw when zoom/pan changes
  useEffect(() => {
    draw();
  }, [zoom, panX, panY, draw]);

  // Wheel zoom (non-passive)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = container!.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const oldZoom = zoomRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(20, Math.max(0.1, oldZoom * factor));

      // Cursor-centered zoom
      const cx = rect.width / 2 + panXRef.current;
      const cy = rect.height / 2 + panYRef.current;
      const imgX = cursorX - cx;
      const imgY = cursorY - cy;

      const ratio = newZoom / oldZoom;
      const newPanX = panXRef.current - imgX * (ratio - 1);
      const newPanY = panYRef.current - imgY * (ratio - 1);

      setZoom(newZoom);
      setPan(newPanX, newPanY);
    }

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [setZoom, setPan]);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan(panXRef.current + dx, panYRef.current + dy);
    },
    [setPan],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Double-click to reset view
  const handleDoubleClick = useCallback(() => {
    fitToView();
  }, [fitToView]);

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
