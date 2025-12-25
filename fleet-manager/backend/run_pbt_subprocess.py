#!/usr/bin/env python
"""
使用子进程运行 PBT 测试，避免 PowerShell 终端问题
"""
import subprocess
import sys
import os

# 切换到 backend 目录
backend_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(backend_dir)

print("=" * 60)
print("Running Property-Based Tests for Vehicle Return API")
print("=" * 60)
print()

# 首先检查后端服务是否运行
import httpx
try:
    response = httpx.get("http://localhost:8000/api/health", timeout=5)
    if response.status_code == 200:
        print("[OK] Backend service is running.")
    else:
        print(f"[ERROR] Backend service returned status {response.status_code}")
        print("\nPlease start the backend service first:")
        print("  cd fleet-manager/backend")
        print("  venv\\Scripts\\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000")
        sys.exit(1)
except Exception as e:
    print(f"[ERROR] Cannot connect to backend service: {e}")
    print("\nStarting backend service...")
    
    # 尝试启动后端服务
    import threading
    import time
    
    def start_backend():
        subprocess.Popen(
            [os.path.join(backend_dir, "venv", "Scripts", "python.exe"), 
             "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
            cwd=backend_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    
    thread = threading.Thread(target=start_backend)
    thread.start()
    
    # 等待后端启动
    print("Waiting for backend to start...")
    for i in range(10):
        time.sleep(1)
        try:
            response = httpx.get("http://localhost:8000/api/health", timeout=2)
            if response.status_code == 200:
                print("[OK] Backend service started successfully.")
                break
        except:
            pass
    else:
        print("[ERROR] Failed to start backend service.")
        sys.exit(1)

print()
print("=" * 60)
print("Running pytest...")
print("=" * 60)
print()

# 运行 pytest
python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
result = subprocess.run(
    [python_exe, "-m", "pytest", "test_vehicle_return_pbt.py", "-v", "--tb=short"],
    cwd=backend_dir
)

print()
print("=" * 60)
if result.returncode == 0:
    print("All tests passed!")
else:
    print(f"Tests completed with exit code: {result.returncode}")
print("=" * 60)

sys.exit(result.returncode)
