#!/usr/bin/env python
"""
运行所有后端测试的脚本
"""
import subprocess
import sys
import os

# 切换到 backend 目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 运行 pytest
result = subprocess.run(
    [sys.executable, "-m", "pytest", ".", "-v", "--tb=short"],
    capture_output=True,
    text=True
)

print(result.stdout)
print(result.stderr)
sys.exit(result.returncode)
