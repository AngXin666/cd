@echo off
REM ============================================
REM 测试运行脚本 (Windows)
REM 用于运行后端测试套件并生成报告
REM ============================================

setlocal enabledelayedexpansion

REM 切换到脚本所在目录
cd /d "%~dp0"

echo ========================================
echo   Fleet Manager 后端测试套件
echo ========================================
echo.

REM 检查 Python 环境
echo 检查 Python 环境...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到 python
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo Python 版本: %PYTHON_VERSION%

REM 检查虚拟环境
if exist "venv\Scripts\activate.bat" (
    echo 激活虚拟环境...
    call venv\Scripts\activate.bat
)

REM 检查 pytest
echo 检查 pytest...
python -c "import pytest" >nul 2>&1
if %errorlevel% neq 0 (
    echo 未安装 pytest，正在安装...
    python -m pip install pytest pytest-cov pytest-html --quiet
)

REM 设置测试环境变量
set DATABASE_URL=sqlite:///:memory:
set JWT_SECRET_KEY=test-secret-key
set DEBUG=true

REM 默认参数
set COVERAGE=
set HTML_REPORT=
set VERBOSE=-v
set TEST_PATH=tests/

REM 解析命令行参数
:parse_args
if "%~1"=="" goto run_tests
if "%~1"=="--coverage" (
    set COVERAGE=--cov=. --cov-report=html --cov-report=term-missing
    shift
    goto parse_args
)
if "%~1"=="-c" (
    set COVERAGE=--cov=. --cov-report=html --cov-report=term-missing
    shift
    goto parse_args
)
if "%~1"=="--html" (
    set HTML_REPORT=--html=test_report.html --self-contained-html
    shift
    goto parse_args
)
if "%~1"=="-h" (
    set HTML_REPORT=--html=test_report.html --self-contained-html
    shift
    goto parse_args
)
if "%~1"=="--quiet" (
    set VERBOSE=
    shift
    goto parse_args
)
if "%~1"=="-q" (
    set VERBOSE=
    shift
    goto parse_args
)
if "%~1"=="--file" (
    set TEST_PATH=%~2
    shift
    shift
    goto parse_args
)
if "%~1"=="-f" (
    set TEST_PATH=%~2
    shift
    shift
    goto parse_args
)
set TEST_PATH=%~1
shift
goto parse_args

:run_tests
echo.
echo 运行测试...
echo 测试路径: %TEST_PATH%
echo.

REM 运行测试
python -m pytest %TEST_PATH% %VERBOSE% %COVERAGE% %HTML_REPORT% --tb=short

REM 检查测试结果
set TEST_RESULT=%errorlevel%

echo.
if %TEST_RESULT% equ 0 (
    echo ========================================
    echo   ✅ 所有测试通过！
    echo ========================================
) else (
    echo ========================================
    echo   ❌ 部分测试失败
    echo ========================================
)

REM 显示报告位置
if not "%COVERAGE%"=="" (
    echo.
    echo 覆盖率报告: htmlcov\index.html
)

if not "%HTML_REPORT%"=="" (
    echo 测试报告: test_report.html
)

exit /b %TEST_RESULT%
