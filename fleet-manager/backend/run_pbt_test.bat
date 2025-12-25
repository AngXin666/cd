@echo off
cd /d "%~dp0"
echo Starting backend server...
start /B python -m uvicorn main:app --host 0.0.0.0 --port 8000
echo Waiting for server to start...
timeout /t 5 /nobreak > nul
echo Running property-based tests...
python -m pytest test_vehicle_return_pbt.py -v --tb=short
echo Tests completed.
pause
