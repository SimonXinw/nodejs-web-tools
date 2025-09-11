@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM =============================================================================
REM Gold Scraper Docker 管理脚本 (Windows 版本)
REM =============================================================================

if "%1"=="" goto show_help

set command=%1

if "%command%"=="start" goto start_service
if "%command%"=="stop" goto stop_service
if "%command%"=="restart" goto restart_service
if "%command%"=="build" goto build_image
if "%command%"=="logs" goto show_logs
if "%command%"=="status" goto show_status
if "%command%"=="clean" goto clean_docker
if "%command%"=="shell" goto enter_shell
if "%command%"=="health" goto check_health
if "%command%"=="backup" goto backup_data
if "%command%"=="help" goto show_help

echo [ERROR] 未知命令: %command%
goto show_help

:start_service
echo [INFO] 启动Gold Scraper服务...
docker compose up -d
if errorlevel 1 (
    echo [ERROR] 服务启动失败
    exit /b 1
)
echo [SUCCESS] 服务启动成功
goto show_status

:stop_service
echo [INFO] 停止Gold Scraper服务...
docker compose down
echo [SUCCESS] 服务已停止
exit /b 0

:restart_service
echo [INFO] 重启Gold Scraper服务...
docker compose restart
if errorlevel 1 (
    echo [ERROR] 服务重启失败
    exit /b 1
)
echo [SUCCESS] 服务重启成功
goto show_status

:build_image
echo [INFO] 构建Docker镜像...
docker compose build --no-cache
if errorlevel 1 (
    echo [ERROR] 镜像构建失败
    exit /b 1
)
echo [SUCCESS] 镜像构建完成
exit /b 0

:show_logs
if "%2"=="" (
    docker compose logs -f
) else (
    docker compose logs -f --tail=%2
)
exit /b 0

:show_status
echo [INFO] 服务状态:
docker compose ps
echo.
echo [INFO] 容器资源使用:
docker stats --no-stream gold-scraper 2>nul
echo.
echo [INFO] 服务访问地址:
echo   - 健康检查: http://localhost:3000/health
echo   - API文档: http://localhost:3000/api-docs
echo   - 金价数据: http://localhost:3000/api/gold-price
exit /b 0

:clean_docker
echo [WARNING] 这将清理所有未使用的Docker资源
set /p confirm="确认继续? (y/N): "
if /i not "%confirm%"=="y" (
    echo 操作已取消
    exit /b 0
)

echo [INFO] 清理Docker资源...
docker system prune -f
docker image prune -f
docker volume prune -f
echo [SUCCESS] 清理完成
exit /b 0

:enter_shell
echo [INFO] 进入容器Shell...
docker compose exec gold-scraper sh
exit /b 0

:check_health
echo [INFO] 检查服务健康状态...
curl -f http://localhost:3000/health >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 服务健康检查失败
    exit /b 1
) else (
    echo [SUCCESS] 服务运行正常
    curl -s http://localhost:3000/health
)
exit /b 0

:backup_data
echo [INFO] 备份数据...
set backup_name=backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set backup_name=%backup_name: =0%
mkdir backups 2>nul
tar -czf backups\%backup_name%.tar.gz logs data .env 2>nul
if errorlevel 1 (
    echo [WARNING] tar命令不可用，使用PowerShell压缩...
    powershell -command "Compress-Archive -Path logs,data,.env -DestinationPath backups\%backup_name%.zip -Force"
    if errorlevel 1 (
        echo [ERROR] 备份失败
        exit /b 1
    )
    echo [SUCCESS] 备份完成: backups\%backup_name%.zip
) else (
    echo [SUCCESS] 备份完成: backups\%backup_name%.tar.gz
)
exit /b 0

:show_help
echo.
echo Gold Scraper Docker 管理脚本
echo.
echo 用法: %0 ^<command^> [options]
echo.
echo 可用命令:
echo   start     - 启动服务
echo   stop      - 停止服务
echo   restart   - 重启服务
echo   build     - 构建镜像
echo   logs      - 查看日志 (可选参数: 行数)
echo   status    - 显示服务状态
echo   clean     - 清理Docker资源
echo   shell     - 进入容器Shell
echo   health    - 检查服务健康状态
echo   backup    - 备份数据
echo   help      - 显示此帮助信息
echo.
echo 示例:
echo   %0 start          - 启动服务
echo   %0 logs 100       - 查看最近100行日志
echo   %0 status         - 查看服务状态
echo.
exit /b 0 