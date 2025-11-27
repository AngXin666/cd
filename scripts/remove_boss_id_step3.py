#!/usr/bin/env python3
"""
git config --global user.name  boss_id 引用
"""

import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_length = len(content)
    
    # 1. 删除 select 中的 boss_id 字段
    content = re.sub(r"\.select\('boss_id,\s*([^']+)'\)", r".select('\1')", content)
    content = re.sub(r"\.select\('([^']+),\s*boss_id'\)", r".select('\1')", content)
    content = re.sub(r"\.select\('boss_id'\)", ".select('id')", content)
    
    # 2. 删除 boss_id 比较逻辑
    # 删除整个 if 语句块：if (xxx.boss_id !== yyy.boss_id) { ... }
    pattern1 = r"if \([a-zA-Z_][a-zA-Z0-9_]*\.boss_id !== [a-zA-Z_][a-zA-Z0-9_]*\.boss_id\) \{[^}]+\}"
    content = re.sub(pattern1, '', content, flags=re.DOTALL)
    
    # 3. 删除 boss_id 赋值语句
    content = re.sub(r"[a-zA-Z_][a-zA-Z0-9_]*\.boss_id\s*=\s*[^;\n]+[;\n]", '', content)
    
    # 4. 删除包含 boss_id 的 console.log
    content = re.sub(r"console\.log\([^)]*boss_id[^)]*\)\s*", '', content, flags=re.IGNORECASE)
    content = re.sub(r"console\.error\([^)]*boss_id[^)]*\)\s*", '', content, flags=re.IGNORECASE)
    
    # 5. 删除 boss_id 变量声明
    content = re.sub(r"const\s+[a-zA-Z_][a-zA-Z0-9_]*boss_id[a-zA-Z0-9_]*\s*=\s*[^;\n]+[;\n]", '', content, flags=re.IGNORECASE)
    content = re.sub(r"let\s+[a-zA-Z_][a-zA-Z0-9_]*boss_id[a-zA-Z0-9_]*\s*=\s*[^;\n]+[;\n]", '', content, flags=re.IGNORECASE)
    
    # 6. 删除对象中的 boss_id 属性
    content = re.sub(r",?\s*boss_id:\s*[^,\n}]+", '', content)
    content = re.sub(r",?\s*[a-zA-Z_][a-zA-Z0-9_]*_boss_id:\s*[^,\n}]+", '', content)
    
    # 7. 清理多余的逗号和空行
    content = re.sub(r',\s*\)', ')', content)
    content = re.sub(r',\s*\}', '}', content)
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    new_length = len(content)
    
    print(f'原始大小: {original_length} 字符')
    print(f'处理后大小: {new_length} 字符')
    print(f'删除了: {original_length - new_length} 字符')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print('✅ 第三步处理完成')

if __name__ == '__main__':
    process_file('src/db/api.ts')
