@echo off
REM 认证测试运行脚本
REM 运行 test_auth.py 中的所有测试

call venv\Scripts\activate.bat
python -m pytest tests/test_auth.py -v --tb=short
