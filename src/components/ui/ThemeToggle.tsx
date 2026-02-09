import { Sun, Moon, Monitor } from "lucide-react";
import { useAppStore, type ThemeMode } from "../../stores/useAppStore";

const CYCLE: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();

  const next = () => {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <button
      onClick={next}
      className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-(--color-bg-tertiary) transition-colors"
      title={`Theme: ${theme}`}
    >
      <Icon size={18} />
    </button>
  );
}
