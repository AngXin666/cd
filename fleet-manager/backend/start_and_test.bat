@echo off
chcp 65001 >nul
echo ============================================================
echo Starting Backend Service and Running PBT Tests
echo ============================================================
echo.

cd /d "%~dp0"

echo Checking if backend is already running...
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend is already running.
) else (
    echo Starting backend service...
    start /b cmd /c "venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
    echo Waiting for backend to start...
    timeout /t 5 /nobreak >nul
)

echo.
echo Verifying backend service...
curl -s http://localhost:8000/api/health
echo.
echo.

echo ============================================================
echo Running Property-Based Tests
echo ============================================================
echo.

venv\Scripts\python.exe -m pytest test_vehicle_return_pbt.py -v --tb=short

echo.
echo ============================================================
echo Tests completed.
echo ============================================================
