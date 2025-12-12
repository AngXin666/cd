#!/usr/bin/env python3
"""
--------删除 boss_id 相关代码
"""

import re

def process_behavior_tracker(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 删除导入
    content = re.sub(r"import \{getCurrentUserBossId\} from '@/db/tenant-utils'\n", "", content)
    
    # 删除 bossId 属性
    content = re.sub(r"  private bossId: string \| null = null\n", "", content)
    
    # 删除 bossId 初始化
    content = re.sub(r"    this\.bossId = \(await getCurrentUserBossId\(userId\)\) \|\| ''\n", "", content)
    content = re.sub(r"    console\.log\('\[行为追踪\] 初始化完成', \{userId, bossId: this\.bossId\}\)\n", 
                     "    console.log('[行为追踪] 初始化完成', {userId})\n", content)
    
    # 删除 bossId 检查
    content = re.sub(r"if \(!this\.userId \|\| !this\.bossId\)", "if (!this.userId)", content)
    
    # 删除 boss_id 字段
    content = re.sub(r",?\s*boss_id: this\.bossId,?\s*", "", content)
    
    # 删除 boss_id 过滤
    content = re.sub(r"\.eq\('boss_id', this\.bossId\)\s*", "", content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'✅ 处理完成: {file_path}')

def process_performance_monitor(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 删除导入
    content = re.sub(r"import \{getCurrentUserBossId\} from '@/db/tenant-utils'\n", "", content)
    
    # 删除 bossId 相关代码（类似 behaviorTracker）
    content = re.sub(r"  private bossId: string \| null = null\n", "", content)
    content = re.sub(r"    this\.bossId = \(await getCurrentUserBossId\(userId\)\) \|\| ''\n", "", content)
    content = re.sub(r"if \(!this\.userId \|\| !this\.bossId\)", "if (!this.userId)", content)
    content = re.sub(r",?\s*boss_id: this\.bossId,?\s*", "", content)
    content = re.sub(r"\.eq\('boss_id', this\.bossId\)\s*", "", content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f'✅ 处理完成: {file_path}')

if __name__ == '__main__':
    process_behavior_tracker('src/utils/behaviorTracker.ts')
    process_performance_monitor('src/utils/performanceMonitor.ts')
