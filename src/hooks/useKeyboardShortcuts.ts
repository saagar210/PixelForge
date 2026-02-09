import { useEffect } from "react";
import { useAppStore } from "../stores/useAppStore";

export function useKeyboardShortcuts(openFile: () => void) {
  const { zoom, setZoom, resetView } = useAppStore();

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
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openFile, zoom, setZoom, resetView]);
}
