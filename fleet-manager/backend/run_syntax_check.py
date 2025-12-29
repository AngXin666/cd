"""
运行语法检查的脚本
"""
import subprocess
import sys
import os

# 切换到脚本所在目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 运行语法检查
result = subprocess.run(
    [sys.executable, 'check_events_syntax.py'],
    capture_output=True,
    text=True
)

print(result.stdout)
if result.stderr:
    print(result.stderr)
    
sys.exit(result.returncode)
