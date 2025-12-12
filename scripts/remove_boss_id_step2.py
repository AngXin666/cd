#!/usr/bin/env python3
"""
git config --global user.name  boss_id 的代码块
"""

import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # 1. 删除获取 boss_id 的代码块（包括注释、查询和检查）
    # 模式：// 2. 获取当前用户的 boss_id ... if (!profile?.boss_id) { ... }
    pattern1 = r"// \d+\. 获取当前用户的 boss_id\s+const \{data: profile\} = await supabase\.from\('profiles'\)\.select\('id'\)\.eq\('id', user\.id\)\.maybeSingle\(\)\s+if \(!profile\?\.boss_id\) \{[^}]+\}"
    content = re.sub(pattern1, '', content, flags=re.DOTALL)
    
    # 2. 删除类似的模式但没有注释的
    pattern2 = r"const \{data: profile\} = await supabase\.from\('profiles'\)\.select\('id'\)\.eq\('id', user\.id\)\.maybeSingle\(\)\s+if \(!profile\?\.boss_id\) \{[^}]+\}"
    content = re.sub(pattern2, '', content, flags=re.DOTALL)
    
    # 3. 删除 boss_id 相关的注释
    content = re.sub(r"// .*?boss_id.*?\n", '', content, flags=re.IGNORECASE)
    
    # 4. 删除多余的空行
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    new_length = len(content)
    
    print(f'原始大小: {original_length} 字符')
    print(f'处理后大小: {new_length} 字符')
    print(f'删除了: {original_length - new_length} 字符')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ 第二步处理完成')

if __name__ == '__main__':
    process_file('src/db/api.ts')
