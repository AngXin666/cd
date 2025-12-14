#!/usr/bin/env python3
"""修复删除日志后产生的语法错误"""

import re
import os
from pathlib import Path

def fix_file(file_path):
    """修复单个文件的语法错误"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 修复孤立的switch语句 - 添加函数定义
    # 模式：直接出现的switch语句，前面应该有函数定义
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        
        # 检测孤立的switch语句（缩进为2或4空格，前一行是}或空行）
        if i > 0 and re.match(r'^\s{2,4}switch\s*\(', stripped):
            prev_line = lines[i-1].strip()
            # 如果前一行是}或空行，说明这是一个孤立的switch
            if prev_line == '}' or prev_line == '' or prev_line.startswith('//'):
                # 需要添加函数定义
                # 分析switch的参数来推断函数名
                match = re.search(r'switch\s*\(\s*(\w+)\s*\)', stripped)
                if match:
                    param = match.group(1)
                    indent = re.match(r'^(\s*)', line).group(1)
                    
                    # 根据参数推断可能的函数名
                    if param == 'type':
                        # 查看switch返回的内容类型
                        switch_content = []
                        j = i + 1
                        brace_count = 0
                        while j < len(lines):
                            switch_content.append(lines[j])
                            if '{' in lines[j]:
                                brace_count += lines[j].count('{')
                            if '}' in lines[j]:
                                brace_count -= lines[j].count('}')
                                if brace_count <= 0:
                                    break
                            j += 1
                        
                        # 分析返回内容
                        switch_text = '\n'.join(switch_content)
                        if 'i-mdi-' in switch_text or 'icon' in switch_text.lower():
                            func_name = 'getNotificationIcon'
                            func_def = f'{indent}const {func_name} = (type: string) => {{'
                        elif '病假' in switch_text or '事假' in switch_text:
                            func_name = 'getLeaveTypeName'
                            func_def = f'{indent}const {func_name} = (type: string) => {{'
                        else:
                            func_name = 'getTypeName'
                            func_def = f'{indent}const {func_name} = (type: string) => {{'
                    elif param == 'status':
                        switch_content = []
                        j = i + 1
                        brace_count = 0
                        while j < len(lines):
                            switch_content.append(lines[j])
                            if '{' in lines[j]:
                                brace_count += lines[j].count('{')
                            if '}' in lines[j]:
                                brace_count -= lines[j].count('}')
                                if brace_count <= 0:
                                    break
                            j += 1
                        
                        switch_text = '\n'.join(switch_content)
                        if 'text-' in switch_text and 'color' in file_path.lower() or 'Color' in switch_text:
                            func_name = 'getStatusColor'
                            func_def = f'{indent}const {func_name} = (status: string) => {{'
                        else:
                            func_name = 'getStatusText'
                            func_def = f'{indent}const {func_name} = (status: string) => {{'
                    elif param == 'dateStr':
                        func_name = 'formatDate'
                        func_def = f'{indent}const {func_name} = (dateStr: string) => {{'
                    else:
                        func_name = f'handle{param.capitalize()}'
                        func_def = f'{indent}const {func_name} = ({param}: any) => {{'
                    
                    fixed_lines.append(func_def)
        
        fixed_lines.append(line)
        i += 1
    
    content = '\n'.join(fixed_lines)
    
    # 修复孤立的}后面跟着代码块的情况
    # 模式：} 后面直接跟着if/const等，应该是函数结束
    content = re.sub(
        r'(\n\s*\})\n(\s{2,4}if\s*\()',
        r'\1\n\2',
        content
    )
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """主函数"""
    # 获取所有TypeScript文件
    src_dir = Path('src')
    ts_files = list(src_dir.rglob('*.ts')) + list(src_dir.rglob('*.tsx'))
    
    fixed_count = 0
    for file_path in ts_files:
        try:
            if fix_file(file_path):
                print(f'✓ {file_path}')
                fixed_count += 1
        except Exception as e:
            print(f'✗ {file_path}: {e}')
    
    print(f'\n共修复 {fixed_count} 个文件')

if __name__ == '__main__':
    main()
