#!/usr/bin/env bash
set -euo pipefail

HEAVY_PATHS=(
  "dist"
  "src-tauri/target"
  "node_modules/.vite"
)

echo "Removing heavy build artifacts..."
for path in "${HEAVY_PATHS[@]}"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "  removed $path"
  else
    echo "  skipped $path (missing)"
  fi
done
