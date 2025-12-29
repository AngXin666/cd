"""
验证权限更新事件触发器的语法正确性
"""
import sys
import py_compile

def check_syntax():
    """检查 events.py 和 main.py 的语法"""
    files = ['events.py', 'main.py']
    all_ok = True
    
    for file in files:
        try:
            py_compile.compile(file, doraise=True)
            print(f"✓ {file} 语法正确")
        except py_compile.PyCompileError as e:
            print(f"✗ {file} 语法错误: {e}")
            all_ok = False
    
    if all_ok:
        print("\n所有文件语法检查通过！")
        
        # 尝试导入 emit_permission_update
        try:
            from events import emit_permission_update
            print("✓ emit_permission_update 导入成功")
        except ImportError as e:
            print(f"✗ emit_permission_update 导入失败: {e}")
            all_ok = False
    
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(check_syntax())
