# PixelForge

A powerful desktop image editor built with **Tauri 2** + **React 19** + **Rust**, featuring AI-powered image processing with ONNX Runtime.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tauri](https://img.shields.io/badge/Tauri-2.10-blue)
![React](https://img.shields.io/badge/React-19-blue)

## Features

### ✨ Core Image Editing
- **Format Support**: JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF
- **Non-destructive workflow** with unlimited undo
- **Cursor-centered zoom/pan** (10%–2000%)
- **Geometric operations**: Crop, Resize (3 algorithms), Rotate, Flip
- **Adjustments**: Brightness, Contrast, Hue, Saturation, Lightness, Blur, Sharpen
- **Before/After slider** for visual comparison

### 🤖 AI-Powered Tools
- **Background Removal** (U²-Net)
- **AI Upscaling** (Real-ESRGAN 4x with tile processing)
- **Inpainting** (LaMa — paint over objects to remove them)
- **Style Transfer** (5 artistic styles: Mosaic, Candy, Rain Princess, Udnie, Pointilism)
- **Image Classification** (MobileNetV2, 1000 ImageNet categories)
- **Color Palette Extraction** (K-means clustering)

### 💾 Export & Utilities
- **Export formats**: JPEG (quality control), PNG, WebP, BMP, TIFF, AVIF
- **Dark/Light/System theme** with no flash on load
- **Keyboard shortcuts**: Cmd+O (open), Cmd+Z (undo), Cmd+S (save), Cmd +/- (zoom), [ ] (brush size)

## Tech Stack

**Frontend:**
- React 19 (functional components + hooks)
- TypeScript (strict mode)
- Zustand 5 (state management)
- Tailwind CSS 4
- Vite + Vitest

**Backend:**
- Rust (1.93+)
- Tauri 2.10
- `ort` 2.0.0-rc.11 (ONNX Runtime with CoreML acceleration)
- `image` crate 0.25 (AVIF + WebP support)

**Architecture:**
- Asset protocol for browser-native image formats (zero IPC overhead)
- Binary IPC for non-browser formats (TIFF)
- ONNX model caching via `Mutex<HashMap>`
- Tile-based AI processing for large images

## Installation

### Prerequisites
- **Rust** 1.93 or later
- **Node.js** 22+ and **pnpm** 10.29+
- **Platform-specific dependencies**:
  - macOS: Xcode Command Line Tools
  - Linux: See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
  - Windows: Visual Studio Build Tools

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/PixelForge.git
cd PixelForge

# Install frontend dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## AI Models

AI features require downloading ONNX models on first use:

| Model | Size | Use Case |
|-------|------|----------|
| U²-Net | 176 MB | Background removal |
| Real-ESRGAN x4 | 67 MB | AI upscaling (4x) |
| LaMa | 208 MB | Object removal/inpainting |
| MobileNetV2 | 13 MB | Image classification |
| Style Transfer (×5) | ~7 MB each | Artistic style transfer |

Models are downloaded to `~/.pixelforge/models/` and cached for future use.

## Development

### Project Structure

```
PixelForge/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── commands/   # Tauri commands (image ops, AI, export)
│   │   ├── models/     # ONNX model management
│   │   └── error.rs    # Error handling (thiserror)
│   └── Cargo.toml
├── src/                # React frontend
│   ├── components/     # UI components (panels, viewer, layout)
│   ├── hooks/          # React hooks
│   ├── stores/         # Zustand state management
│   ├── lib/            # Tauri IPC wrappers
│   └── types/          # TypeScript definitions
└── package.json
```

### Testing

```bash
# Frontend tests (Vitest)
pnpm test:run

# Rust tests
cd src-tauri && cargo test

# Type checking
pnpm typecheck
```

**Current test coverage:**
- ✅ 25/25 Rust tests
- ✅ 20/20 Frontend tests

### Code Standards

- **Rust**: No `unwrap()` in production code, `thiserror` for errors
- **React**: Functional components only, hooks, no class components
- **TypeScript**: Strict mode, no `any` types
- **Git**: Conventional commits (`feat:`/`fix:`/`docs:`/`refactor:`/`test:`)

## Roadmap

### ✅ Phase 1–4 (Complete)
- [x] Image viewer with zoom/pan
- [x] 11 image operations + export
- [x] AI background removal
- [x] Model download/management
- [x] 5 additional AI tools
- [x] Inpaint brush mode

### 🚧 Phase 5 (In Progress)
- [ ] Batch processing pipeline
- [ ] Parallel execution
- [ ] Progress tracking & cancellation

### 📋 Planned Features
- [ ] EXIF metadata support
- [ ] Clipboard integration
- [ ] Histogram display
- [ ] Drag-and-drop file loading
- [ ] User settings persistence
- [ ] macOS/Windows/Linux installers
- [ ] CI/CD pipeline

## Performance

- **Startup**: < 1s (native binary)
- **Image loading**: Instant for browser formats via asset protocol
- **AI operations**: 2–10s depending on model and image size
- **Upscaling**: Tile-based processing prevents OOM on large images

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow code standards (run `cargo fmt`, `cargo clippy`, `pnpm typecheck`)
4. Write tests for new features
5. Commit with conventional commits
6. Open a Pull Request

## Acknowledgments

- **AI Models**: U²-Net, Real-ESRGAN, LaMa, MobileNetV2 (ONNX Model Zoo)
- **Built with**: [Tauri](https://tauri.app/), [React](https://react.dev/), [Rust](https://www.rust-lang.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

**Built with ❤️ using Tauri 2 + React 19**
