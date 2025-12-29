@echo off
python -m py_compile events.py
if %errorlevel% equ 0 (
    echo events.py SYNTAX_OK
) else (
    echo events.py SYNTAX_ERROR
    exit /b 1
)

python -m py_compile main.py
if %errorlevel% equ 0 (
    echo main.py SYNTAX_OK
) else (
    echo main.py SYNTAX_ERROR
    exit /b 1
)

echo ALL_SYNTAX_OK
