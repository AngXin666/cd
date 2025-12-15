@echo off
setlocal enabledelayedexpansion

REM ========================================
REM H5 Build and Hot Update Deploy Script
REM Usage: scripts\deploy.bat [release notes]
REM Example: scripts\deploy.bat "fix login issue"
REM ========================================

REM Get release notes parameter
set "RELEASE_NOTES=%~1"
if "%RELEASE_NOTES%"=="" set "RELEASE_NOTES=Feature optimization"

echo ========================================
echo H5 Build and Deploy
echo ========================================
echo.
echo Release Notes: %RELEASE_NOTES%
echo.

echo [1/2] Building H5...
echo ----------------------------------------
call pnpm taro build --type h5
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo.
echo [DONE] H5 build completed!
echo.

echo [2/2] Deploying to Supabase Storage...
echo ----------------------------------------
node scripts/quick-deploy-h5.js "%RELEASE_NOTES%"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deploy failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deploy completed!
echo ========================================
echo.
pause
