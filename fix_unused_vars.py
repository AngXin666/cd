#!/usr/bin/env python3
"""修复删除日志后产生的未使用变量"""
import re
from pathlib import Path

def fix_unused_callback_params(content):
    """修复回调函数中未使用的参数"""
    # .subscribe((status) => {}) => .subscribe()
    content = re.sub(r'\.subscribe\(\([^)]*\)\s*=>\s*\{\s*\}\)', '.subscribe()', content)
    
    # .on(..., (payload) => {}) => .on(..., () => {})  
    content = re.sub(r'\(payload\)\s*=>\s*\{\s*\}', '() => {}', content)
    
    return content

def fix_unused_destructuring(content):
    """修复解构中未使用的变量"""
    lines = content.split('\n')
    result = []
    
    for line in lines:
        # const {data} = ... => const {} = ... 或者整行删除
        if re.search(r'const\s*\{\s*(data|status|payload)\s*\}\s*=', line):
            if 'await' in line:
                # 改为直接调用
                line = re.sub(r'const\s*\{\s*(data|status|payload)\s*\}\s*=\s*', '', line)
            else:
                continue  # 删除整行
        
        # const _formatTime = ... => 删除整个函数定义
        if re.match(r'\s*const\s+_\w+\s*=', line):
            # 跳过函数定义直到下一个空行或新函数
            if '=>' in line or 'function' in line:
                continue
        
        result.append(line)
    
    return '\n'.join(result)

def process_file(filepath):
    """处理单个文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        content = fix_unused_callback_params(content)
        content = fix_unused_destructuring(content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
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
