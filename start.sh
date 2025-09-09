#!/bin/bash

# 金价爬虫工具启动脚本 (Linux/macOS)

echo "🚀 启动金价爬虫工具"
echo ""

# 自动安装 Node.js（仅支持 x64 Linux/macOS，其他架构需手动安装）
install_node() {
    NODE_VERSION="22.14.0"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        ARCH=$(uname -m)
        if [[ "$ARCH" == "x86_64" ]]; then
            echo "🔄 正在自动安装 Node.js $NODE_VERSION ..."
            curl -fsSL https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz -o node.tar.xz
            tar -xf node.tar.xz
            sudo cp -r node-v$NODE_VERSION-linux-x64/{bin,include,lib,share} /usr/
            rm -rf node-v$NODE_VERSION-linux-x64 node.tar.xz
            echo "✅ Node.js 安装完成"
        else
            echo "❌ 暂不支持自动安装 Node.js，当前架构: $ARCH，请手动安装 Node.js 22.14.0"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "🔄 正在通过 Homebrew 安装 Node.js ..."
            brew install node@22.14.0
            echo "✅ Node.js 安装完成"
        else
            echo "❌ 未检测到 Homebrew，请手动安装 Node.js 18+"
            exit 1
        fi
    else
        echo "❌ 暂不支持自动安装 Node.js，请手动安装 Node.js 18+"
        exit 1
    fi
}

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 未找到 Node.js，尝试自动安装..."
    install_node
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 安装失败，请手动安装 Node.js 18+"
        exit 1
    fi
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

# 自动安装 Playwright 浏览器（chromium）
install_playwright_chrome() {
    echo "🎭 检查并安装 Playwright Chromium 浏览器..."
    npx playwright install chromium
    if [ $? -ne 0 ]; then
        echo "❌ Playwright 浏览器安装失败，请检查网络或手动执行: npx playwright install chromium"
        exit 1
    fi
}

# 检查 Playwright 是否已安装 chromium
if [ ! -d "$(npx playwright install --with-deps --dry-run 2>/dev/null | grep chromium | awk '{print $NF}')" ]; then
    install_playwright_chrome
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
