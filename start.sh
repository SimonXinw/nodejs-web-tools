#!/bin/bash

# 金价爬虫工具启动脚本 (Linux/macOS)

echo "🚀 启动金价爬虫工具"

echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then

    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 18+"

    exit 1

fi

echo "✅ Node.js 版本: $(node --version)"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then

    echo "📦 首次运行，正在安装依赖..."

    npm install

    if [ $? -ne 0 ]; then

        echo "❌ 依赖安装失败"

        exit 1

    fi

fi

# 检查是否存在 .env 文件
if [ ! -f ".env" ]; then

    echo "⚙️ 未找到 .env 文件，启动配置向导..."

    npm run setup

    if [ $? -ne 0 ]; then

        echo "❌ 配置失败"

        exit 1

    fi

fi

# 编译 TypeScript
echo "🔨 编译项目..."

npm run build

if [ $? -ne 0 ]; then

    echo "❌ 编译失败"

    exit 1

fi

echo ""

echo "选择运行模式:"

echo "1. 开发模式 (实时日志)"

echo "2. 生产模式 (后台运行)"

echo "3. 手动执行一次"

echo "4. 测试爬虫功能"

echo "5. 退出"

echo ""

read -p "请选择 (1-5): " choice

case $choice in

    1)

        echo "🔧 启动开发模式..."

        npm run dev

        ;;

    2)

        echo "🚀 启动生产模式..."

        npm start

        ;;

    3)

        echo "🎯 手动执行爬取..."

        npm run dev -- --manual

        ;;

    4)

        echo "🧪 测试爬虫功能..."

        npm run test:scraper

        ;;

    5)

        echo "👋 再见!"

        exit 0

        ;;

    *)

        echo "❌ 无效选择"

        exit 1

        ;;

esac
