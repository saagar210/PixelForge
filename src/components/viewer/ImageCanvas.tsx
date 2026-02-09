import { useRef, useEffect, useCallback, useState } from "react";
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

export interface ImageCanvasHandle {
  getMaskData: () => Uint8Array;
  clearMask: () => void;
}

interface ImageCanvasProps {
  onMaskReady?: (handle: ImageCanvasHandle) => void;
}

export function ImageCanvas({ onMaskReady }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const isPainting = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Use refs for mutable state to avoid stale closures in event handlers
  const zoomRef = useRef(1);
  const panXRef = useRef(0);
  const panYRef = useRef(0);

  const { imageUrl, zoom, panX, panY, setZoom, setPan, inpaintMode, imageInfo } = useAppStore();

  // Sync store → refs
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  // Get image draw coordinates for both rendering and brush painting
  const getDrawCoords = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || img.naturalWidth === 0) return null;

    const rect = container.getBoundingClientRect();
    const z = zoomRef.current;
    const drawW = img.naturalWidth * z;
    const drawH = img.naturalHeight * z;
    const drawX = (rect.width - drawW) / 2 + panXRef.current;
    const drawY = (rect.height - drawH) / 2 + panYRef.current;

    return { rect, drawX, drawY, drawW, drawH };
  }, []);

  // Convert screen coordinates to image pixel coordinates
  const screenToImage = useCallback((screenX: number, screenY: number): [number, number] | null => {
    const coords = getDrawCoords();
    if (!coords) return null;
    const x = (screenX - coords.rect.left - coords.drawX) / zoomRef.current;
    const y = (screenY - coords.rect.top - coords.drawY) / zoomRef.current;
    return [x, y];
  }, [getDrawCoords]);

  // Initialize/cleanup mask canvas when inpaint mode changes
  useEffect(() => {
    if (inpaintMode && imageInfo) {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = imageInfo.width;
      maskCanvas.height = imageInfo.height;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
      maskCanvasRef.current = maskCanvas;
    } else {
      maskCanvasRef.current = null;
    }
  }, [inpaintMode, imageInfo]);

  // Expose mask functions to parent
  useEffect(() => {
    if (!onMaskReady) return;

    const handle: ImageCanvasHandle = {
      getMaskData: () => {
        const mask = maskCanvasRef.current;
        if (!mask || !imageInfo) return new Uint8Array(0);
        const ctx = mask.getContext("2d");
        if (!ctx) return new Uint8Array(0);
        const imageData = ctx.getImageData(0, 0, imageInfo.width, imageInfo.height);
        const grayscale = new Uint8Array(imageInfo.width * imageInfo.height);
        for (let i = 0; i < grayscale.length; i++) {
          grayscale[i] = imageData.data[i * 4]; // R channel
        }
        return grayscale;
      },
      clearMask: () => {
        const mask = maskCanvasRef.current;
        if (!mask) return;
        const ctx = mask.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, mask.width, mask.height);
        draw();
      },
    };

    onMaskReady(handle);
  }, [onMaskReady, imageInfo]);

  const drawBrushStroke = useCallback((imgX: number, imgY: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    const { brushSize: bs } = useAppStore.getState();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(imgX, imgY, bs / 2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

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

    // Draw mask overlay in inpaint mode
    const { inpaintMode: isInpaint } = useAppStore.getState();
    const mask = maskCanvasRef.current;
    if (isInpaint && mask) {
      // Create red-tinted mask overlay
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = mask.width;
      tempCanvas.height = mask.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.drawImage(mask, 0, 0);
        tempCtx.globalCompositeOperation = "source-in";
        tempCtx.fillStyle = "rgba(255, 0, 0, 1)";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      }
    }

    // Draw brush cursor in inpaint mode
    if (isInpaint && cursorPos) {
      const { brushSize: bs } = useAppStore.getState();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const screenRadius = (bs / 2) * zoomRef.current;
      ctx.arc(cursorPos.x, cursorPos.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "black";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [cursorPos]);

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

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    const { inpaintMode: isInpaint } = useAppStore.getState();
    if (isInpaint) {
      isPainting.current = true;
      const imgCoords = screenToImage(e.clientX, e.clientY);
      if (imgCoords) {
        drawBrushStroke(imgCoords[0], imgCoords[1]);
        draw();
      }
    } else {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, [screenToImage, drawBrushStroke, draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { inpaintMode: isInpaint } = useAppStore.getState();

      if (isInpaint) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
        if (isPainting.current) {
          const imgCoords = screenToImage(e.clientX, e.clientY);
          if (imgCoords) {
            drawBrushStroke(imgCoords[0], imgCoords[1]);
            draw();
          }
        }
      } else if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        setPan(panXRef.current + dx, panYRef.current + dy);
      }
    },
    [setPan, screenToImage, drawBrushStroke, draw],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isPainting.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    isPainting.current = false;
    setCursorPos(null);
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
      className={`absolute inset-0 ${
        inpaintMode
          ? "cursor-crosshair"
          : "cursor-grab active:cursor-grabbing"
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
