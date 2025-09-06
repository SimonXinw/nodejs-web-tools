@echo off
echo 🚀 启动金价爬虫工具
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

REM 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

REM 检查是否存在 .env 文件
if not exist ".env" (
    echo ⚙️ 未找到 .env 文件，启动配置向导...
    npm run setup
    if %errorlevel% neq 0 (
        echo ❌ 配置失败
        pause
        exit /b 1
    )
)

REM 编译 TypeScript
echo 🔨 编译项目...
npm run build
if %errorlevel% neq 0 (
    echo ❌ 编译失败
    pause
    exit /b 1
)

echo.
echo 选择运行模式:
echo 1. 开发模式 (实时日志)
echo 2. 生产模式 (后台运行)
echo 3. 手动执行一次
echo 4. 测试爬虫功能
echo 5. 查看监控报告
echo 6. 退出
echo.

set /p choice=请选择 (1-6): 

if "%choice%"=="1" (
    echo 🔧 启动开发模式...
    npm run dev
) else if "%choice%"=="2" (
    echo 🚀 启动生产模式...
    npm start
) else if "%choice%"=="3" (
    echo 🎯 手动执行爬取...
    npm run dev -- --manual
) else if "%choice%"=="4" (
    echo 🧪 测试爬虫功能...
    npm run test:scraper
) else if "%choice%"=="5" (
    echo 📊 生成监控报告...
    npm run monitor
) else if "%choice%"=="6" (
    echo 👋 再见!
    exit /b 0
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)

pause
