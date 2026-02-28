#!/bin/bash
# Run efunds scraper directly (no PM2)
# Usage:
#   bash run-efunds.sh          # run in foreground
#   bash run-efunds.sh --bg     # run in background (nohup)

set -e

[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOG_FILE="$ROOT_DIR/logs/efunds-direct.log"

cd "$ROOT_DIR"
mkdir -p "$ROOT_DIR/logs"

BG_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--bg" ]] && BG_MODE=true
done

echo "=========================================="
echo " efunds scraper - direct run (no PM2)"
echo " dir : $ROOT_DIR"
echo " log : $LOG_FILE"
echo "=========================================="

CMD="node -r dotenv/config dist/index.js --scraper efunds-dividend"

if $BG_MODE; then
  echo " mode: background (nohup)"
  echo "=========================================="
  nohup $CMD >> "$LOG_FILE" 2>&1 &
  echo ""
  echo " started, PID: $!"
  echo " tail log: tail -f $LOG_FILE"
  echo " stop    : kill $!"
else
  echo " mode: foreground (Ctrl+C to stop)"
  echo "=========================================="
  echo ""
  exec $CMD
fi
