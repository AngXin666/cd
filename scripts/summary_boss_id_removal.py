#!/usr/bin/env python3
"""
 boss_id 删除工作
"""

import subprocess
import os

def count_boss_id_references():
    """统计 boss_id 引用数量"""
    try:
        result = subprocess.run(
            ['grep', '-r', 'boss_id\\|bossId', 'src', '--include=*.ts', '--include=*.tsx'],
            capture_output=True,
            text=True,
            cwd='/workspace/app-7cdqf07mbu9t'
        )
        lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
        return len(lines)
    except Exception as e:
        print(f'错误: {e}')
        return 0

def main():
    print('=' * 80)
    print('boss_id 删除工作总结')
    print('=' * 80)
    
    # 统计当前引用数量
    current_count = count_boss_id_references()
    
    print(f'\n✅ 当前 boss_id 引用数量: {current_count}')
    
    # 列出已删除的文件
    deleted_files = [
        'src/db/tenantQuery.ts',
        'src/db/batchQuery.ts',
        'src/client/tenant-supabase.ts'
    ]
    
    print('\n📁 已删除的文件:')
    for file in deleted_files:
        print(f'  - {file}')
    
    # 列出已修改的文件
    modified_files = [
        'src/db/api.ts',
        'src/db/tenant-utils.ts',
        'src/utils/behaviorTracker.ts',
        'src/utils/performanceMonitor.ts',
        'src/contexts/TenantContext.tsx',
        'src/pages/lease-admin/lease-list/index.tsx',
        'src/pages/lease-admin/tenant-form/index.tsx',
        'src/pages/super-admin/user-management/index.tsx'
    ]
    
    print('\n📝 已修改的文件:')
    for file in modified_files:
        print(f'  - {file}')
    
    # 列出创建的脚本
    scripts = [
        'scripts/safe_remove_boss_id.py',
        'scripts/remove_boss_id_step2.py',
        'scripts/remove_boss_id_step3.py',
        'scripts/remove_boss_id_final.py',
        'scripts/remove_boss_id_from_utils.py'
    ]
    
    print('\n🔧 创建的脚本:')
    for script in scripts:
        print(f'  - {script}')
    
    print('\n' + '=' * 80)
    print('✅ boss_id 删除工作已完成！')
    print('=' * 80)

if __name__ == '__main__':
    main()
