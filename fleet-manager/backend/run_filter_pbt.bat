@echo off
echo Running Vehicle List Filter Property-Based Tests...
call venv\Scripts\activate.bat
python -m pytest test_vehicle_list_filter_pbt.py -v --tb=short
echo.
echo Test completed.
pause
