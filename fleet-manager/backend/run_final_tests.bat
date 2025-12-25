@echo off
echo ========================================
echo Running Backend API Tests
echo ========================================

call venv\Scripts\activate.bat

echo.
echo [1/4] Running Health API Tests...
python -m pytest test_health_api.py -v --tb=short
if errorlevel 1 (
    echo Health API Tests FAILED
) else (
    echo Health API Tests PASSED
)

echo.
echo [2/4] Running Upload API Tests...
python -m pytest test_upload_api.py -v --tb=short
if errorlevel 1 (
    echo Upload API Tests FAILED
) else (
    echo Upload API Tests PASSED
)

echo.
echo [3/4] Running Vehicle API Tests...
python -m pytest test_vehicle_api.py -v --tb=short
if errorlevel 1 (
    echo Vehicle API Tests FAILED
) else (
    echo Vehicle API Tests PASSED
)

echo.
echo [4/4] Running Vehicle History API Tests...
python -m pytest test_vehicle_history_api.py -v --tb=short
if errorlevel 1 (
    echo Vehicle History API Tests FAILED
) else (
    echo Vehicle History API Tests PASSED
)

echo.
echo ========================================
echo All Backend Tests Completed
echo ========================================
