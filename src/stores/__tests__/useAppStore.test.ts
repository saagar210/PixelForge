import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "../useAppStore";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      imageUrl: null,
      imageInfo: null,
      isLoading: false,
      error: null,
      zoom: 1,
      panX: 0,
      panY: 0,
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
    });
  });

  it("setZoom clamps to min", () => {
    useAppStore.getState().setZoom(0.01);
    expect(useAppStore.getState().zoom).toBe(0.1);
  });

  it("setZoom clamps to max", () => {
    useAppStore.getState().setZoom(100);
    expect(useAppStore.getState().zoom).toBe(20);
  });

  it("setZoom allows valid values", () => {
    useAppStore.getState().setZoom(2.5);
    expect(useAppStore.getState().zoom).toBe(2.5);
  });

  it("setImage updates imageUrl and imageInfo", () => {
    const info = {
      width: 800,
      height: 600,
      format: "JPEG",
      fileSizeBytes: 1024,
      fileName: "test.jpg",
      filePath: "/test.jpg",
      needsConversion: false,
    };
    useAppStore.getState().setImage("blob:test", info);

    const state = useAppStore.getState();
    expect(state.imageUrl).toBe("blob:test");
    expect(state.imageInfo).toEqual(info);
    expect(state.error).toBeNull();
  });

  it("clearImage resets image, viewport, and history", () => {
    useAppStore.getState().setZoom(3);
    useAppStore.getState().setPan(100, 200);
    useAppStore.setState({
      operationHistory: [
        { type: "blur", label: "Blur 2.0", imagePath: "/tmp/test" },
      ],
    });
    useAppStore.getState().clearImage();

    const state = useAppStore.getState();
    expect(state.imageUrl).toBeNull();
    expect(state.imageInfo).toBeNull();
    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
    expect(state.operationHistory).toEqual([]);
    expect(state.showBeforeAfter).toBe(false);
  });

  it("setError clears loading and processing", () => {
    useAppStore.setState({ isLoading: true, isProcessing: true });
    useAppStore.getState().setError("Something broke");

    const state = useAppStore.getState();
    expect(state.error).toBe("Something broke");
    expect(state.isLoading).toBe(false);
    expect(state.isProcessing).toBe(false);
  });

  it("setPan updates coordinates", () => {
    useAppStore.getState().setPan(50, -30);
    const state = useAppStore.getState();
    expect(state.panX).toBe(50);
    expect(state.panY).toBe(-30);
  });

  it("resetView resets zoom and pan", () => {
    useAppStore.getState().setZoom(5);
    useAppStore.getState().setPan(100, 200);
    useAppStore.getState().resetView();

    const state = useAppStore.getState();
    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
  });

  // Phase 2: Operation history
  it("pushOperation adds entry and updates currentFilePath", () => {
    useAppStore.getState().pushOperation({
      type: "rotate",
      label: "Rotate 90deg",
      imagePath: "/tmp/result1",
    });

    const state = useAppStore.getState();
    expect(state.operationHistory).toHaveLength(1);
    expect(state.operationHistory[0].label).toBe("Rotate 90deg");
    expect(state.currentFilePath).toBe("/tmp/result1");
  });

  it("undo removes last operation and restores previous path", () => {
    useAppStore.setState({ originalFilePath: "/original.png" });
    useAppStore.getState().pushOperation({
      type: "blur",
      label: "Blur 2.0",
      imagePath: "/tmp/step1",
    });
    useAppStore.getState().pushOperation({
      type: "sharpen",
      label: "Sharpen 1.5",
      imagePath: "/tmp/step2",
    });

    useAppStore.getState().undo();
    expect(useAppStore.getState().operationHistory).toHaveLength(1);
    expect(useAppStore.getState().currentFilePath).toBe("/tmp/step1");
    expect(useAppStore.getState().imageUrl).toBeTruthy();

    useAppStore.getState().undo();
    expect(useAppStore.getState().operationHistory).toHaveLength(0);
    expect(useAppStore.getState().currentFilePath).toBe("/original.png");
    expect(useAppStore.getState().imageUrl).toBeTruthy();
  });

  it("undo does nothing when history is empty", () => {
    useAppStore.getState().undo();
    expect(useAppStore.getState().operationHistory).toHaveLength(0);
  });

  it("setSidebarPanel toggles panel", () => {
    useAppStore.getState().setSidebarPanel("operations");
    expect(useAppStore.getState().activeSidebarPanel).toBe("operations");

    useAppStore.getState().setSidebarPanel("operations");
    expect(useAppStore.getState().activeSidebarPanel).toBeNull();

    useAppStore.getState().setSidebarPanel("ai");
    expect(useAppStore.getState().activeSidebarPanel).toBe("ai");
  });

  // Phase 3: Before/After
  it("setBeforeAfter sets URLs and shows slider", () => {
    useAppStore
      .getState()
      .setBeforeAfter("before-url", "after-url");

    const state = useAppStore.getState();
    expect(state.beforeImageUrl).toBe("before-url");
    expect(state.afterImageUrl).toBe("after-url");
    expect(state.showBeforeAfter).toBe(true);
  });

  it("clearBeforeAfter resets slider state", () => {
    useAppStore
      .getState()
      .setBeforeAfter("before-url", "after-url");
    useAppStore.getState().clearBeforeAfter();

    const state = useAppStore.getState();
    expect(state.beforeImageUrl).toBeNull();
    expect(state.afterImageUrl).toBeNull();
    expect(state.showBeforeAfter).toBe(false);
  });

  // Phase 4: Inpaint mode
  it("setInpaintMode toggles inpaint state", () => {
    expect(useAppStore.getState().inpaintMode).toBe(false);
    useAppStore.getState().setInpaintMode(true);
    expect(useAppStore.getState().inpaintMode).toBe(true);
    useAppStore.getState().setInpaintMode(false);
    expect(useAppStore.getState().inpaintMode).toBe(false);
  });

  it("setBrushSize clamps to 1–200", () => {
    useAppStore.getState().setBrushSize(50);
    expect(useAppStore.getState().brushSize).toBe(50);

    useAppStore.getState().setBrushSize(0);
    expect(useAppStore.getState().brushSize).toBe(1);

    useAppStore.getState().setBrushSize(-10);
    expect(useAppStore.getState().brushSize).toBe(1);

    useAppStore.getState().setBrushSize(300);
    expect(useAppStore.getState().brushSize).toBe(200);
  });

  it("clearImage resets inpaintMode", () => {
    useAppStore.getState().setInpaintMode(true);
    useAppStore.getState().clearImage();
    expect(useAppStore.getState().inpaintMode).toBe(false);
  });
});
