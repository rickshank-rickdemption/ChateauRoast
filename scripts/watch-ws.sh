#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_FILE="backend/server.php"
INTERVAL_SECONDS="${1:-1}"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Missing $TARGET_FILE"
  exit 1
fi

echo "Starting WebSocket watch mode for $TARGET_FILE (interval: ${INTERVAL_SECONDS}s)"
./scripts/restart-ws.sh

last_mtime="$(stat -c %Y "$TARGET_FILE")"

while true; do
  sleep "$INTERVAL_SECONDS"
  current_mtime="$(stat -c %Y "$TARGET_FILE")"
  if [[ "$current_mtime" != "$last_mtime" ]]; then
    echo "Change detected in $TARGET_FILE. Restarting WebSocket server..."
    ./scripts/restart-ws.sh
    last_mtime="$current_mtime"
  fi
done

