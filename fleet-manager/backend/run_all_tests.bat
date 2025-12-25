@echo off
echo ============================================================
echo Running Backend API Tests
echo ============================================================

cd /d "%~dp0"
call venv\Scripts\activate.bat

echo.
echo Running pytest...
python -m pytest . -v --tb=short

echo.
echo ============================================================
echo Tests completed!
echo ============================================================
pause
