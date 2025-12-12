#!/usr/bin/env python3
"""
应用大型 SQL 迁移文件的脚本
"""

import os
import sys

# 读取 SQL 文件
sql_file_path = os.path.join(os.path.dirname(__file__), '../supabase/migrations/20009_restore_create_tenant_schema_final.sql')

with open(sql_file_path, 'r', encoding='utf-8') as f:
    sql_content = f.read()

print(f"✅ 读取 SQL 文件成功")
print(f"📝 文件大小: {len(sql_content)} 字符")
print(f"📝 文件行数: {sql_content.count(chr(10))} 行")

# 输出 SQL 内容（用于调试）
print("\n" + "="*80)
print("SQL 内容预览:")
print("="*80)
print(sql_content[:500])
print("...")
print(sql_content[-500:])
print("="*80)

print("\n✅ SQL 文件读取完成")
print("💡 请手动通过 supabase_apply_migration 工具应用此迁移")
