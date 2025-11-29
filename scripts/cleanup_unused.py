#!/usr/bin/env python3
"""
清理未使用的导入和变量
"""

import os
import re
import subprocess
import json

def get_unused_variables():
    """获取所有未使用的变量"""
    result = subprocess.run(
        ['npx', 'biome', 'check', 'src/pages', '--diagnostic-level=warn', '--reporter=json'],
        capture_output=True,
        text=True,
        cwd='/workspace/app-7cdqf07mbu9t'
    )
    
    unused_vars = []
    
    # 解析输出
    lines = result.stdout.split('\n')
    for line in lines:
        if 'unused' in line.lower():
            print(f"Found unused: {line}")
    
    return unused_vars

def main():
    print("🔍 检查未使用的变量和导入...")
    
    # 运行 biome 自动修复
    print("\n📝 运行 Biome 自动修复...")
    result = subprocess.run(
        ['npx', 'biome', 'check', '--write', '--unsafe', 'src/pages'],
        capture_output=True,
        text=True,
        cwd='/workspace/app-7cdqf07mbu9t'
    )
    
    print(result.stdout)
    
    print("\n✅ 清理完成！")

if __name__ == '__main__':
    main()
