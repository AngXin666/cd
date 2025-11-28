#!/usr/bin/env python3
"""
/workspace/app-7cdqf07mbu9t src/db/api.ts 中的 boss_id 相关代码
"""

import re
import sys

def remove_boss_id_patterns(content):
    """删除 boss_id 相关的代码模式"""
    
    # 1. 删除获取 boss_id 的代码块
    # 匹配从 "获取当前用户的 boss_id" 注释到 boss_id 检查的整个代码块
    pattern1 = r"// \d+\. 获取当前用户的 boss_id\s+const \{data: profile\}.*?\.maybeSingle\(\)\s+if \(!profile\?\.boss_id\) \{[^}]+\}"
    content = re.sub(pattern1, '', content, flags=re.DOTALL)
    
    # 2. 删除单独的 boss_id 查询
    pattern2 = r"const \{data: profile\} = await supabase\s+\.from\('profiles'\)\s+\.select\('boss_id'\)\s+\.eq\('id', user\.id\)\s+\.maybeSingle\(\)\s+if \(!profile\?\.boss_id\) \{[^}]+return[^}]+\}"
    content = re.sub(pattern2, '', content, flags=re.DOTALL)
    
    # 3. 删除 .eq('boss_id', ...) 过滤条件
    content = re.sub(r"\.eq\('boss_id',\s*[^)]+\)\s*", '', content)
    
    # 4. 删除插入数据时的 boss_id 字段
    content = re.sub(r",?\s*boss_id:\s*profile\.boss_id", '', content)
    content = re.sub(r",?\s*boss_id:\s*bossId", '', content)
    content = re.sub(r",?\s*boss_id:\s*[^,\n}]+", '', content)
    
    # 5. 删除 boss_id 相关的注释
    content = re.sub(r"//.*boss_id.*\n", '', content, flags=re.IGNORECASE)
    content = re.sub(r"/\*.*?boss_id.*?\*/", '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # 6. 删除 getCurrentUserBossId 函数调用
    content = re.sub(r"const\s+\w*[Bb]oss[Ii]d\w*\s*=\s*await\s+getCurrentUserBossId\([^)]*\)\s*", '', content)
    
    # 7. 删除 getCurrentUserBossId 函数定义
    pattern7 = r"export\s+async\s+function\s+getCurrentUserBossId\s*\([^)]*\)[^{]*\{[^}]*\}"
    content = re.sub(pattern7, '', content, flags=re.DOTALL)
    
    # 8. 清理多余的空行
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    # 9. 清理多余的逗号
    content = re.sub(r',\s*,', ',', content)
    content = re.sub(r',\s*\)', ')', content)
    content = re.sub(r',\s*\}', '}', content)
    
    return content

def main():
    file_path = 'src/db/api.ts'
    
    print(f'正在处理文件: {file_path}')
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_length = len(content)
        print(f'原始文件大小: {original_length} 字符')
        
        # 应用所有替换模式
        content = remove_boss_id_patterns(content)
        
        new_length = len(content)
        print(f'处理后文件大小: {new_length} 字符')
        print(f'删除了 {original_length - new_length} 字符')
        
        # 写回文件
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print('✅ 文件处理完成')
        
    except Exception as e:
        print(f'❌ 处理文件失败: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
