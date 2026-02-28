chcp 65001 > nul
@echo off
setlocal EnableDelayedExpansion

:: Usage:
::   aliyun-hk-deploy.bat          normal deploy (reload scraper)
::   aliyun-hk-deploy.bat --setup  first deploy  (setup pm2 startup)

:: ===== Server config (edit here) ==========================================
set SERVER_USER=test_user
set SERVER_IP=47.86.104.174
set SERVER_PWD=AWOL@test
set SERVER_PATH=/usr/projects/backend/nodejs-web-tools
set SERVER_PARENT=/usr/projects/backend
:: ==========================================================================

:: detect --setup flag
set SETUP_FLAG=
for %%a in (%*) do (
  if "%%a"=="--setup" set SETUP_FLAG=--setup
)

:: resolve root dir (3 levels up from this script)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\..\.."
set "ROOT_DIR=%CD%"
popd

set "STAGING_PARENT=%TEMP%\efunds-deploy"
set "STAGING_DIR=%STAGING_PARENT%\nodejs-web-tools"

echo.
echo ==========================================
if defined SETUP_FLAG (
  echo  efunds scraper - FIRST DEPLOY
) else (
  echo  efunds scraper - UPDATE DEPLOY
)
echo  local : %ROOT_DIR%
echo  server: %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%
echo ==========================================

:: === Step 1: pnpm install ==================================================
echo.
echo [1/5] pnpm install...
cd /d "%ROOT_DIR%"
call pnpm install --frozen-lockfile
if errorlevel 1 (
  echo [ERROR] pnpm install failed
  goto :ERROR
)

:: === Step 2: pnpm build ====================================================
echo.
echo [2/5] pnpm build...
call pnpm build
if errorlevel 1 (
  echo [ERROR] pnpm build failed
  goto :ERROR
)

:: === Step 3: staging (exclude node_modules / logs / .git) =================
echo.
echo [3/5] staging files...
if exist "%STAGING_DIR%" rmdir /s /q "%STAGING_DIR%"
mkdir "%STAGING_DIR%"

robocopy "%ROOT_DIR%" "%STAGING_DIR%" /E /XD node_modules logs .git /XF "*.log" /NP /NFL /NDL /NJH /NJS

echo     done: %STAGING_DIR%

:: === Step 4: upload via pscp ===============================================
echo.
echo [4/5] uploading to server...
echo     target: %SERVER_USER%@%SERVER_IP%:%SERVER_PATH%

:: accept host key on first connect (cached in registry for future -batch calls)
echo y | "%SCRIPT_DIR%plink.exe" -pw %SERVER_PWD% %SERVER_USER%@%SERVER_IP% "echo host key accepted" > nul 2>&1

:: ensure parent dir exists on server
"%SCRIPT_DIR%plink.exe" -batch -pw %SERVER_PWD% %SERVER_USER%@%SERVER_IP% "mkdir -p %SERVER_PARENT%"
if errorlevel 1 (
  echo [ERROR] plink mkdir failed
  rmdir /s /q "%STAGING_PARENT%"
  goto :ERROR
)

:: upload nodejs-web-tools dir -> lands at SERVER_PATH
"%SCRIPT_DIR%pscp.exe" -r -pw %SERVER_PWD% "%STAGING_DIR%" %SERVER_USER%@%SERVER_IP%:%SERVER_PARENT%/
if errorlevel 1 (
  echo [ERROR] pscp upload failed
  rmdir /s /q "%STAGING_PARENT%"
  goto :ERROR
)

rmdir /s /q "%STAGING_PARENT%"
echo     upload done, staging cleaned

:: === Step 5: remote start ==================================================
echo.
echo [5/5] starting remote service...
"%SCRIPT_DIR%plink.exe" -batch -pw %SERVER_PWD% %SERVER_USER%@%SERVER_IP% "find %SERVER_PATH% -name '*.sh' -exec sed -i 's/\r//' {} + && chmod +x %SERVER_PATH%/scripts/efunds/deploy/efunds-server-start.sh && bash %SERVER_PATH%/scripts/efunds/deploy/efunds-server-start.sh %SETUP_FLAG%"
if errorlevel 1 (
  echo [ERROR] remote start failed
  goto :ERROR
)

:: === Done ==================================================================
echo.
echo ==========================================
echo  Deploy complete!
echo  server: %SERVER_IP%:%SERVER_PATH%
if defined SETUP_FLAG (
  echo  pm2 startup configured
)
echo ==========================================
pause
exit /b 0

:ERROR
echo.
echo ==========================================
echo  Deploy FAILED - check errors above
echo ==========================================
pause
exit /b 1
