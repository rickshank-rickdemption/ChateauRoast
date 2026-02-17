#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pkill -f "php backend/server.php" >/dev/null 2>&1 || true
nohup php backend/server.php > backend/server.log 2>&1 &
PID=$!
echo "$PID" > backend/server.pid
sleep 1
if ps -p "$PID" >/dev/null 2>&1; then
  echo "WebSocket server restarted. PID=$PID"
  tail -n 5 backend/server.log || true
else
  echo "Failed to start WebSocket server"
  tail -n 30 backend/server.log || true
  exit 1
fi
