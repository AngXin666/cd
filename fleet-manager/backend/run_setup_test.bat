@echo off
REM 运行测试配置验证
REM 验证测试基础设施是否正确配置

echo ========================================
echo 运行测试配置验证
echo ========================================

REM 激活虚拟环境并运行测试
call venv\Scripts\activate.bat
pytest tests\test_setup.py -v --tb=short

echo ========================================
echo 测试完成
echo ========================================
pause
