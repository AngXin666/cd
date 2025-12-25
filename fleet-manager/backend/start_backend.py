#!/usr/bin/env python
"""
启动后端服务
"""
import subprocess
import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

print("Starting backend service...")
print(f"Working directory: {backend_dir}")

python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
print(f"Python executable: {python_exe}")

# 直接运行 uvicorn
os.system(f'"{python_exe}" -m uvicorn main:app --host 0.0.0.0 --port 8000')
