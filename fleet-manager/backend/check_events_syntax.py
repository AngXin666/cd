"""
验证 events.py 语法的脚本
"""
import sys
import py_compile

try:
    py_compile.compile('events.py', doraise=True)
    print("✅ events.py 语法检查通过")
    sys.exit(0)
except py_compile.PyCompileError as e:
    print(f"❌ events.py 语法错误: {e}")
    sys.exit(1)
