@echo off
python -m py_compile events.py
if %errorlevel% equ 0 (
    echo events.py syntax OK
) else (
    echo events.py syntax ERROR
)
python -m py_compile main.py
if %errorlevel% equ 0 (
    echo main.py syntax OK
) else (
    echo main.py syntax ERROR
)
