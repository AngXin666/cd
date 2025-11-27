#!/usr/bin/env python3
"""
git config --global user.name  boss_id 引用
"""

import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # 1. 删除包含 boss_id 的变量赋值
    content = re.sub(r"mainAccountId\s*=\s*user\.boss_id[^;\n]*", "mainAccountId = user.id", content)
    content = re.sub(r"mainAccountId\s*=\s*[^;\n]*\.boss_id[^;\n]*", "mainAccountId = user.id", content)
    content = re.sub(r"mainAccountId\s*=\s*bossAccount\?\.boss_id[^;\n]*", "mainAccountId = user.id", content)
    
    # 2. 删除 boss_id 查询
    content = re.sub(r"const \{data: bossAccount\}[^}]+\.eq\('id', user\.boss_id\)[^}]+", "", content)
    
    # 3. 删除 else if 中的 boss_id 条件
    content = re.sub(r"else if \(currentProfile\.boss_id\) \{[^}]+\}", "", content, flags=re.DOTALL)
    content = re.sub(r"else if \(currentUserProfile\.boss_id\) \{[^}]+\}", "", content, flags=re.DOTALL)
    
    # 4. 删除 leases 表中的 boss_id 外键引用
    content = re.sub(r"tenant:profiles!leases_boss_id_fkey\([^)]+\)", "tenant:profiles(id, name, phone, company_name)", content)
    
    # 5. 清理多余的空行
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    new_length = len(content)
    
    print(f'原始大小: {original_length} 字符')
    print(f'处理后大小: {new_length} 字符')
    print(f'删除了: {original_length - new_length} 字符')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ 最后一步处理完成')

if __name__ == '__main__':
    process_file('src/db/api.ts')
