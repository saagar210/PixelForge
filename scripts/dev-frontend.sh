#!/usr/bin/env bash
set -euo pipefail

# Allow lean mode to override Vite's cache location.
CACHE_DIR="${PIXELFORGE_VITE_CACHE_DIR:-node_modules/.vite}"

exec pnpm dev -- --cacheDir "$CACHE_DIR"
