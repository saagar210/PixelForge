import { useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";

export function useKeyboardShortcuts(
  openFile: () => void,
  onSave?: () => void,
) {
  const { zoom, setZoom, resetView, undo, inpaintMode, brushSize, setBrushSize } = useAppStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "o") {
        e.preventDefault();
        openFile();
      } else if (mod && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        setZoom(zoom * 1.25);
      } else if (mod && e.key === "-") {
        e.preventDefault();
        setZoom(zoom / 1.25);
      } else if (mod && e.key === "0") {
        e.preventDefault();
        resetView();
      } else if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && e.key === "s") {
        e.preventDefault();
        onSave?.();
      } else if (e.key === "[" && inpaintMode) {
        e.preventDefault();
        setBrushSize(brushSize - 10);
      } else if (e.key === "]" && inpaintMode) {
        e.preventDefault();
        setBrushSize(brushSize + 10);
      } else if (e.key === "Escape") {
        if (inpaintMode) {
          useAppStore.getState().setInpaintMode(false);
        }
        useAppStore.getState().setSidebarPanel(null);
        useAppStore.getState().clearBeforeAfter();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFile, onSave, zoom, setZoom, resetView, undo, inpaintMode, brushSize, setBrushSize]);
}
