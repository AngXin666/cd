#!/usr/bin/env python3
"""
检查未使用的 API 模块导入
"""

import os
import re
from pathlib import Path

def check_file(file_path):
    """检查单个文件中未使用的导入"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找所有 API 导入
    import_pattern = r'import \* as (\w+API) from [\'"]@/db/api/\w+[\'"]'
    imports = re.findall(import_pattern, content)
    
    unused_imports = []
    
    for api_name in imports:
        # 检查是否在代码中使用了这个 API
        # 排除导入语句本身
        usage_pattern = rf'\b{api_name}\.\w+'
        
        # 移除导入语句后的内容
        content_without_imports = re.sub(r'import.*?from.*?\n', '', content)
        
        if not re.search(usage_pattern, content_without_imports):
            unused_imports.append(api_name)
    
    return unused_imports

def main():
    print("🔍 检查未使用的 API 模块导入...\n")
    
    pages_dir = Path('/workspace/app-7cdqf07mbu9t/src/pages')
    
    total_files = 0
    files_with_unused = 0
    total_unused = 0
    
    for tsx_file in pages_dir.rglob('*.tsx'):
        total_files += 1
        unused = check_file(tsx_file)
        
        if unused:
            files_with_unused += 1
            total_unused += len(unused)
            rel_path = tsx_file.relative_to(pages_dir)
            print(f"📄 {rel_path}")
            for api in unused:
                print(f"   ❌ 未使用: {api}")
            print()
    
    print("=" * 80)
    print(f"📊 统计结果:")
    print(f"   • 总文件数: {total_files}")
    print(f"   • 有未使用导入的文件: {files_with_unused}")
    print(f"   • 未使用的导入总数: {total_unused}")
    
    if total_unused == 0:
        print("\n✅ 太好了！没有发现未使用的 API 模块导入！")
    else:
        print(f"\n⚠️  发现 {total_unused} 个未使用的 API 模块导入")

if __name__ == '__main__':
    main()
