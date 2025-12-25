#!/usr/bin/env python
"""
运行车辆还车 API 属性测试的脚本
"""
import subprocess
import sys
import os

# 切换到 backend 目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Running Property-Based Tests for Vehicle Return API")
print("=" * 60)
print()

# 首先检查后端服务是否运行
import httpx
try:
    response = httpx.get("http://localhost:8000/api/health", timeout=5)
    if response.status_code == 200:
        print("Backend service is running.")
    else:
        print(f"Backend service returned status {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"Cannot connect to backend service: {e}")
    print("\nPlease start the backend service first:")
    print("  cd fleet-manager/backend")
    print("  venv\\Scripts\\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000")
    sys.exit(1)

print()

# 运行 pytest
result = subprocess.run(
    [sys.executable, "-m", "pytest", "test_vehicle_return_pbt.py", "-v", "--tb=short"],
    capture_output=False
)

sys.exit(result.returncode)
