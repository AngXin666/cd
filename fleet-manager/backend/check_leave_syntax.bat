@echo off
python -m py_compile events.py
if %errorlevel% neq 0 (
    echo events.py 语法检查失败
    exit /b 1
)
echo events.py 语法检查通过

python -m py_compile main.py
if %errorlevel% neq 0 (
    echo main.py 语法检查失败
    exit /b 1
)
echo main.py 语法检查通过

echo 所有文件语法检查通过
