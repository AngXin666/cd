"""
后端代码语法验证脚本
检查所有 Python 文件的语法是否正确
"""

import ast
import sys
import os

def check_syntax(filename):
    """
    检查 Python 文件语法
    
    Args:
        filename: 文件名
        
    Returns:
        bool: 语法是否正确
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            source = f.read()
        ast.parse(source)
        return True
    except SyntaxError as e:
        print(f"❌ {filename}: 语法错误 - {e}")
        return False
    except Exception as e:
        print(f"❌ {filename}: 读取错误 - {e}")
        return False

def main():
    """主函数"""
    files = [
        'config.py',
        'database.py',
        'models.py',
        'auth.py',
        'crud.py',
        'schemas.py',
        'main.py'
    ]
    
    print("🔍 检查后端代码语法...")
    print("-" * 40)
    
    all_ok = True
    for filename in files:
        if os.path.exists(filename):
            if check_syntax(filename):
                print(f"✅ {filename}: 语法正确")
            else:
                all_ok = False
        else:
            print(f"⚠️ {filename}: 文件不存在")
            all_ok = False
    
    print("-" * 40)
    
    if all_ok:
        print("✅ 所有文件语法检查通过！")
        return 0
    else:
        print("❌ 存在语法错误，请修复后重试")
        return 1

if __name__ == "__main__":
    sys.exit(main())
