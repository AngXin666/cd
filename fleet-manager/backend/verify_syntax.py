"""
语法验证脚本
验证 test_events_pbt.py 的语法正确性
"""
import py_compile
import sys

def verify_syntax():
    """验证测试文件语法"""
    try:
        py_compile.compile('test_events_pbt.py', doraise=True)
        print("✅ test_events_pbt.py 语法检查通过!")
        return True
    except py_compile.PyCompileError as e:
        print(f"❌ 语法错误: {e}")
        return False

if __name__ == "__main__":
    success = verify_syntax()
    sys.exit(0 if success else 1)
