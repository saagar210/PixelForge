import { useCallback, useRef } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { ImageCanvas } from "./components/viewer/ImageCanvas";
import type { ImageCanvasHandle } from "./components/viewer/ImageCanvas";
import { ImageInfo } from "./components/viewer/ImageInfo";
import { BeforeAfterSlider } from "./components/viewer/BeforeAfterSlider";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { OperationsPanel } from "./components/panels/OperationsPanel";
import { AiPanel } from "./components/panels/AiPanel";
import { ExportPanel } from "./components/panels/ExportPanel";
import { useImageLoader } from "./hooks/useImageLoader";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppStore } from "./stores/useAppStore";

function App() {
  const { openFileDialog } = useImageLoader();
  const activeSidebarPanel = useAppStore((s) => s.activeSidebarPanel);
  const setSidebarPanel = useAppStore((s) => s.setSidebarPanel);
  const maskHandleRef = useRef<ImageCanvasHandle | null>(null);

  useKeyboardShortcuts(openFileDialog, () => setSidebarPanel("export"));

  const handleMaskReady = useCallback((handle: ImageCanvasHandle) => {
    maskHandleRef.current = handle;
  }, []);

  const getMaskData = useCallback(() => {
    return maskHandleRef.current?.getMaskData() ?? new Uint8Array(0);
  }, []);

  const clearMask = useCallback(() => {
    maskHandleRef.current?.clearMask();
  }, []);

  function ActivePanel() {
    if (activeSidebarPanel === "operations") return <OperationsPanel />;
    if (activeSidebarPanel === "ai")
      return <AiPanel getMaskData={getMaskData} clearMask={clearMask} />;
    if (activeSidebarPanel === "export") return <ExportPanel />;
    return null;
  }

  return (
    <MainLayout onOpenFile={openFileDialog}>
      <div className="flex h-full">
        {activeSidebarPanel && (
          <div className="w-60 border-r border-(--color-border) bg-(--color-bg-secondary) overflow-y-auto flex-shrink-0">
            <ActivePanel />
          </div>
        )}
        <div className="flex-1 relative overflow-hidden">
          <ImageCanvas onMaskReady={handleMaskReady} />
          <ImageInfo />
          <BeforeAfterSlider />
          <LoadingOverlay />
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
