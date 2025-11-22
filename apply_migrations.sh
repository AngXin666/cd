#!/bin/bash

# 应用所有 migration 文件的脚本

MIGRATIONS_DIR="supabase/migrations"

echo "开始应用 migration 文件..."

for file in $(ls $MIGRATIONS_DIR/*.sql | sort); do
  filename=$(basename "$file")
  echo "正在应用: $filename"
  
  # 这里只是显示文件名，实际应用需要通过 supabase_apply_migration 工具
  echo "  - $filename"
done

echo "所有 migration 文件列表完成"
