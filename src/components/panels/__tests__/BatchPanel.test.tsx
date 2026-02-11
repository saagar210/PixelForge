import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchPanel } from "../BatchPanel";
import type { BatchProgress, BatchResult } from "../../../types/image";

const openMock = vi.fn();
const runBatchResizeExportMock = vi.fn();

const eventHandlers: Record<string, (event: { payload: unknown }) => void> = {};

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => openMock(...args),
}));

vi.mock("../../../../src/lib/tauri", () => ({
  runBatchResizeExport: (...args: unknown[]) => runBatchResizeExportMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (eventName: string, handler: (event: { payload: unknown }) => void) => {
    eventHandlers[eventName] = handler;
    return Promise.resolve(() => {
      delete eventHandlers[eventName];
    });
  },
}));

describe("BatchPanel", () => {
  beforeEach(() => {
    openMock.mockReset();
    runBatchResizeExportMock.mockReset();
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
  });

  it("runs batch with selected inputs/output and shows summary", async () => {
    openMock
      .mockResolvedValueOnce(["/tmp/a.png", "/tmp/b.png"])
      .mockResolvedValueOnce("/tmp/out");

    const summary: BatchResult = {
      total: 2,
      processed: 2,
      failed: 0,
      outputs: ["/tmp/out/a_resized.png", "/tmp/out/b_resized.png"],
      errors: [],
    };

    runBatchResizeExportMock.mockResolvedValue(summary);

    render(<BatchPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Select Input Images/i }));
    await waitFor(() =>
      expect(screen.getByText("First file: a.png")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /Select Output Folder/i }));

    const runButton = screen.getByRole("button", { name: /Run Batch/i });
    await waitFor(() => expect(runButton).toBeEnabled());

    fireEvent.click(runButton);

    await waitFor(() => {
      expect(runBatchResizeExportMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Processed: 2")).toBeInTheDocument();
      expect(screen.getByText("Output files: 2")).toBeInTheDocument();
    });

    expect(runBatchResizeExportMock).toHaveBeenCalledWith({
      inputPaths: ["/tmp/a.png", "/tmp/b.png"],
      outputDir: "/tmp/out",
      width: 1024,
      height: 1024,
      filter: "lanczos",
      format: "png",
      quality: 90,
    });
  });

  it("surfaces input selection error", async () => {
    openMock.mockRejectedValueOnce(new Error("dialog failed"));

    render(<BatchPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Select Input Images/i }));

    await waitFor(() => {
      expect(screen.getByText("dialog failed")).toBeInTheDocument();
    });
  });

  it("updates progress from event handler", async () => {
    render(<BatchPanel />);

    const progressPayload: BatchProgress = {
      current: 1,
      total: 3,
      percent: 33,
      file: "/tmp/one.png",
    };

    act(() => {
      eventHandlers["batch-progress"]({ payload: progressPayload });
    });

    await waitFor(() => {
      expect(screen.getByText("1/3 — one.png")).toBeInTheDocument();
    });
  });
});
