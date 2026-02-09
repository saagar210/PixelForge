import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { ImageInfo } from "../ImageInfo";
import { useAppStore } from "../../../stores/useAppStore";

describe("ImageInfo", () => {
  beforeEach(() => {
    useAppStore.setState({
      imageInfo: null,
      zoom: 1,
      error: null,
    });
  });

  it("renders nothing when no image is loaded", () => {
    const { container } = render(<ImageInfo />);
    expect(container.querySelector("[class*='bottom']")).not.toBeInTheDocument();
  });

  it("renders metadata when image is loaded", () => {
    useAppStore.setState({
      imageInfo: {
        width: 1920,
        height: 1080,
        format: "PNG",
        fileSizeBytes: 2048000,
        fileName: "screenshot.png",
        filePath: "/test/screenshot.png",
        needsConversion: false,
      },
      zoom: 0.5,
    });

    render(<ImageInfo />);

    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("1920 x 1080")).toBeInTheDocument();
    expect(screen.getByText("PNG")).toBeInTheDocument();
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders error banner when error is set", () => {
    useAppStore.setState({ error: "Something went wrong" });

    render(<ImageInfo />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
