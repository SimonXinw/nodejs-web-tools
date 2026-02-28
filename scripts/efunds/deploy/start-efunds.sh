#!/bin/bash
# Local startup script - build + start/reload efunds scraper
# Usage:
#   bash scripts/efunds/deploy/start-efunds.sh           # build + reload
#   bash scripts/efunds/deploy/start-efunds.sh --setup   # first deploy (configure pm2 startup)

set -e

[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$ROOT_DIR"

SETUP_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--setup" ]] && SETUP_MODE=true
done

echo ""
echo "=========================================="
if $SETUP_MODE; then
  echo " efunds scraper - first deploy"
else
  echo " efunds scraper - build & reload"
fi
echo " dir: $ROOT_DIR"
echo "=========================================="

echo ""
echo "[1/4] pnpm install..."
pnpm install --frozen-lockfile

echo ""
echo "[2/4] pnpm build..."
pnpm build

echo ""
echo "[3/4] PM2 start / reload..."
pm2 startOrReload ecosystem.config.js --only efunds-scraper

echo ""
echo "[4/4] pm2 save..."
pm2 save

if $SETUP_MODE; then
  echo ""
  echo "[setup] configuring PM2 startup..."

  STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo " | tail -1)

  if [[ -n "$STARTUP_CMD" ]]; then
    echo "  running: $STARTUP_CMD"
    eval "$STARTUP_CMD"
    pm2 save
    echo "  startup configured"
  else
    echo "  PM2 startup already configured, skipping"
  fi
fi

echo ""
echo "=========================================="
echo " done"
echo ""
pm2 status
echo ""
echo " logs  : pnpm pm2:logs:efunds"
echo " stop  : pnpm pm2:stop:efunds"
echo " deploy: bash scripts/efunds/deploy/start-efunds.sh"
echo "=========================================="
