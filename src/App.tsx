import { MainLayout } from "./components/layout/MainLayout";
import { ImageCanvas } from "./components/viewer/ImageCanvas";
import { ImageInfo } from "./components/viewer/ImageInfo";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { useImageLoader } from "./hooks/useImageLoader";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function App() {
  const { openFileDialog } = useImageLoader();

  useKeyboardShortcuts(openFileDialog);

  return (
    <MainLayout onOpenFile={openFileDialog}>
      <ImageCanvas />
      <ImageInfo />
      <LoadingOverlay />
    </MainLayout>
  );
}

export default App;
