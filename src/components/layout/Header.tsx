import { FolderOpen } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";

interface HeaderProps {
  onOpenFile: () => void;
}

export function Header({ onOpenFile }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-(--color-border) bg-(--color-bg-secondary) select-none"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight">PixelForge</h1>
        <button
          onClick={onOpenFile}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-(--color-accent) text-white hover:bg-(--color-accent-hover) transition-colors"
          title="Open image (Cmd+O)"
        >
          <FolderOpen size={14} />
          Open
        </button>
      </div>
      <ThemeToggle />
    </header>
  );
}
