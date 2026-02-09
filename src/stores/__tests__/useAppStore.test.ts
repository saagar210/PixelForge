import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../useAppStore";

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

  it("clearImage resets image and viewport", () => {
    useAppStore.getState().setZoom(3);
    useAppStore.getState().setPan(100, 200);
    useAppStore.getState().clearImage();

    const state = useAppStore.getState();
    expect(state.imageUrl).toBeNull();
    expect(state.imageInfo).toBeNull();
    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
  });

  it("setError clears loading", () => {
    useAppStore.setState({ isLoading: true });
    useAppStore.getState().setError("Something broke");

    const state = useAppStore.getState();
    expect(state.error).toBe("Something broke");
    expect(state.isLoading).toBe(false);
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
});
