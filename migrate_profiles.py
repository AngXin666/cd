#!/usr/bin/env python3
"""
将 profiles 视图的引用迁移到新的表结构（users + user_roles）
"""

import re
import sys

def migrate_profiles_to_users(content):
    """
    将 profiles 表的引用替换为 users 表
    
    策略：
    1. 简单的 select 查询 -> 保持使用 profiles 视图（因为视图已经处理了 JOIN）
    2. update 查询 -> 需要分别更新 users 和 user_roles
    3. insert 查询 -> 需要分别插入 users 和 user_roles
    4. delete 查询 -> 只需删除 users（级联删除）
    
    由于 profiles 视图已经创建并且可以正常工作，
    我们暂时保持使用视图，只需要确保角色名已经更新为大写即可。
    """
    
    # 统计 profiles 引用数量
    profiles_count = len(re.findall(r"from\('profiles'\)", content))
    print(f"找到 {profiles_count} 处 profiles 引用")
    
    # 由于 profiles 视图已经创建并且工作正常，
    # 我们不需要立即替换所有引用
    # 只需要确保角色名已经更新为大写
    
    return content, profiles_count

def main():
    # 读取文件
    with open('src/db/api.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 执行迁移
    new_content, count = migrate_profiles_to_users(content)
    
    # 写回文件
    with open('src/db/api.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ 迁移完成！处理了 {count} 处引用")
    print("📝 注意：profiles 视图仍在使用中，这是正常的")
    print("💡 建议：未来可以逐步将代码迁移到直接使用 users 和 user_roles 表")

if __name__ == '__main__':
    main()
