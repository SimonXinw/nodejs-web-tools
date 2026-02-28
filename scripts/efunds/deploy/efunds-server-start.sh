#!/bin/bash
# Server-side startup script (called remotely by aliyun-hk-deploy.bat via plink)
# Usage:
#   bash -l /usr/projects/backend/nodejs-web-tools/scripts/efunds/deploy/efunds-server-start.sh
#   bash -l /usr/projects/backend/nodejs-web-tools/scripts/efunds/deploy/efunds-server-start.sh --setup

set -e

# pnpm/node/pm2 PATH is in ~/.bashrc, not loaded by non-interactive shell
[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

SERVER_PATH="/usr/projects/backend/nodejs-web-tools"

SETUP_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--setup" ]] && SETUP_MODE=true
done

cd "$SERVER_PATH"

echo ""
echo "=========================================="
if $SETUP_MODE; then
  echo " [SERVER] efunds scraper - first deploy"
else
  echo " [SERVER] efunds scraper - reload"
fi
echo " dir : $SERVER_PATH"
echo " node: $(node -v)"
echo " pnpm: $(pnpm -v)"
echo " pm2 : $(pm2 -v)"
echo "=========================================="

echo ""
echo "[SERVER] installing dependencies..."
pnpm install --frozen-lockfile

echo ""
echo "[SERVER] starting / reloading PM2..."
pm2 startOrReload ecosystem.config.js --only efunds-scraper

echo ""
echo "[SERVER] saving PM2 process list..."
pm2 save

if $SETUP_MODE; then
  echo ""
  echo "[SERVER] configuring PM2 startup..."

  STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo " | tail -1)

  if [[ -n "$STARTUP_CMD" ]]; then
    echo "[SERVER] running: $STARTUP_CMD"
    eval "$STARTUP_CMD"
    pm2 save
    echo "[SERVER] startup configured"
  else
    echo "[SERVER] PM2 startup already configured, skipping"
  fi
fi

echo ""
echo "=========================================="
echo " [SERVER] done"
pm2 status
echo "=========================================="
