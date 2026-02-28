#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 部署脚本：拉取最新代码 → 安装依赖 → 编译 → 启动/重载 PM2
# 用法：
#   ./deploy.sh              # 部署并重载全部爬虫
#   ./deploy.sh efunds       # 只部署 efunds-scraper
#   ./deploy.sh gold         # 只部署 gold-scraper
# ─────────────────────────────────────────────────────────────────────────────

set -e  # 任意步骤失败立即退出

TARGET=${1:-"all"}   # 默认部署全部

echo "=========================================="
echo " 开始部署 [target: $TARGET]"
echo "=========================================="

# 1. 拉取最新代码
echo ""
echo "📥 [1/4] 拉取最新代码..."
git pull

# 2. 安装依赖（严格按 lockfile，不升级）
echo ""
echo "📦 [2/4] 安装依赖..."
pnpm install --frozen-lockfile

# 3. 编译 TypeScript
echo ""
echo "🔨 [3/4] 编译 TypeScript..."
pnpm build

# 4. 启动 / 重载 PM2
echo ""
echo "🚀 [4/4] 启动 / 重载 PM2..."

case "$TARGET" in
  efunds)
    pm2 reload ecosystem.config.js --only efunds-scraper || \
    pm2 start  ecosystem.config.js --only efunds-scraper
    ;;
  gold)
    pm2 reload ecosystem.config.js --only gold-scraper || \
    pm2 start  ecosystem.config.js --only gold-scraper
    ;;
  *)
    pm2 reload ecosystem.config.js || \
    pm2 start  ecosystem.config.js
    ;;
esac

# 保存 PM2 进程列表（服务器重启后自动恢复）
pm2 save

echo ""
echo "=========================================="
echo " 部署完成！"
pm2 status
echo "=========================================="
