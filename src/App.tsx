import { MainLayout } from "./components/layout/MainLayout";
import { ImageCanvas } from "./components/viewer/ImageCanvas";
import { ImageInfo } from "./components/viewer/ImageInfo";
import { BeforeAfterSlider } from "./components/viewer/BeforeAfterSlider";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { OperationsPanel } from "./components/panels/OperationsPanel";
import { AiPanel } from "./components/panels/AiPanel";
import { ExportPanel } from "./components/panels/ExportPanel";
import { useImageLoader } from "./hooks/useImageLoader";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useAppStore } from "./stores/useAppStore";

function ActivePanel() {
  const panel = useAppStore((s) => s.activeSidebarPanel);
  if (panel === "operations") return <OperationsPanel />;
  if (panel === "ai") return <AiPanel />;
  if (panel === "export") return <ExportPanel />;
  return null;
}

function App() {
  const { openFileDialog } = useImageLoader();
  const activeSidebarPanel = useAppStore((s) => s.activeSidebarPanel);
  const setSidebarPanel = useAppStore((s) => s.setSidebarPanel);

  useKeyboardShortcuts(openFileDialog, () => setSidebarPanel("export"));

  return (
    <MainLayout onOpenFile={openFileDialog}>
      <div className="flex h-full">
        {activeSidebarPanel && (
          <div className="w-60 border-r border-(--color-border) bg-(--color-bg-secondary) overflow-y-auto flex-shrink-0">
            <ActivePanel />
          </div>
        )}
        <div className="flex-1 relative overflow-hidden">
          <ImageCanvas />
          <ImageInfo />
          <BeforeAfterSlider />
          <LoadingOverlay />
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
