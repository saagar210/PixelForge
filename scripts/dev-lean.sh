#!/usr/bin/env bash
set -euo pipefail

EPHEMERAL_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/pixelforge-lean.XXXXXX")"

export PIXELFORGE_VITE_CACHE_DIR="$EPHEMERAL_ROOT/vite-cache"
export CARGO_TARGET_DIR="$EPHEMERAL_ROOT/cargo-target"

cleanup() {
  echo
  echo "Lean cleanup: removing repository build artifacts and ephemeral caches..."
  bash scripts/clean-heavy.sh
  rm -rf "$EPHEMERAL_ROOT"
}

trap cleanup EXIT INT TERM

echo "Lean mode enabled."
echo "  PIXELFORGE_VITE_CACHE_DIR=$PIXELFORGE_VITE_CACHE_DIR"
echo "  CARGO_TARGET_DIR=$CARGO_TARGET_DIR"

pnpm tauri dev "$@"
