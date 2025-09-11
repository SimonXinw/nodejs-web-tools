@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM =============================================================================
REM Gold Scraper Docker 启动脚本 (Windows 版本)
REM =============================================================================

echo ==========================================
echo   Gold Scraper Docker 启动脚本
echo ==========================================
echo.

REM 检查Docker是否安装
echo [INFO] 检查Docker安装状态...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker未安装，请先安装Docker Desktop
    echo 下载地址: https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
    pause
    exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose未安装，请更新Docker Desktop
    pause
    exit /b 1
)

echo [SUCCESS] Docker环境检查通过

REM 检查环境变量文件
echo [INFO] 检查环境变量配置...
if not exist .env (
    echo [WARNING] .env文件不存在，正在创建...
    if exist .env.example (
        copy .env.example .env >nul
        echo [INFO] 已从.env.example创建.env文件
    ) else (
        call :create_env_template
        echo [INFO] 已创建.env模板文件
    )
    echo [WARNING] 请编辑.env文件配置必要的环境变量
    echo 按任意键继续...
    pause >nul
)

REM 检查必要的环境变量
findstr /B "SUPABASE_URL=" .env | findstr /V "SUPABASE_URL=$" >nul
if errorlevel 1 (
    echo [ERROR] SUPABASE_URL未配置，请编辑.env文件
    pause
    exit /b 1
)

findstr /B "SUPABASE_ANON_KEY=" .env | findstr /V "SUPABASE_ANON_KEY=$" >nul
if errorlevel 1 (
    echo [ERROR] SUPABASE_ANON_KEY未配置，请编辑.env文件
    pause
    exit /b 1
)

echo [SUCCESS] 环境变量配置检查通过

REM 创建必要目录
echo [INFO] 创建必要目录...
if not exist logs mkdir logs
if not exist data mkdir data
echo [SUCCESS] 目录创建完成

REM 构建Docker镜像
echo [INFO] 构建Docker镜像...
docker compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Docker镜像构建失败
    pause
    exit /b 1
)
echo [SUCCESS] Docker镜像构建完成

REM 启动服务
echo [INFO] 启动Docker服务...
docker compose down >nul 2>&1
docker compose up -d
if errorlevel 1 (
    echo [ERROR] 服务启动失败
    pause
    exit /b 1
)
echo [SUCCESS] 服务启动成功

REM 等待服务就绪
echo [INFO] 等待服务就绪...
set /a attempts=0
set /a max_attempts=30

:wait_loop
set /a attempts+=1
if !attempts! gtr !max_attempts! (
    echo [ERROR] 服务启动超时
    echo 查看日志: docker compose logs -f
    pause
    exit /b 1
)

curl -f http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo|set /p="."
    timeout /t 2 /nobreak >nul
    goto wait_loop
)

echo.
echo [SUCCESS] 服务已就绪

REM 显示服务状态
echo.
echo [INFO] 服务状态:
docker compose ps

echo.
echo [INFO] 服务访问地址:
echo   - 健康检查: http://localhost:3000/health
echo   - API文档: http://localhost:3000/api-docs
echo   - 金价数据: http://localhost:3000/api/gold-price

echo.
echo [INFO] 常用命令:
echo   - 查看日志: docker compose logs -f
echo   - 停止服务: docker compose down
echo   - 重启服务: docker compose restart
echo   - 进入容器: docker compose exec gold-scraper sh

echo.
echo [SUCCESS] Gold Scraper 部署完成！
echo 按任意键退出...
pause >nul
exit /b 0

REM 创建环境变量模板函数
:create_env_template
(
echo # Supabase 数据库配置
echo SUPABASE_URL=your_supabase_project_url
echo SUPABASE_ANON_KEY=your_supabase_anon_key
echo.
echo # 应用配置
echo NODE_ENV=production
echo PORT=3000
echo ENABLE_API=true
echo API_PORT=3000
echo.
echo # 爬虫配置
echo SCRAPER_SCHEDULE="0 */6 * * *"
echo HEADLESS=true
echo TIMEOUT=30000
echo.
echo # 日志配置
echo LOG_LEVEL=info
) > .env
exit /b 0 