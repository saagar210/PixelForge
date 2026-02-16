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

### Lean Dev (low disk mode)

```bash
pnpm lean:dev
```

What lean mode does:
- Starts the app with the same `pnpm tauri dev` command path.
- Uses ephemeral cache folders for Vite and Rust build outputs.
- Cleans heavy repository build artifacts automatically when the dev process exits.

Tradeoff:
- Uses less persistent disk in the repo.
- Startup is slower because Rust rebuilds more often after restarts.

## Build

```bash
pnpm tauri build
```

## Cleanup Commands

Heavy build artifacts only:

```bash
pnpm clean:heavy
```

This removes:
- `dist/`
- `src-tauri/target/`
- `node_modules/.vite/`

Full reproducible local cleanup:

```bash
pnpm clean:full
```

This runs `clean:heavy`, then also removes:
- `node_modules/`

Disk usage report:

```bash
pnpm disk:usage
```

## Project Layout

```text
src/        React frontend
src-tauri/  Rust + Tauri backend
```

## Notes

- AI models are downloaded on first use and cached under `~/.pixelforge/models/`.
- Cleanup scripts do not remove source files, `.git`, or user model data under `~/.pixelforge/models/`.
- This repository is intentionally lean and currently omits CI/test scaffolding.
