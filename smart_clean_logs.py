#!/usr/bin/env python3
"""
智能清理调试日志，不会破坏代码结构
只删除完整的日志语句，保留console.error和logger.error
"""

import re
import os
from pathlib import Path
import ast

def smart_clean_logs(file_path):
    """智能清理日志，保持代码结构完整"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    result_lines = []
    i = 0
    removed_count = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # 检查是否是要删除的日志语句的开始
        should_remove = False
        log_patterns = [
            r'^\s*console\.(log|info|debug|warn)\s*\(',
            r'^\s*logger\.(info|debug|warn)\s*\(',
        ]
        
        for pattern in log_patterns:
            if re.match(pattern, stripped):
                should_remove = True
                break
        
        if should_remove:
            # 找到日志语句的结束位置（处理多行日志）
            paren_count = line.count('(') - line.count(')')
            end_line = i
            
            # 如果括号未闭合，继续往下找
            while paren_count > 0 and end_line < len(lines) - 1:
                end_line += 1
                paren_count += lines[end_line].count('(') - lines[end_line].count(')')
            
            # 跳过整个日志语句
            removed_count += 1
            i = end_line + 1
            continue
        
        # 保留这一行
        result_lines.append(line)
        i += 1
    
    if removed_count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(result_lines)
        return removed_count
    return 0

def main():
    """主函数"""
    src_dir = Path('src')
    ts_files = list(src_dir.rglob('*.ts')) + list(src_dir.rglob('*.tsx'))
    
    total_removed = 0
    fixed_files = 0
    
    for file_path in ts_files:
        try:
            count = smart_clean_logs(file_path)
            if count > 0:
                print(f'✓ {file_path}: 删除 {count} 条日志')
                total_removed += count
                fixed_files += 1
        except Exception as e:
            print(f'✗ {file_path}: {e}')
    
    print(f'\n共处理 {fixed_files} 个文件，删除 {total_removed} 条日志')

if __name__ == '__main__':
    main()
