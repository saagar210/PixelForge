import { Crop, Sparkles, Save, ListChecks } from "lucide-react";
import { useAppStore, type SidebarPanel } from "../../stores/useAppStore";

const TOOL_GROUPS = [
  {
    label: "Edit",
    panel: "operations" as SidebarPanel,
    icon: Crop,
    requiresImage: true,
  },
  {
    label: "AI Tools",
    panel: "ai" as SidebarPanel,
    icon: Sparkles,
    requiresImage: true,
  },
  {
    label: "Export",
    panel: "export" as SidebarPanel,
    icon: Save,
    requiresImage: true,
  },
  {
    label: "Batch",
    panel: "batch" as SidebarPanel,
    icon: ListChecks,
    requiresImage: false,
  },
];

function HistoryPanel() {
  const operationHistory = useAppStore((s) => s.operationHistory);
  const undo = useAppStore((s) => s.undo);

  if (operationHistory.length === 0) {
    return (
      <div className="p-3 text-xs text-(--color-text-secondary)">
        No edits yet
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">History</span>
        <button
          onClick={undo}
          className="text-xs px-2 py-1 rounded bg-(--color-bg-tertiary) hover:bg-(--color-accent) hover:text-white transition-colors"
        >
          Undo
        </button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {operationHistory.map((entry, i) => (
          <div
            key={i}
            className="text-xs px-2 py-1 rounded bg-(--color-bg-tertiary) text-(--color-text-secondary)"
          >
            {entry.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const imageInfo = useAppStore((s) => s.imageInfo);
  const activeSidebarPanel = useAppStore((s) => s.activeSidebarPanel);
  const setSidebarPanel = useAppStore((s) => s.setSidebarPanel);

  return (
    <aside className="w-56 border-r border-(--color-border) bg-(--color-bg-secondary) hidden lg:flex flex-col">
      <nav className="p-2 space-y-1">
        {TOOL_GROUPS.map(({ label, panel, icon: Icon, requiresImage }) => {
          const disabled = requiresImage && !imageInfo;
          return (
            <button
              key={panel}
              onClick={() => setSidebarPanel(panel)}
              disabled={disabled}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors ${
                activeSidebarPanel === panel
                  ? "bg-(--color-accent) text-white"
                  : "hover:bg-(--color-bg-tertiary)"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title={disabled ? "Open an image to enable this tool" : undefined}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </nav>

      {!imageInfo ? (
        <div className="p-4 text-xs text-(--color-text-secondary) border-t border-(--color-border)">
          Open an image for edit/AI/export tools. Batch is available now.
        </div>
      ) : (
        <div className="border-t border-(--color-border) mt-2">
          <HistoryPanel />
        </div>
      )}
    </aside>
  );
}
