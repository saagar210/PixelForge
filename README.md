# PixelForge

Desktop image editor built with Tauri 2, React 19, TypeScript, and Rust.

## What It Does

- Open and edit images locally
- Apply core adjustments (rotate, flip, resize, brightness/contrast/HSL, blur, sharpen)
- Run AI tools (background removal, upscaling, inpainting, style transfer, classification, palette extraction)
- Export to multiple formats

## Requirements

- Node.js 22+
- pnpm 10+
- Rust 1.93+
- Platform prerequisites for Tauri:
  - macOS: Xcode Command Line Tools
  - Linux: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
  - Windows: Visual Studio Build Tools

## Setup

```bash
git clone https://github.com/saagar210/PixelForge.git
cd PixelForge
pnpm install
```

## Run

```bash
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

## Project Layout

```text
src/        React frontend
src-tauri/  Rust + Tauri backend
```

## Notes

- AI models are downloaded on first use and cached under `~/.pixelforge/models/`.
- This repository is intentionally lean and currently omits CI/test scaffolding.
