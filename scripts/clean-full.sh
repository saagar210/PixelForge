#!/usr/bin/env bash
set -euo pipefail

bash scripts/clean-heavy.sh

FULL_PATHS=(
  "node_modules"
)

echo "Removing reproducible local dependency caches..."
for path in "${FULL_PATHS[@]}"; do
  if [ -e "$path" ]; then
    rm -rf "$path"
    echo "  removed $path"
  else
    echo "  skipped $path (missing)"
  fi
done
