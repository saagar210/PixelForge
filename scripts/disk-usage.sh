#!/usr/bin/env bash
set -euo pipefail

PATHS=(
  "."
  "node_modules"
  "node_modules/.vite"
  "dist"
  "src-tauri/target"
  "src-tauri/target/debug"
  "src-tauri/target/release"
)

printf "%-30s %s\n" "Path" "Size"
printf "%-30s %s\n" "----" "----"

for path in "${PATHS[@]}"; do
  if [ -e "$path" ]; then
    size="$(du -sh "$path" | awk '{print $1}')"
    printf "%-30s %s\n" "$path" "$size"
  else
    printf "%-30s %s\n" "$path" "missing"
  fi
done
