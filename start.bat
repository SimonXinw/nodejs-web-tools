@echo off

echo 🚀 启动金价爬虫工具

echo.

REM 自动安装 Node.js 函数
:install_nodejs
echo 🔄 正在自动安装 Node.js 22.14.0 ...
set NODE_INSTALLER=node-v22.14.0-x64.msi
set NODE_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi

REM 检查是否有 PowerShell 可用于下载
powershell -Command "& {Write-Host '正在下载 Node.js 安装包...'}" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 无法使用 PowerShell 下载，请手动安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 使用 PowerShell 下载 Node.js 安装包
powershell -Command "Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_INSTALLER%'"
if %errorlevel% neq 0 (
    echo ❌ Node.js 下载失败，请检查网络连接
    pause
    exit /b 1
)

echo 📦 正在安装 Node.js，请按照安装向导完成安装...
echo ⚠️ 安装完成后需要重新启动此脚本
start /wait %NODE_INSTALLER%

REM 清理安装包
del %NODE_INSTALLER% >nul 2>&1

echo ✅ Node.js 安装完成，请重新启动此脚本
pause
exit /b 0

REM 检查 Node.js 是否安装并获取版本
for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VERSION=%%v

if "%NODE_VERSION%"=="" (
    echo ❌ 未找到 Node.js，尝试自动安装...
    set /p auto_install=是否自动安装 Node.js？(Y/n): 
    if /i not "%auto_install%"=="n" (
        goto install_nodejs
    ) else (
        echo 请手动安装 Node.js 后重试
        echo 推荐版本: Node.js 22.x (Current) 或 Node.js 20.x (LTS)
        echo 下载地址: https://nodejs.org/
        pause
        exit /b 1
    )
)

REM 提取主版本号进行检查
for /f "tokens=1 delims=." %%a in ('echo %NODE_VERSION:v=%') do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% LSS 20 (
    echo ❌ 错误: 当前 Node.js 版本 %NODE_VERSION% 过低
    echo 最低要求: Node.js 20.x，推荐使用 Node.js 22.x
    echo 请升级 Node.js 后重试
    pause
    exit /b 1
)

echo ✅ Node.js 版本: %NODE_VERSION%

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

REM 检查并自动安装 Playwright Chrome
echo 🎭 检查 Playwright Chrome 浏览器...
npx playwright install --dry-run chromium >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔄 Playwright Chrome 未安装，正在自动安装...
    npx playwright install chromium
    if %errorlevel% neq 0 (
        echo ❌ Playwright Chrome 安装失败
        echo 💡 你可以稍后手动运行: npx playwright install chromium
        set /p continue=是否继续运行？(Y/n): 
        if /i "%continue%"=="n" (
            pause
            exit /b 1
        )
    ) else (
        echo ✅ Playwright Chrome 安装完成
    )
) else (
    echo ✅ Playwright Chrome 已安装
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
echo 4. 启动 API 服务器
echo 5. 测试爬虫功能
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
    echo 正在执行单次金价数据爬取...
    npm run dev:gold_price
) else if "%choice%"=="4" (
    echo 🌐 启动 API 服务器...
    npm run dev:api
) else if "%choice%"=="6" (
    echo 👋 再见!
    exit /b 0
) else (
    echo ❌ 无效选择，请输入 1-6
    pause
    exit /b 1
)

pause
