import { Crop, Sparkles, Save } from "lucide-react";
import { useAppStore, type SidebarPanel } from "../../stores/useAppStore";

const TOOL_GROUPS = [
  {
    label: "Edit",
    panel: "operations" as SidebarPanel,
    icon: Crop,
  },
  {
    label: "AI Tools",
    panel: "ai" as SidebarPanel,
    icon: Sparkles,
  },
  {
    label: "Export",
    panel: "export" as SidebarPanel,
    icon: Save,
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
      {!imageInfo ? (
        <div className="p-4 text-xs text-(--color-text-secondary)">
          Open an image to get started
        </div>
      ) : (
        <>
          <nav className="p-2 space-y-1">
            {TOOL_GROUPS.map(({ label, panel, icon: Icon }) => (
              <button
                key={panel}
                onClick={() => setSidebarPanel(panel)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors ${
                  activeSidebarPanel === panel
                    ? "bg-(--color-accent) text-white"
                    : "hover:bg-(--color-bg-tertiary)"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          <div className="border-t border-(--color-border) mt-2">
            <HistoryPanel />
          </div>
        </>
      )}
    </aside>
  );
}
