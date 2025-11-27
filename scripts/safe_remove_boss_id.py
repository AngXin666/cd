#!/usr/bin/env python3
"""
/workspace/app-7cdqf07mbu9t src/db/api.ts 中的 boss_id 相关代码
git --no-pager config --global user.name 
"""

import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # 1. 删除 .eq('boss_id', xxx) 过滤条件（保守模式）
    content = re.sub(r"\.eq\('boss_id',\s*[a-zA-Z_][a-zA-Z0-9_]*\)", '', content)
    
    # 2. 删除插入时的 boss_id 字段（只删除明确的模式）
    content = re.sub(r",\s*boss_id:\s*profile\.boss_id", '', content)
    content = re.sub(r",\s*boss_id:\s*bossId", '', content)
    
    # 3. 删除 select('boss_id')
    content = re.sub(r"\.select\('boss_id'\)", ".select('id')", content)
    
    # 4. 清理多余的逗号
    content = re.sub(r',\s*\)', ')', content)
    content = re.sub(r',\s*\}', '}', content)
    
    new_length = len(content)
    
    print(f'原始大小: {original_length} 字符')
    print(f'处理后大小: {new_length} 字符')
    print(f'删除了: {original_length - new_length} 字符')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ 第一步处理完成')

if __name__ == '__main__':
    process_file('src/db/api.ts')
