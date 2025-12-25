@echo off
echo Running Property-Based Tests for Vehicle Return API...
echo.

cd /d "%~dp0"
call venv\Scripts\activate.bat
python -m pytest test_vehicle_return_pbt.py -v --tb=short

echo.
echo Tests completed.
pause
