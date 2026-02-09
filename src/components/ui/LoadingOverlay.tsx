import { Loader2 } from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";

export function LoadingOverlay() {
  const isLoading = useAppStore((s) => s.isLoading);

  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex items-center gap-3 rounded-lg bg-(--color-bg-secondary) px-6 py-4 shadow-lg">
        <Loader2 size={24} className="animate-spin text-(--color-accent)" />
        <span className="text-(--color-text-primary) text-sm font-medium">
          Loading image...
        </span>
      </div>
    </div>
  );
}
