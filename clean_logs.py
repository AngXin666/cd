#!/usr/bin/env python3
"""清理TypeScript/TSX文件中的调试日志"""
import re
import os
from pathlib import Path

def clean_log_statement(content):
    """删除单行和多行的日志语句"""
    
    # 模式1: 单行日志 - console.log/info/debug/warn(...) 或 logger.info/debug/warn(...)
    patterns = [
        r'^\s*console\.(log|info|debug|warn)\([^)]*\)\s*$',
        r'^\s*logger\.(info|debug|warn)\([^)]*\)\s*$',
    ]
    
    lines = content.split('\n')
    result = []
    skip_until_closing = False
    paren_count = 0
    
    for i, line in enumerate(lines):
        # 检查是否需要跳过（多行日志语句）
        if skip_until_closing:
            paren_count += line.count('(') - line.count(')')
            if paren_count <= 0:
                skip_until_closing = False
            continue
        
        # 检查是否匹配单行日志
        is_log_line = False
        for pattern in patterns:
            if re.match(pattern, line):
                is_log_line = True
                break
        
        if is_log_line:
            continue
        
        # 检查是否是多行日志的开始
        if re.search(r'(console\.(log|info|debug|warn)|logger\.(info|debug|warn))\s*\(', line):
            # 计算括号数量
            open_count = line.count('(')
            close_count = line.count(')')
            
            # 如果括号不匹配，说明是多行
            if open_count > close_count:
                paren_count = open_count - close_count
                skip_until_closing = True
                continue
        
        result.append(line)
    
    return '\n'.join(result)

def process_file(filepath):
    """处理单个文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        cleaned = clean_log_statement(content)
        
        if cleaned != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(cleaned)
            return True
        return False
    except Exception as e:
        print(f"处理文件 {filepath} 时出错: {e}")
        return False

def main():
    src_dir = Path('src')
    count = 0
    
    for filepath in src_dir.rglob('*.ts'):
        if process_file(filepath):
            count += 1
    
    for filepath in src_dir.rglob('*.tsx'):
        if process_file(filepath):
            count += 1
    
    print(f"✓ 共处理 {count} 个文件")

if __name__ == '__main__':
    main()
