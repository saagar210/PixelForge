import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";
import { useAppStore } from "../../../stores/useAppStore";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

describe("Sidebar", () => {
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

  it("keeps Batch enabled when no image is loaded", () => {
    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Batch" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "AI Tools" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(
      screen.getByText("Open an image for edit/AI/export tools. Batch is available now."),
    ).toBeInTheDocument();
  });

  it("enables image-dependent tools when image metadata exists", () => {
    useAppStore.setState({
      imageInfo: {
        width: 1200,
        height: 800,
        format: "PNG",
        fileSizeBytes: 1024,
        fileName: "x.png",
        filePath: "/tmp/x.png",
        needsConversion: false,
      },
    });

    render(<Sidebar />);

    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "AI Tools" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Batch" })).toBeEnabled();
    expect(screen.getByText("No edits yet")).toBeInTheDocument();
  });
});
