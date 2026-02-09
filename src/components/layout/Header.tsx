import { FolderOpen, Undo2, Save } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useAppStore } from "../../stores/useAppStore";

interface HeaderProps {
  onOpenFile: () => void;
}

export function Header({ onOpenFile }: HeaderProps) {
  const operationHistory = useAppStore((s) => s.operationHistory);
  const undo = useAppStore((s) => s.undo);
  const setSidebarPanel = useAppStore((s) => s.setSidebarPanel);
  const imageInfo = useAppStore((s) => s.imageInfo);

  return (
    <header
      className="flex items-center justify-between h-12 px-4 border-b border-(--color-border) bg-(--color-bg-secondary) select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold tracking-tight">PixelForge</h1>
        <button
          onClick={onOpenFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors"
          title="Open image (Cmd+O)"
        >
          <FolderOpen size={14} />
          Open
        </button>
        {imageInfo && (
          <>
            <button
              onClick={undo}
              disabled={operationHistory.length === 0}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md hover:bg-(--color-bg-tertiary) transition-colors disabled:opacity-30"
              title="Undo (Cmd+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={() => setSidebarPanel("export")}
              className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md hover:bg-(--color-bg-tertiary) transition-colors"
              title="Save As (Cmd+S)"
            >
              <Save size={14} />
            </button>
          </>
        )}
      </div>
      <ThemeToggle />
    </header>
  );
}
