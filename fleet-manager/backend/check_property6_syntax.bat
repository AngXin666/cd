@echo off
cd /d "%~dp0"
python -m py_compile test_events_pbt.py
if %errorlevel% equ 0 (
    echo Syntax check passed!
) else (
    echo Syntax check failed!
)
