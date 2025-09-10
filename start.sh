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


# 检测操作系统类型
detect_os() {
    if [ -f /etc/redhat-release ]; then
        echo "centos"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

# 安装系统依赖（仅限CentOS/RHEL）
install_centos_deps() {
    echo "🔧 检测到CentOS/RHEL系统，正在安装Playwright浏览器运行所需的系统依赖..."
    
    # 检查是否有root权限
    if [ "$EUID" -ne 0 ]; then
        echo "❌ 需要root权限来安装系统依赖"
        echo "💡 请使用 sudo 运行此脚本，或手动安装以下依赖："
        echo "   yum install -y libX11 libXcomposite libXdamage libXext libXfixes libXrandr libgbm libcairo-gobject alsa-lib atk at-spi2-atk gtk3"
        return 1
    fi
    
    echo "📦 正在安装CentOS系统依赖包..."
    
    # 更新yum源（如果需要）
    yum makecache fast
    
    # 安装基础依赖组
    yum groupinstall -y "Development Tools"
    
    # 安装Playwright浏览器运行所需的系统库
    yum install -y \
        libX11 \
        libX11-devel \
        libXcomposite \
        libXcomposite-devel \
        libXdamage \
        libXdamage-devel \
        libXext \
        libXext-devel \
        libXfixes \
        libXfixes-devel \
        libXrandr \
        libXrandr-devel \
        libgbm \
        libcairo-gobject \
        libcairo-gobject-devel \
        alsa-lib \
        alsa-lib-devel \
        atk \
        atk-devel \
        at-spi2-atk \
        at-spi2-atk-devel \
        gtk3 \
        gtk3-devel \
        libxcb \
        libxcb-devel \
        libatspi \
        pango \
        pango-devel \
        cups-libs \
        libdrm \
        libXss \
        libgconf-2.so.4 \
        libXtst \
        nss \
        nspr
    
    if [ $? -eq 0 ]; then
        echo "✅ CentOS系统依赖安装成功"
        return 0
    else
        echo "❌ 部分依赖安装失败，但可能不影响运行"
        echo "💡 如果后续运行出现问题，请手动执行："
        echo "   npx playwright install-deps"
        return 1
    fi
}

# 自动安装 Playwright 浏览器（chromium）
install_playwright_chrome() {
    local os_type=$(detect_os)
    
    if [ "$os_type" = "centos" ]; then
        # CentOS系统特殊处理
        echo "🔧 CentOS系统检测：需要安装系统依赖才能运行Playwright浏览器"
        read -p "是否现在安装系统依赖？(需要root权限) [Y/n]: " install_deps
        if [[ $install_deps =~ ^[Nn]$ ]]; then
            echo "⚠️  跳过依赖安装，可能会导致浏览器启动失败"
        else
            install_centos_deps
            if [ $? -ne 0 ]; then
                echo "⚠️  系统依赖安装失败，但会继续尝试使用Playwright内置浏览器"
            fi
        fi
    fi
    
    echo "🎭 检查并安装 Playwright Chromium 浏览器..."
    
    # 对于CentOS，先尝试不安装依赖
    if [ "$os_type" = "centos" ]; then
        echo "🔧 CentOS系统：下载并使用Playwright内置的Linux版Chromium浏览器"
        npx playwright install chromium
        if [ $? -ne 0 ]; then
            echo "❌ Playwright Chromium安装失败，请检查网络连接"
            echo "💡 你也可以尝试手动执行: npx playwright install chromium"
            exit 1
        else
            echo "✅ Playwright Chromium安装成功，将使用内置浏览器"
        fi
    else
        npx playwright install chromium
        if [ $? -ne 0 ]; then
            echo "❌ Playwright 浏览器安装失败，请检查网络或手动执行: npx playwright install chromium"
            exit 1
        fi
    fi
}

# 检查 Playwright 是否已安装 chromium
install_playwright_chrome

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
        npm run dev:gold_price
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
