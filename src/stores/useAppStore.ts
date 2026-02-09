import { create } from "zustand";
import type { ImageInfo } from "../types/image";

export type ThemeMode = "light" | "dark" | "system";

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;

interface AppState {
  // Image
  imageUrl: string | null;
  imageInfo: ImageInfo | null;
  isLoading: boolean;
  error: string | null;

  // Viewport
  zoom: number;
  panX: number;
  panY: number;

  // Theme
  theme: ThemeMode;

  // Actions
  setImage: (url: string, info: ImageInfo) => void;
  clearImage: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  setTheme: (theme: ThemeMode) => void;
}

function applyThemeClass(theme: ThemeMode) {
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const useAppStore = create<AppState>((set) => ({
  imageUrl: null,
  imageInfo: null,
  isLoading: false,
  error: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  theme: (localStorage.getItem("pixelforge-theme") as ThemeMode) || "system",

  setImage: (url, info) =>
    set({ imageUrl: url, imageInfo: info, error: null }),

  clearImage: () =>
    set({ imageUrl: null, imageInfo: null, zoom: 1, panX: 0, panY: 0 }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  setZoom: (zoom) =>
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setTheme: (theme) => {
    localStorage.setItem("pixelforge-theme", theme);
    applyThemeClass(theme);
    set({ theme });
  },
}));
