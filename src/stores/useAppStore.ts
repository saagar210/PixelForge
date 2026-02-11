import { create } from "zustand";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { ImageInfo, OperationHistoryEntry } from "../types/image";

export type ThemeMode = "light" | "dark" | "system";
export type SidebarPanel = "operations" | "ai" | "export" | "batch" | null;

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;

interface AppState {
  // Image
  imageUrl: string | null;
  imageInfo: ImageInfo | null;
  isLoading: boolean;
  error: string | null;

  // File tracking (Phase 2)
  originalFilePath: string | null;
  currentFilePath: string | null;

  // Operation history (Phase 2)
  operationHistory: OperationHistoryEntry[];
  isProcessing: boolean;

  // Sidebar (Phase 2)
  activeSidebarPanel: SidebarPanel;

  // Before/After (Phase 3)
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  showBeforeAfter: boolean;

  // Inpaint mode (Phase 4)
  inpaintMode: boolean;
  brushSize: number;

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

  // Phase 2 actions
  setFilePaths: (original: string, current: string) => void;
  setCurrentFilePath: (path: string) => void;
  pushOperation: (entry: OperationHistoryEntry) => void;
  undo: () => void;
  setProcessing: (processing: boolean) => void;
  setSidebarPanel: (panel: SidebarPanel) => void;

  // Phase 3 actions
  setBeforeAfter: (before: string, after: string) => void;
  clearBeforeAfter: () => void;
  setShowBeforeAfter: (show: boolean) => void;

  // Phase 4 actions
  setInpaintMode: (active: boolean) => void;
  setBrushSize: (size: number) => void;
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

export const useAppStore = create<AppState>((set, get) => ({
  imageUrl: null,
  imageInfo: null,
  isLoading: false,
  error: null,
  originalFilePath: null,
  currentFilePath: null,
  operationHistory: [],
  isProcessing: false,
  activeSidebarPanel: null,
  beforeImageUrl: null,
  afterImageUrl: null,
  showBeforeAfter: false,
  inpaintMode: false,
  brushSize: 30,
  zoom: 1,
  panX: 0,
  panY: 0,
  theme: (localStorage.getItem("pixelforge-theme") as ThemeMode) || "system",

  setImage: (url, info) =>
    set({ imageUrl: url, imageInfo: info, error: null }),

  clearImage: () =>
    set({
      imageUrl: null,
      imageInfo: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      originalFilePath: null,
      currentFilePath: null,
      operationHistory: [],
      beforeImageUrl: null,
      afterImageUrl: null,
      showBeforeAfter: false,
      inpaintMode: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false, isProcessing: false }),

  setZoom: (zoom) =>
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setTheme: (theme) => {
    localStorage.setItem("pixelforge-theme", theme);
    applyThemeClass(theme);
    set({ theme });
  },

  // Phase 2
  setFilePaths: (original, current) =>
    set({ originalFilePath: original, currentFilePath: current }),

  setCurrentFilePath: (path) => set({ currentFilePath: path }),

  pushOperation: (entry) =>
    set((state) => ({
      operationHistory: [...state.operationHistory, entry],
      currentFilePath: entry.imagePath,
    })),

  undo: () => {
    const { operationHistory, originalFilePath } = get();
    if (operationHistory.length === 0) return;
    const newHistory = operationHistory.slice(0, -1);
    const previousPath =
      newHistory.length > 0
        ? newHistory[newHistory.length - 1].imagePath
        : originalFilePath;
    set({
      operationHistory: newHistory,
      currentFilePath: previousPath,
      imageUrl: previousPath ? convertFileSrc(previousPath) : null,
    });
  },

  setProcessing: (processing) => set({ isProcessing: processing }),

  setSidebarPanel: (panel) =>
    set((state) => ({
      activeSidebarPanel: state.activeSidebarPanel === panel ? null : panel,
    })),

  // Phase 3
  setBeforeAfter: (before, after) =>
    set({ beforeImageUrl: before, afterImageUrl: after, showBeforeAfter: true }),

  clearBeforeAfter: () =>
    set({ beforeImageUrl: null, afterImageUrl: null, showBeforeAfter: false }),

  setShowBeforeAfter: (show) => set({ showBeforeAfter: show }),

  // Phase 4
  setInpaintMode: (active) => set({ inpaintMode: active }),
  setBrushSize: (size) => set({ brushSize: Math.min(200, Math.max(1, size)) }),
}));
