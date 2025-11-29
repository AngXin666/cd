#!/usr/bin/env python3
"""
将代码从使用 profiles 视图迁移到直接使用 users 和 user_roles 表
"""

import os
import re
from pathlib import Path

def find_profiles_usage():
    """查找所有使用 profiles 的地方"""
    api_file = Path('/workspace/app-7cdqf07mbu9t/src/db/api.ts')
    
    with open(api_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找所有 from('profiles') 的使用
    pattern = r"\.from\(['\"]profiles['\"]\)"
    matches = list(re.finditer(pattern, content))
    
    print(f"🔍 在 api.ts 中找到 {len(matches)} 处使用 profiles 视图的地方\n")
    
    # 显示每个匹配的上下文
    for i, match in enumerate(matches, 1):
        start = max(0, match.start() - 100)
        end = min(len(content), match.end() + 100)
        context = content[start:end]
        
        # 找到函数名
        func_match = re.search(r'export\s+(?:async\s+)?function\s+(\w+)', content[:match.start()][::-1])
        func_name = func_match.group(1)[::-1] if func_match else "未知函数"
        
        print(f"📍 匹配 {i}: 函数 {func_name}")
        print(f"   位置: {match.start()}")
        print(f"   上下文: ...{context}...")
        print()
    
    return len(matches)

def main():
    print("=" * 80)
    print("从 profiles 视图迁移到 users/user_roles 表")
    print("=" * 80)
    print()
    
    # 查找使用情况
    count = find_profiles_usage()
    
    print("=" * 80)
    print(f"📊 总结: 找到 {count} 处需要迁移的地方")
    print("=" * 80)

if __name__ == '__main__':
    main()
